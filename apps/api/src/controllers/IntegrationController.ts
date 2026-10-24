import { Request, Response } from 'express';
import net from 'net';
import nodemailer from 'nodemailer';
import { db } from '../lib/database';
import { AppError, NotFoundError } from '../lib/errors';
import { AuditService } from '../services/index';

// ── Integration provider catalogue (15 supported providers) ────────────────
export const INTEGRATION_PROVIDERS = [
  // Payments
  {
    key: 'stripe',
    name: 'Stripe',
    category: 'Payments',
    icon: '💳',
    description: 'Accept credit cards, debit cards, Apple Pay, Google Pay, and recurring billing globally',
    configFields: ['publishable_key', 'secret_key', 'webhook_secret'],
    docsUrl: 'https://stripe.com/docs',
  },
  {
    key: 'paystack',
    name: 'Paystack',
    category: 'Payments',
    icon: '💳',
    description: 'Premier African payment gateway supporting cards, bank transfers, USSD, and Mobile Money',
    configFields: ['public_key', 'secret_key', 'webhook_secret'],
    docsUrl: 'https://paystack.com/docs',
  },
  {
    key: 'flutterwave',
    name: 'Flutterwave',
    category: 'Payments',
    icon: '💳',
    description: 'Pan-African and international cross-border payments across 30+ currencies',
    configFields: ['public_key', 'secret_key', 'encryption_key'],
    docsUrl: 'https://developer.flutterwave.com',
  },
  {
    key: 'paypal',
    name: 'PayPal',
    category: 'Payments',
    icon: '🅿️',
    description: 'Accept PayPal, Venmo, Pay in 4, and major debit/credit cards worldwide',
    configFields: ['client_id', 'client_secret', 'mode'],
    docsUrl: 'https://developer.paypal.com',
  },
  {
    key: 'manual_bank',
    name: 'Manual Bank Transfer',
    category: 'Payments',
    icon: '🏦',
    description: 'Direct wire / account deposit instructions displayed on invoices, checkout, and portal orders',
    configFields: ['bank_name', 'account_number', 'account_name', 'routing_swift', 'instructions'],
    docsUrl: '#',
  },

  // Messaging & Communication
  {
    key: 'twilio',
    name: 'Twilio',
    category: 'Communication',
    icon: '📱',
    description: 'Enterprise SMS, MMS, WhatsApp Business API, and automated voice notifications',
    configFields: ['account_sid', 'auth_token', 'phone_number', 'whatsapp_number'],
    docsUrl: 'https://www.twilio.com/docs',
  },
  {
    key: 'whatsapp_cloud',
    name: 'WhatsApp Cloud API',
    category: 'Communication',
    icon: '💬',
    description: 'Official Meta WhatsApp Business Cloud API for high-volume automated messaging and templates',
    configFields: ['phone_number_id', 'access_token', 'business_account_id'],
    docsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api',
  },
  {
    key: 'telegram',
    name: 'Telegram Bot',
    category: 'Communication',
    icon: '✈️',
    description: 'Instant notification bot for orders, customer alerts, and internal ops dispatch',
    configFields: ['bot_token', 'chat_id'],
    docsUrl: 'https://core.telegram.org/bots',
  },
  {
    key: 'slack',
    name: 'Slack',
    category: 'Communication',
    icon: '💬',
    description: 'Team channel alerts, new deal announcements, inventory alerts, and ticket escalation',
    configFields: ['webhook_url', 'bot_token'],
    docsUrl: 'https://api.slack.com',
  },

  // Email Infrastructure
  {
    key: 'resend',
    name: 'Resend Email',
    category: 'Email',
    icon: '📧',
    description: 'Developer-first transactional email with high deliverability and domain reputation',
    configFields: ['api_key', 'from_email', 'from_name'],
    docsUrl: 'https://resend.com/docs',
  },
  {
    key: 'email_smtp',
    name: 'Custom SMTP Server',
    category: 'Email',
    icon: '📨',
    description: 'Connect your corporate mail server, Microsoft Exchange, or dedicated SMTP relay',
    configFields: ['host', 'port', 'username', 'password', 'secure', 'from_email', 'from_name'],
    docsUrl: '#',
  },

  // Productivity & Scheduling
  {
    key: 'google_workspace',
    name: 'Google Workspace',
    category: 'Productivity',
    icon: '🔤',
    description: 'Gmail synchronization, Google Drive file attachments, and single sign-on',
    configFields: ['client_id', 'client_secret', 'refresh_token'],
    docsUrl: 'https://developers.google.com/workspace',
  },
  {
    key: 'microsoft_365',
    name: 'Microsoft 365 / Outlook',
    category: 'Productivity',
    icon: '🪟',
    description: 'Exchange mail, Outlook calendar sync, Microsoft Teams, and OneDrive integration',
    configFields: ['client_id', 'client_secret', 'tenant_id'],
    docsUrl: 'https://docs.microsoft.com/en-us/graph',
  },
  {
    key: 'zoom',
    name: 'Zoom Meetings',
    category: 'Productivity',
    icon: '🎥',
    description: 'Automatically generate Zoom meeting rooms for appointments, classes, and consultations',
    configFields: ['client_id', 'client_secret', 'account_id'],
    docsUrl: 'https://marketplace.zoom.us',
  },
  {
    key: 'google_calendar',
    name: 'Google Calendar',
    category: 'Calendar',
    icon: '📅',
    description: 'Two-way calendar sync for appointments, consultations, and staff shifts',
    configFields: ['client_id', 'client_secret', 'refresh_token'],
    docsUrl: 'https://developers.google.com/calendar',
  },
];

const connectionTimeout = 10_000;

async function providerFetch(url: string, init: RequestInit = {}): Promise<globalThis.Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), connectionTimeout);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function asConfig(value: unknown): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return {}; }
  }
  return value as Record<string, any>;
}

function templateForTenant(id: string, tenantId: string) {
  return db('notification_templates').where({ id }).andWhere((query) => {
    query.where({ tenant_id: tenantId }).orWhereNull('tenant_id');
  }).first();
}

export class IntegrationController {
  // ── 1. Catalog & Connected Integrations ────────────────────────────────────
  getCatalog = async (req: Request, res: Response) => {
    const installed = await db('integrations').where({ tenant_id: req.tenant!.id });
    const installedMap = new Map(installed.map((item) => [item.provider, item]));

    const catalog = INTEGRATION_PROVIDERS.map((p) => {
      const conn = installedMap.get(p.key);
      const isConnected = !!conn;
      const status = conn?.status || 'inactive';
      let configSafe: Record<string, any> = {};

      if (conn?.config) {
        try {
          const parsed = typeof conn.config === 'string' ? JSON.parse(conn.config) : conn.config;
          for (const key of Object.keys(parsed)) {
            // Mask sensitive secret values
            if (key.includes('secret') || key.includes('token') || key.includes('password') || key.includes('key')) {
              const val = String(parsed[key] || '');
              configSafe[key] = val.length > 8 ? `${val.slice(0, 4)}...${val.slice(-4)}` : '••••••••';
            } else {
              configSafe[key] = parsed[key];
            }
          }
        } catch {}
      }

      return {
        ...p,
        isConnected,
        status,
        connectedAt: conn?.connected_at || null,
        updatedAt: conn?.updated_at || null,
        config: configSafe,
      };
    });

    res.json({ success: true, data: { catalog } });
  };

  listConnected = async (req: Request, res: Response) => {
    const connected = await db('integrations').where({ tenant_id: req.tenant!.id });
    // Sanitize secrets before returning
    const safeConnected = connected.map((conn) => {
      let configSafe: Record<string, any> = {};
      if (conn.config) {
        try {
          const parsed = typeof conn.config === 'string' ? JSON.parse(conn.config) : conn.config;
          for (const key of Object.keys(parsed)) {
            if (key.includes('secret') || key.includes('token') || key.includes('password') || key.includes('key')) {
              const val = String(parsed[key] || '');
              configSafe[key] = val.length > 8 ? `${val.slice(0, 4)}...${val.slice(-4)}` : '••••••••';
            } else {
              configSafe[key] = parsed[key];
            }
          }
        } catch {}
      }
      return {
        ...conn,
        config: configSafe,
      };
    });

    res.json({ success: true, data: { integrations: safeConnected } });
  };

  connect = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { provider, config, is_active } = req.body;
    if (!provider) throw new AppError('Provider required', 400, 'MISSING_PROVIDER');

    const providerDef = INTEGRATION_PROVIDERS.find((p) => p.key === provider);
    if (!providerDef) throw new AppError('Unknown provider', 404, 'UNKNOWN_PROVIDER');

    const existing = await db('integrations').where({ tenant_id: tenantId, provider }).first();

    // Merge existing config if masked placeholders were sent back
    let finalConfig: Record<string, any> = { ...(config || {}) };
    if (existing && existing.config) {
      const existingParsed = typeof existing.config === 'string' ? JSON.parse(existing.config) : existing.config;
      for (const [k, v] of Object.entries(finalConfig)) {
        if (typeof v === 'string' && (v.includes('••••') || v.includes('...'))) {
          finalConfig[k] = existingParsed[k];
        }
      }
    }

    const status = is_active === false ? 'inactive' : 'active';

    if (existing) {
      await db('integrations').where({ id: existing.id }).update({
        status,
        config: JSON.stringify(finalConfig),
        updated_at: new Date(),
      });
    } else {
      await db('integrations').insert({
        id: db.raw('uuid_generate_v4()'),
        tenant_id: tenantId,
        provider,
        status,
        config: JSON.stringify(finalConfig),
        connected_at: new Date(),
      });
    }

    AuditService.log({ tenantId, userId: req.user!.id, action: `integration.connect.${provider}`, ip: req.ip });
    res.json({ success: true, message: `${providerDef.name} configuration saved successfully` });
  };

  disconnect = async (req: Request, res: Response) => {
    const { provider } = req.params;
    await db('integrations').where({ tenant_id: req.tenant!.id, provider }).update({ status: 'inactive', updated_at: new Date() });
    AuditService.log({ tenantId: req.tenant!.id, userId: req.user!.id, action: `integration.disconnect.${provider}`, ip: req.ip });
    res.json({ success: true, message: 'Integration disconnected' });
  };

  // ── 2. Real External Verification ─────────────────────────────────────────
  testConnection = async (req: Request, res: Response) => {
    const { provider } = req.params;
    const tenantId = req.tenant!.id;
    const integration = await db('integrations').where({ tenant_id: tenantId, provider }).first();
    if (!integration) throw new NotFoundError('Integration not configured');

    const providerDef = INTEGRATION_PROVIDERS.find((p) => p.key === provider);
    const config = asConfig(integration.config);

    // Check mandatory fields first
    const missingFields = (providerDef?.configFields || []).filter((f) => !config[f] && f !== 'routing_swift' && f !== 'instructions' && f !== 'mode' && f !== 'whatsapp_number');
    if (missingFields.length > 0) {
      await db('integrations').where({ id: integration.id }).update({ status: 'error' });
      return res.status(400).json({ success: false, error: `Missing required credentials: ${missingFields.join(', ')}` });
    }

    try {
      if (provider === 'stripe') {
        const key = config.secret_key;
        const resp = await providerFetch('https://api.stripe.com/v1/balance', {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (!resp.ok) {
          const errData: any = await resp.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `Stripe HTTP ${resp.status}`);
        }
      } else if (provider === 'paystack') {
        const key = config.secret_key;
        const resp = await providerFetch('https://api.paystack.co/integration/payment_session_timeout', {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (!resp.ok) {
          const errData: any = await resp.json().catch(() => ({}));
          throw new Error(errData?.message || `Paystack HTTP ${resp.status}`);
        }
      } else if (provider === 'resend') {
        const key = config.api_key;
        const resp = await providerFetch('https://api.resend.com/api-keys', {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (!resp.ok) {
          const errData: any = await resp.json().catch(() => ({}));
          throw new Error(errData?.message || `Resend HTTP ${resp.status}`);
        }
      } else if (provider === 'whatsapp_cloud') {
        const phoneId = config.phone_number_id;
        const token = config.access_token;
        const resp = await providerFetch(`https://graph.facebook.com/v19.0/${phoneId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) {
          const errData: any = await resp.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `Meta Graph API HTTP ${resp.status}`);
        }
      } else if (provider === 'telegram') {
        const botToken = config.bot_token;
        const resp = await providerFetch(`https://api.telegram.org/bot${botToken}/getMe`);
        const json: any = await resp.json().catch(() => ({}));
        if (!json.ok) {
          throw new Error(json.description || 'Invalid Telegram bot token');
        }
      } else if (provider === 'email_smtp') {
        const transporter = nodemailer.createTransport({
          host: config.host,
          port: Number(config.port) || 587,
          secure: config.secure === true || config.secure === 'true',
          auth: {
            user: config.username,
            pass: config.password,
          },
          connectionTimeout: 6000,
        });
        await transporter.verify();
      } else if (provider === 'manual_bank') {
        if (!config.bank_name || !config.account_number || !config.account_name) {
          throw new Error('Bank name, account number, and account name are required');
        }
      } else {
        throw new AppError(
          `A live verification adapter for ${providerDef?.name || provider} has not been implemented. Configuration was not marked verified.`,
          501,
          'VERIFICATION_UNAVAILABLE',
        );
      }

      await db('integrations').where({ id: integration.id }).update({ status: 'active', updated_at: new Date() });
      return res.json({ success: true, message: `${providerDef?.name || provider} connection verified successfully!` });
    } catch (err: any) {
      const status = err instanceof AppError && err.statusCode === 501 ? integration.status : 'error';
      await db('integrations').where({ id: integration.id }).update({ status, updated_at: new Date() });
      return res.status(err instanceof AppError ? err.statusCode : 400).json({ success: false, error: err.message || 'Connection test failed' });
    }
  };

  getWebhookUrl = async (req: Request, res: Response) => {
    const { provider } = req.params;
    const baseUrl = process.env.API_URL || 'https://api.nexos.app';
    const webhookUrl = `${baseUrl}/api/v1/webhooks/incoming/${req.tenant!.id}/${provider}`;
    res.json({ success: true, data: { webhookUrl } });
  };

  // ── 3. Notification Templates ─────────────────────────────────────────────
  listTemplates = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    // Get all system templates and tenant-specific overrides
    const templates = await db('notification_templates')
      .where({ tenant_id: tenantId })
      .orWhereNull('tenant_id')
      .orderBy('name', 'asc');

    // Tenant overrides replace system templates with identical key
    const templateMap = new Map<string, any>();
    // First insert system defaults
    for (const tpl of templates.filter((t) => !t.tenant_id)) {
      templateMap.set(tpl.key, { ...tpl, is_system_default: true });
    }
    // Then override with tenant customs
    for (const tpl of templates.filter((t) => t.tenant_id === tenantId)) {
      templateMap.set(tpl.key, { ...tpl, is_system_default: false });
    }

    res.json({ success: true, data: { templates: Array.from(templateMap.values()) } });
  };

  saveTemplate = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { id, key, name, channel, subject, body, variables, is_active } = req.body;

    if (!key || !name || !body) {
      throw new AppError('Template key, name, and body are required', 400, 'MISSING_FIELDS');
    }

    let existing = null;
    if (id) {
      existing = await templateForTenant(id, tenantId);
    } else {
      existing = await db('notification_templates').where({ tenant_id: tenantId, key }).first();
    }

    let savedId = id;

    if (existing && existing.tenant_id === tenantId) {
      // Update tenant's existing override
      await db('notification_templates').where({ id: existing.id }).update({
        name,
        channel: channel || 'email',
        subject: subject || null,
        body,
        variables: typeof variables === 'string' ? variables : JSON.stringify(variables || []),
        is_active: is_active !== false,
        updated_at: new Date(),
      });
      savedId = existing.id;
    } else {
      // Create new tenant-specific template (or override system template)
      const [newRow] = await db('notification_templates')
        .insert({
          id: db.raw('uuid_generate_v4()'),
          tenant_id: tenantId,
          key,
          name,
          channel: channel || 'email',
          subject: subject || null,
          body,
          variables: typeof variables === 'string' ? variables : JSON.stringify(variables || []),
          is_active: is_active !== false,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('*');
      savedId = newRow?.id || newRow;
    }

    AuditService.log({ tenantId, userId: req.user!.id, action: `template.save.${key}`, ip: req.ip });
    res.json({ success: true, message: 'Notification template saved successfully', data: { id: savedId } });
  };

  deleteTemplate = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { id } = req.params;

    const existing = await templateForTenant(id, tenantId);
    if (!existing) throw new NotFoundError('Template');

    if (!existing.tenant_id) {
      throw new AppError('System default templates cannot be deleted. Create a tenant override instead.', 409, 'SYSTEM_TEMPLATE_IMMUTABLE');
    }

    await db('notification_templates').where({ id, tenant_id: tenantId }).delete();
    AuditService.log({ tenantId, userId: req.user!.id, action: `template.delete.${existing.key}`, ip: req.ip });
    res.json({ success: true, message: 'Custom template removed, reverted to default' });
  };

  previewTemplate = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { variables } = req.body;

    const tpl = await templateForTenant(id, req.tenant!.id);
    if (!tpl) throw new NotFoundError('Template');

    const sampleVars: Record<string, string> = {
      name: 'Alex Johnson',
      customer_name: 'Alex Johnson',
      student_name: 'Sophia Martinez',
      admission_number: 'ADM-2025-042',
      session_name: '2025/2026 Academic Session',
      class_name: 'Grade 10 - Alpha',
      exam_title: 'First Term Examination 2025',
      score: '94.5',
      letter_grade: 'A',
      remarks: 'Outstanding performance and diligence',
      guardian_name: 'David Martinez',
      fee_category: 'Tuition Fee',
      invoice_number: 'INV-2025-0012',
      currency: 'USD',
      total_amount: '1,250.00',
      amount_due: '1,250.00',
      amount_paid: '1,250.00',
      balance_due: '0.00',
      payment_date: new Date().toLocaleDateString(),
      due_date: new Date(Date.now() + 14 * 86400000).toLocaleDateString(),
      reference: 'TXN-9847120',
      po_number: 'PO-2025-0089',
      supplier_name: 'Prime Distribution Logistics',
      warehouse_name: 'Central Distribution Hub #1',
      expected_delivery_date: new Date(Date.now() + 5 * 86400000).toLocaleDateString(),
      order_number: 'ORD-5542',
      order_status: 'Dispatched & In Transit',
      tracking_url: 'https://nexos.app/track/ORD-5542',
      organization_name: req.tenant?.name || 'NexOS Enterprise',
      login_url: 'https://nexos.app/login',
      payment_link: 'https://nexos.app/pay/INV-2025-0012',
      portal_url: 'https://nexos.app/portal',
      ...(variables || {}),
    };

    let renderedSubject = tpl.subject || '';
    let renderedBody = tpl.body || '';

    for (const [k, v] of Object.entries(sampleVars)) {
      const reg = new RegExp(`{{${k}}}`, 'g');
      renderedSubject = renderedSubject.replace(reg, String(v));
      renderedBody = renderedBody.replace(reg, String(v));
    }

    res.json({
      success: true,
      data: {
        template: tpl,
        renderedSubject,
        renderedBody,
      },
    });
  };

  testSendTemplate = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { recipient, variables } = req.body;
    if (!recipient) throw new AppError('Recipient email or phone number is required', 400, 'MISSING_RECIPIENT');

    const tpl = await templateForTenant(id, req.tenant!.id);
    if (!tpl) throw new NotFoundError('Template');

    if (tpl.channel !== 'email') {
      throw new AppError(`Test delivery for ${tpl.channel} is not implemented; no message was sent.`, 501, 'DELIVERY_UNAVAILABLE');
    }

    const activeEmail = await db('integrations')
      .where({ tenant_id: req.tenant!.id, status: 'active' })
      .whereIn('provider', ['resend', 'email_smtp'])
      .first();
    if (!activeEmail) throw new AppError('Configure and enable Resend or SMTP before sending a test email.', 409, 'EMAIL_PROVIDER_UNAVAILABLE');

    const config = asConfig(activeEmail.config);
    const supplied = variables && typeof variables === 'object' ? variables : {};
    const render = (source: string) => source.replace(/{{\s*([\w.]+)\s*}}/g, (_: string, key: string) => String(supplied[key] ?? `{{${key}}}`));
    const subject = render(tpl.subject || `Test: ${tpl.name}`);
    const body = render(tpl.body || '');

    if (activeEmail.provider === 'resend') {
      const response = await providerFetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.api_key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: config.from_name ? `${config.from_name} <${config.from_email}>` : config.from_email, to: [recipient], subject, html: body.replace(/\n/g, '<br>') }),
      });
      if (!response.ok) throw new Error((await response.json().catch(() => ({})) as any).message || `Resend HTTP ${response.status}`);
    } else {
      const transporter = nodemailer.createTransport({
        host: config.host, port: Number(config.port) || 587, secure: config.secure === true || config.secure === 'true',
        auth: { user: config.username, pass: config.password }, connectionTimeout,
      });
      await transporter.sendMail({ from: config.from_name ? `${config.from_name} <${config.from_email}>` : config.from_email, to: recipient, subject, html: body.replace(/\n/g, '<br>') });
    }

    AuditService.log({
      tenantId: req.tenant!.id,
      userId: req.user!.id,
      action: `template.test_send.accepted.${tpl.key}`,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: `Test email was accepted by ${activeEmail.provider}; delivery is tracked by the provider.`,
    });
  };
}
