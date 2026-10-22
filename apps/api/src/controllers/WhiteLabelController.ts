import { Request, Response } from 'express';
import { db } from '../lib/database';
import { AppError } from '../lib/errors';
import { AuditService } from '../services/index';

export class WhiteLabelController {
  getConfig = async (req: Request, res: Response) => {
    const config = await db('white_label_configs').where({ tenant_id: req.tenant!.id }).first();
    res.json({ success: true, data: { config: config || null } });
  };

  saveConfig = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    if (!req.tenant!.feature_white_label) {
      throw new AppError('White label is not available on your current plan. Please upgrade to Enterprise.', 403, 'FEATURE_NOT_AVAILABLE');
    }

    const {
      brandName, brandLogoUrl, brandFaviconUrl, primaryColor, secondaryColor,
      customDomain, supportEmail, supportPhone, termsUrl, privacyUrl,
      emailSettings, smtpSettings, hidePoweredBy,
    } = req.body;

    const existing = await db('white_label_configs').where({ tenant_id: tenantId }).first();
    const data: any = {
      brand_name: brandName || req.tenant!.name,
      brand_logo_url: brandLogoUrl || null,
      brand_favicon_url: brandFaviconUrl || null,
      primary_color: primaryColor || '#4f8ef7',
      secondary_color: secondaryColor || '#8b5cf6',
      custom_domain: customDomain || null,
      support_email: supportEmail || null,
      support_phone: supportPhone || null,
      terms_url: termsUrl || null,
      privacy_url: privacyUrl || null,
      email_settings: JSON.stringify(emailSettings || {}),
      smtp_settings: JSON.stringify(smtpSettings || {}),
      hide_powered_by: hidePoweredBy === true,
    };

    let config;
    if (existing) {
      [config] = await db('white_label_configs').where({ tenant_id: tenantId }).update({ ...data, updated_at: new Date() }).returning('*');
    } else {
      [config] = await db('white_label_configs').insert({ tenant_id: tenantId, ...data }).returning('*');
    }

    AuditService.log({ tenantId, userId: req.user!.id, action: 'white_label.save', ip: req.ip });
    res.json({ success: true, data: { config } });
  };

  previewBranding = async (req: Request, res: Response) => {
    const config = await db('white_label_configs').where({ tenant_id: req.tenant!.id }).first();
    const tenant = req.tenant!;

    // Return the CSS variables for the branded theme
    const cssVars = {
      '--primary': config?.primary_color || tenant.primary_color || '#4f8ef7',
      '--secondary': config?.secondary_color || tenant.secondary_color || '#8b5cf6',
      '--brand-name': `"${config?.brand_name || tenant.name}"`,
    };

    res.json({
      success: true,
      data: {
        brandName: config?.brand_name || tenant.name,
        logoUrl: config?.brand_logo_url || tenant.logo_url,
        faviconUrl: config?.brand_favicon_url,
        cssVars,
        hidePoweredBy: config?.hide_powered_by || false,
      },
    });
  };

  // ── Reseller management (owner can create sub-tenants) ────────────────────
  listResellers = async (req: Request, res: Response) => {
    // Tenants where this tenant's ID is the reseller_parent (conceptually stored in settings)
    const tenantId = req.tenant!.id;
    const resellers = await db('tenants').whereRaw(`settings->>'resellerParentId' = ?`, [tenantId]).whereNull('deleted_at');
    res.json({ success: true, data: { resellers } });
  };

  createReseller = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    if (!req.tenant!.feature_white_label) throw new AppError('White label required for reseller accounts', 403, 'FEATURE_NOT_AVAILABLE');

    const { businessName, ownerEmail, ownerFirstName, ownerLastName, plan = 'starter' } = req.body;
    const planRecord = await db('plans').where({ slug: plan }).first();
    if (!planRecord) throw new AppError('Invalid plan', 400, 'INVALID_PLAN');

    const { TenantService } = await import('../services/index');
    const slug = await TenantService.generateUniqueSlug(businessName);

    const bcrypt = await import('bcryptjs');
    const crypto = await import('crypto');
    const tempPassword = crypto.randomBytes(12).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const [newTenant] = await db('tenants').insert({
      name: businessName, slug, subdomain: slug, plan_id: planRecord.id, status: 'active',
      settings: JSON.stringify({ resellerParentId: tenantId }),
    }).returning('*');

    const [owner] = await db('users').insert({
      tenant_id: newTenant.id, email: ownerEmail, password_hash: passwordHash,
      first_name: ownerFirstName, last_name: ownerLastName, role: 'owner', status: 'active',
    }).returning('*');

    // Copy white-label config from parent
    const parentWL = await db('white_label_configs').where({ tenant_id: tenantId }).first();
    if (parentWL) {
      await db('white_label_configs').insert({ ...parentWL, id: undefined, tenant_id: newTenant.id });
    }

    AuditService.log({ tenantId, userId: req.user!.id, action: 'reseller.create', resourceId: newTenant.id, ip: req.ip });
    res.status(201).json({ success: true, data: { tenant: newTenant, owner: { ...owner, tempPassword } } });
  };
}
