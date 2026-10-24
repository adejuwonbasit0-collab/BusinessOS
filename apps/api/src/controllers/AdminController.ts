import { Request, Response } from 'express';
import { db } from '../lib/database';
import { AppError, NotFoundError } from '../lib/errors';
import { AuditService } from '../services/index';
import jwt from 'jsonwebtoken';

export class AdminController {
  // ── Platform stats ─────────────────────────────────────────────────────────
  platformStats = async (req: Request, res: Response) => {
    const [
      totalTenants, activeTenants, trialTenants, suspendedTenants,
      totalUsers, mrrData, newTenantsThisMonth, churnThisMonth,
    ] = await Promise.all([
      db('tenants').whereNull('deleted_at').count('id as count').first(),
      db('tenants').where({ status: 'active' }).whereNull('deleted_at').count('id as count').first(),
      db('tenants').where({ status: 'trial' }).whereNull('deleted_at').count('id as count').first(),
      db('tenants').where({ status: 'suspended' }).whereNull('deleted_at').count('id as count').first(),
      db('users').whereNull('deleted_at').count('id as count').first(),
      db('tenants').join('plans', 'tenants.plan_id', 'plans.id')
        .where({ 'tenants.status': 'active' }).whereNull('tenants.deleted_at')
        .sum('plans.price_monthly as total').first(),
      db('tenants').whereNull('deleted_at').where('created_at', '>=', new Date(new Date().getFullYear(), new Date().getMonth(), 1)).count('id as count').first(),
      db('tenants').where({ status: 'cancelled' }).where('updated_at', '>=', new Date(new Date().getFullYear(), new Date().getMonth(), 1)).count('id as count').first(),
    ]);

    res.json({
      success: true,
      data: {
        tenants: {
          total: parseInt((totalTenants as any)?.count || '0'),
          active: parseInt((activeTenants as any)?.count || '0'),
          trial: parseInt((trialTenants as any)?.count || '0'),
          suspended: parseInt((suspendedTenants as any)?.count || '0'),
          newThisMonth: parseInt((newTenantsThisMonth as any)?.count || '0'),
          churnThisMonth: parseInt((churnThisMonth as any)?.count || '0'),
        },
        users: { total: parseInt((totalUsers as any)?.count || '0') },
        // `plans.price_monthly` is stored in cents, so the sum is converted
        // back to dollars here — the admin console renders MRR as "$<value>".
        mrr: parseFloat((mrrData as any)?.total || '0') / 100,
      },
    });
  };

  // ── Tenant management ──────────────────────────────────────────────────────
  listTenants = async (req: Request, res: Response) => {
    const { page = 1, limit = 25, search, status, plan } = req.query as any;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = db('tenants').join('plans', 'tenants.plan_id', 'plans.id').whereNull('tenants.deleted_at');
    if (status) query = query.where('tenants.status', status);
    if (plan) query = query.where('plans.slug', plan);
    if (search) query = query.where((q) => q.whereILike('tenants.name', `%${search}%`).orWhereILike('tenants.subdomain', `%${search}%`));

    const [{ count }] = await query.clone().count('tenants.id as count');
    const tenants = await query.clone()
      .select('tenants.*', 'plans.name as plan_name', 'plans.slug as plan_slug', 'plans.price_monthly')
      .orderBy('tenants.created_at', 'desc').limit(parseInt(limit)).offset(offset);

    res.json({
      success: true,
      data: {
        tenants,
        pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(count as string), totalPages: Math.ceil(parseInt(count as string) / parseInt(limit)) },
      },
    });
  };

  getTenant = async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenant = await db('tenants').join('plans', 'tenants.plan_id', 'plans.id')
      .where({ 'tenants.id': id }).whereNull('tenants.deleted_at')
      .select('tenants.*', 'plans.name as plan_name', 'plans.slug as plan_slug', 'plans.price_monthly')
      .first();
    if (!tenant) throw new NotFoundError('Tenant');

    const [userCount, storageGb] = await Promise.all([
      db('users').where({ tenant_id: id }).whereNull('deleted_at').count('id as count').first(),
      db('media_files').where({ tenant_id: id }).whereNull('deleted_at').sum('size_bytes as total').first(),
    ]);

    res.json({ success: true, data: { tenant: { ...tenant, userCount: parseInt((userCount as any)?.count || '0'), storageBytes: parseInt((storageGb as any)?.total || '0') } } });
  };

  suspendTenant = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;
    const tenant = await db('tenants').where({ id }).whereNull('deleted_at').first();
    if (!tenant) throw new NotFoundError('Tenant');

    await db('tenants').where({ id }).update({ status: 'suspended', updated_at: new Date() });
    AuditService.log({ tenantId: id, userId: req.user?.id, action: 'admin.tenant.suspend', description: reason || 'Suspended by admin', ip: req.ip });

    res.json({ success: true, message: 'Tenant suspended' });
  };

  unsuspendTenant = async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenant = await db('tenants').where({ id }).whereNull('deleted_at').first();
    if (!tenant) throw new NotFoundError('Tenant');

    await db('tenants').where({ id }).update({ status: 'active', updated_at: new Date() });
    AuditService.log({ tenantId: id, userId: req.user?.id, action: 'admin.tenant.unsuspend', ip: req.ip });

    res.json({ success: true, message: 'Tenant reactivated' });
  };

  deleteTenant = async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenant = await db('tenants').where({ id }).whereNull('deleted_at').first();
    if (!tenant) throw new NotFoundError('Tenant');

    await db('tenants').where({ id }).update({ deleted_at: new Date(), status: 'cancelled' });
    AuditService.log({ tenantId: id, userId: req.user?.id, action: 'admin.tenant.delete', ip: req.ip });

    res.json({ success: true, message: 'Tenant deleted' });
  };

  // ── Impersonation — generates a short-lived JWT scoped to a tenant ────────
  impersonateTenant = async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenant = await db('tenants').where({ id }).whereNull('deleted_at').first();
    if (!tenant) throw new NotFoundError('Tenant');

    const ownerUser = await db('users').where({ tenant_id: id, role: 'owner' }).whereNull('deleted_at').first();
    if (!ownerUser) throw new AppError('No owner account found for this tenant', 404, 'NO_OWNER');

    const token = jwt.sign(
      { sub: ownerUser.id, tenantId: id, role: ownerUser.role, email: ownerUser.email, impersonatedBy: req.user?.id },
      process.env.JWT_SECRET!,
      { expiresIn: '2h' } as any
    );

    AuditService.log({ tenantId: id, userId: req.user?.id, action: 'admin.tenant.impersonate', description: `Impersonated ${tenant.name}`, ip: req.ip });

    res.json({ success: true, data: { token, tenant: { id: tenant.id, name: tenant.name, subdomain: tenant.subdomain } } });
  };

  // ── All users across all tenants ───────────────────────────────────────────
  listAllUsers = async (req: Request, res: Response) => {
    const { page = 1, limit = 25, search } = req.query as any;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = db('users').join('tenants', 'users.tenant_id', 'tenants.id').whereNull('users.deleted_at').where('users.role', '!=', 'super_admin');
    if (search) query = query.where((q) => q.whereILike('users.email', `%${search}%`).orWhereILike('users.first_name', `%${search}%`).orWhereILike('users.last_name', `%${search}%`));

    const [{ count }] = await query.clone().count('users.id as count');
    const users = await query.clone()
      .select('users.id', 'users.first_name', 'users.last_name', 'users.email', 'users.role', 'users.status', 'users.last_login_at', 'tenants.name as tenant_name', 'tenants.id as tenant_id')
      .orderBy('users.created_at', 'desc').limit(parseInt(limit)).offset(offset);

    res.json({ success: true, data: { users, pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(count as string) } } });
  };

  // ── Audit logs across all tenants ─────────────────────────────────────────
  listAuditLogs = async (req: Request, res: Response) => {
    const { action, page = 1, limit = 50 } = req.query as any;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = db('audit_logs').leftJoin('users', 'audit_logs.user_id', 'users.id').leftJoin('tenants', 'audit_logs.tenant_id', 'tenants.id');
    if (action) query = query.whereILike('audit_logs.action', `%${action}%`);

    const [{ count }] = await query.clone().count('audit_logs.id as count');
    const logs = await query.clone()
      .select('audit_logs.*', db.raw("CONCAT(users.first_name, ' ', users.last_name) as user_name"), 'users.email as user_email', 'tenants.name as tenant_name')
      .orderBy('audit_logs.created_at', 'desc').limit(parseInt(limit)).offset(offset);

    res.json({ success: true, data: { logs, pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(count as string) } } });
  };

  // ── Revenue overview across all tenants ────────────────────────────────────
  revenueOverview = async (req: Request, res: Response) => {
    const rows = await db('tenants')
      .join('plans', 'tenants.plan_id', 'plans.id')
      .where({ 'tenants.status': 'active' }).whereNull('tenants.deleted_at')
      .groupBy('plans.name', 'plans.price_monthly')
      .select('plans.name as plan_name', 'plans.price_monthly', db.raw('COUNT(tenants.id) as tenant_count'), db.raw('COUNT(tenants.id) * plans.price_monthly as mrr'));

    // Plan prices are stored in cents; the admin console renders MRR as
    // "$<value>", so convert to dollars before handing it over.
    const byPlan = rows.map((row: any) => ({
      plan_name: row.plan_name,
      price_monthly: parseFloat(row.price_monthly) / 100,
      tenant_count: parseInt(row.tenant_count, 10),
      mrr: parseFloat(row.mrr) / 100,
    }));

    const totalMRR = byPlan.reduce((sum, p) => sum + p.mrr, 0);

    res.json({ success: true, data: { byPlan, totalMRR } });
  };

  // ── Global Platform Integrations ──────────────────────────────────────────
  listGlobalIntegrations = async (req: Request, res: Response) => {
    const settings = await db('platform_settings').where('key', 'like', 'platform.integration.%');
    const settingsMap = new Map(settings.map(s => [s.key, typeof s.value === 'string' ? JSON.parse(s.value) : s.value]));

    const DEFAULT_PLATFORM_INTEGRATIONS = [
      {
        id: 'stripe-global',
        name: 'Stripe SaaS Subscriptions & Connect',
        category: 'payment',
        description: 'Powers platform tier billings, automated invoicing, and tenant marketplace payouts.',
        fields: [
          { key: 'secret_key', label: 'Stripe Secret Key', isSecret: true },
          { key: 'webhook_secret', label: 'Webhook Signing Secret', isSecret: true },
          { key: 'publishable_key', label: 'Publishable Key', isSecret: false },
        ],
      },
      {
        id: 'paystack-global',
        name: 'Paystack African Billing Gateway',
        category: 'payment',
        description: 'Enables NGN / GHS / KES card and bank account billing for African tenants.',
        fields: [
          { key: 'secret_key', label: 'Secret Key', isSecret: true },
          { key: 'public_key', label: 'Public Key', isSecret: false },
        ],
      },
      {
        id: 'flutterwave-global',
        name: 'Flutterwave Multi-Currency Payments',
        category: 'payment',
        description: 'Supports mobile money, USSD, and pan-African currencies across 30+ countries.',
        fields: [
          { key: 'secret_key', label: 'Secret Key', isSecret: true },
          { key: 'public_key', label: 'Public Key', isSecret: false },
        ],
      },
      {
        id: 'resend-email',
        name: 'Resend Transactional Email API',
        category: 'email',
        description: 'High-deliverability transactional emails for user invites, billing receipts, and password resets.',
        fields: [
          { key: 'api_key', label: 'Resend API Key', isSecret: true },
          { key: 'from_email', label: 'Default From Email', isSecret: false },
          { key: 'from_name', label: 'Sender Name', isSecret: false },
        ],
      },
      {
        id: 'smtp-relay',
        name: 'Custom SMTP Server Relay',
        category: 'email',
        description: 'Direct fallback mail relay for enterprise custom domain mailings.',
        fields: [
          { key: 'host', label: 'SMTP Host', isSecret: false },
          { key: 'port', label: 'Port', isSecret: false },
          { key: 'username', label: 'SMTP Username', isSecret: false },
          { key: 'password', label: 'SMTP Password', isSecret: true },
        ],
      },
      {
        id: 'meta-whatsapp',
        name: 'Meta WhatsApp Cloud Business API',
        category: 'whatsapp',
        description: 'Official Meta Graph API connection for automated booking reminders, order alerts, and CRM chats.',
        fields: [
          { key: 'phone_number_id', label: 'Phone Number ID', isSecret: false },
          { key: 'access_token', label: 'System User Permanent Access Token', isSecret: true },
          { key: 'business_account_id', label: 'WhatsApp Business Account ID', isSecret: false },
        ],
      },
      {
        id: 'aws-s3-storage',
        name: 'AWS S3 / Cloudflare R2 Asset Bucket',
        category: 'storage',
        description: 'Multi-tenant file hosting for logos, documents, uploaded invoices, and website assets.',
        fields: [
          { key: 'bucket', label: 'S3 Bucket Name', isSecret: false },
          { key: 'region', label: 'AWS Region', isSecret: false },
          { key: 'access_key', label: 'Access Key ID', isSecret: false },
          { key: 'secret_key', label: 'Secret Access Key', isSecret: true },
          { key: 'cdn_url', label: 'Public CDN URL', isSecret: false },
        ],
      },
    ];

    const integrations = DEFAULT_PLATFORM_INTEGRATIONS.map(def => {
      const stored = (settingsMap.get(`platform.integration.${def.id}`) as any) || {};
      const fields = def.fields.map(f => {
        let val = stored.values?.[f.key] || '';
        if (f.isSecret && val) {
          val = val.length > 8 ? `${val.slice(0, 4)}...${val.slice(-4)}` : '••••••••';
        }
        return {
          ...f,
          value: val,
        };
      });

      return {
        id: def.id,
        name: def.name,
        category: def.category,
        description: def.description,
        enabled: stored.enabled ?? false,
        status: stored.status || (stored.enabled ? 'connected' : 'unconfigured'),
        testedAt: stored.testedAt || undefined,
        fields,
      };
    });

    res.json({ success: true, data: { integrations } });
  };

  saveGlobalIntegration = async (req: Request, res: Response) => {
    const { id, enabled, values } = req.body;
    if (!id) throw new AppError('Integration id required', 400);
    const supportedIds = new Set(['stripe-global', 'paystack-global', 'flutterwave-global', 'resend-email', 'smtp-relay', 'meta-whatsapp', 'aws-s3-storage']);
    if (!supportedIds.has(id)) throw new AppError('Unknown platform integration', 404, 'UNKNOWN_INTEGRATION');
    if (values !== undefined && (typeof values !== 'object' || Array.isArray(values))) {
      throw new AppError('Integration values must be an object', 400, 'INVALID_CONFIGURATION');
    }

    const key = `platform.integration.${id}`;
    const existing = await db('platform_settings').where({ key }).first();
    let currentValues: Record<string, any> = {};
    if (existing) {
      const parsed = typeof existing.value === 'string' ? JSON.parse(existing.value) : existing.value;
      currentValues = parsed.values || {};
    }

    const finalValues: Record<string, any> = { ...currentValues };
    if (values) {
      for (const [k, v] of Object.entries(values)) {
        if (typeof v === 'string' && (v.includes('••••') || v.includes('...'))) {
          // retain previous unmasked secret
        } else {
          finalValues[k] = v;
        }
      }
    }

    const payload = {
      enabled: enabled ?? true,
      values: finalValues,
      status: enabled ? 'connected' : 'unconfigured',
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await db('platform_settings').where({ key }).update({
        value: JSON.stringify(payload),
        updated_by: req.user!.id,
        updated_at: new Date(),
      });
    } else {
      await db('platform_settings').insert({
        key,
        value: JSON.stringify(payload),
        updated_by: req.user!.id,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    AuditService.log({
      userId: req.user!.id,
      action: `platform.integration.save.${id}`,
      ip: req.ip,
    });

    res.json({ success: true, message: 'Platform integration saved successfully' });
  };

  testGlobalIntegration = async (req: Request, res: Response) => {
    const { id } = req.params;
    const key = `platform.integration.${id}`;
    const row = await db('platform_settings').where({ key }).first();
    const parsed = row ? (typeof row.value === 'string' ? JSON.parse(row.value) : row.value) : {};
    const values = parsed.values || req.body?.values || {};

    try {
      if (id === 'stripe-global') {
        const secretKey = values.secret_key;
        if (!secretKey) throw new Error('Stripe Secret Key is required');
        const resp = await fetch('https://api.stripe.com/v1/balance', {
          headers: { Authorization: `Bearer ${secretKey}` },
        });
        if (!resp.ok) {
          const errData: any = await resp.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `Stripe HTTP ${resp.status}`);
        }
      } else if (id === 'paystack-global') {
        const secretKey = values.secret_key;
        if (!secretKey) throw new Error('Paystack Secret Key is required');
        const resp = await fetch('https://api.paystack.co/integration/payment_session_timeout', {
          headers: { Authorization: `Bearer ${secretKey}` },
        });
        if (!resp.ok) {
          const errData: any = await resp.json().catch(() => ({}));
          throw new Error(errData?.message || `Paystack HTTP ${resp.status}`);
        }
      } else if (id === 'resend-email') {
        const apiKey = values.api_key;
        if (!apiKey) throw new Error('Resend API Key is required');
        const resp = await fetch('https://api.resend.com/api-keys', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!resp.ok) {
          const errData: any = await resp.json().catch(() => ({}));
          throw new Error(errData?.message || `Resend HTTP ${resp.status}`);
        }
      } else if (id === 'meta-whatsapp') {
        const phoneId = values.phone_number_id;
        const token = values.access_token;
        if (!phoneId || !token) throw new Error('Phone Number ID and Access Token are required');
        const resp = await fetch(`https://graph.facebook.com/v19.0/${phoneId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) {
          const errData: any = await resp.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `Meta Graph API HTTP ${resp.status}`);
        }
      } else {
        throw new AppError(`A live verification adapter for ${id} has not been implemented. Configuration was not marked verified.`, 501, 'VERIFICATION_UNAVAILABLE');
      }

      const updatedPayload = {
        ...parsed,
        status: 'connected',
        testedAt: new Date().toISOString(),
      };
      if (row) {
        await db('platform_settings').where({ key }).update({
          value: JSON.stringify(updatedPayload),
          updated_at: new Date(),
        });
      }

      res.json({ success: true, message: `Handshake verification succeeded for ${id}` });
    } catch (err: any) {
      const verificationUnavailable = err instanceof AppError && err.statusCode === 501;
      if (row && !verificationUnavailable) {
        const failedPayload = {
          ...parsed,
          status: 'unconfigured',
        };
        await db('platform_settings').where({ key }).update({
          value: JSON.stringify(failedPayload),
          updated_at: new Date(),
        });
      }
      res.status(verificationUnavailable ? 501 : 400).json({ success: false, error: err.message || 'Connection test failed' });
    }
  };
}
