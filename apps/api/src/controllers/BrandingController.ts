import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import multer from 'multer';
import sharp from 'sharp';
import { db } from '../lib/database';
import { AppError, ValidationError } from '../lib/errors';
import { AuditService } from '../services/index';
import {
  getTenantBranding,
  getTenantNavigation,
  invalidateTenantCache,
  resolveTenantByHostname,
  TenantBranding,
} from '../services/TenantContextService';

/**
 * Business identity and branding.
 *
 * Every business on the platform owns an identity — its name, logo, favicon
 * and colours — and that identity has to show up consistently everywhere: the
 * dashboard header, the sidebar, the browser tab, the favicon, invoices,
 * documents and the public site.
 *
 * Branding is *not* a paid add-on: the plan gates advanced white-label
 * features (hiding the "powered by" line, custom domains, a tenant's own SMTP
 * relay), but every tenant can name their business and upload their logo.
 */

const STORAGE_ROOT = process.env.STORAGE_LOCAL_PATH
  ? path.resolve(process.env.STORAGE_LOCAL_PATH)
  : path.resolve(__dirname, '..', 'storage');

const BRANDING_ROOT = path.join(STORAGE_ROOT, 'branding');

/** Where the uploaded branding assets live — the API serves this folder. */
export const BRANDING_STORAGE_ROOT = BRANDING_ROOT;

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(new AppError('Only PNG, JPEG, WEBP, GIF or SVG images are accepted', 400, 'INVALID_FILE_TYPE'));
      return;
    }
    cb(null, true);
  },
});

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export class BrandingController {
  // ── GET /branding ─────────────────────────────────────────────────────────
  getBranding = async (req: Request, res: Response) => {
    const tenant = req.tenant!;
    const [branding, navigation] = await Promise.all([
      getTenantBranding(tenant.id),
      getTenantNavigation(tenant),
    ]);

    res.json({
      success: true,
      data: {
        branding,
        navigation,
        enabledModules: tenant.enabled_modules || [],
        plan: {
          name: tenant.plan_name,
          slug: tenant.plan_slug,
          features: tenant.plan_features || {},
          maxUsers: tenant.max_users,
          maxStorageGb: tenant.max_storage_gb,
          maxWorkflows: tenant.max_workflows,
          maxBranches: tenant.max_branches,
        },
        // Which advanced white-label features the plan actually grants.
        entitlements: {
          customDomain: tenant.feature_custom_domain === true,
          whiteLabel: tenant.feature_white_label === true,
          hidePoweredBy: tenant.feature_white_label === true,
        },
      },
    });
  };

  // ── PATCH /branding ───────────────────────────────────────────────────────
  updateBranding = async (req: Request, res: Response) => {
    const tenant = req.tenant!;
    const {
      name, legalName, tradingName, description, businessEmail, contactEmail, phone,
      address, country, currency, timezone, locale, registrationNumber, businessHours,
      primaryColor, secondaryColor, logoUrl, logoLightUrl, logoDarkUrl, faviconUrl,
      brandFont, dateFormat, numberFormat, socialLinks,
      dashboardTheme,
    } = req.body || {};

    const update: Record<string, any> = { updated_at: new Date() };

    // `name` is the stored column; `businessName` is the name the branding
    // payload uses everywhere else. Both are accepted so a client can send
    // back what it read without having to rename the field.
    const effectiveName = name ?? req.body?.businessName;
    if (effectiveName !== undefined) {
      const trimmed = String(effectiveName).trim();
      if (!trimmed) throw new ValidationError([{ field: 'name', message: 'Business name is required' }]);
      update.name = trimmed;
    }
    if (legalName !== undefined) update.legal_name = legalName || null;
    if (tradingName !== undefined) update.trading_name = tradingName || null;
    if (description !== undefined) update.description = description || null;
    if (businessEmail !== undefined) update.business_email = businessEmail || null;
    if (contactEmail !== undefined) update.contact_email = contactEmail || null;
    if (phone !== undefined) update.phone = phone || null;
    if (address !== undefined) update.address = JSON.stringify(address || {});
    if (country !== undefined) update.country = country || null;
    if (currency !== undefined) update.currency = currency || null;
    if (timezone !== undefined) update.timezone = timezone || null;
    if (locale !== undefined) update.locale = locale || null;
    if (registrationNumber !== undefined) update.registration_number = registrationNumber || null;
    if (businessHours !== undefined) update.business_hours = businessHours || null;
    if (logoUrl !== undefined) update.logo_url = logoUrl || null;
    if (logoLightUrl !== undefined) update.logo_light_url = logoLightUrl || null;
    if (logoDarkUrl !== undefined) update.logo_dark_url = logoDarkUrl || null;
    if (faviconUrl !== undefined) update.favicon_url = faviconUrl || null;
    if (brandFont !== undefined) update.brand_font = brandFont || null;
    if (dateFormat !== undefined) update.date_format = dateFormat || null;
    if (numberFormat !== undefined) update.number_format = numberFormat || null;
    if (socialLinks !== undefined) update.social_links = JSON.stringify(socialLinks || {});
    if (dashboardTheme !== undefined) {
      const current = typeof req.tenant!.settings === 'string' ? JSON.parse(req.tenant!.settings || '{}') : (req.tenant!.settings || {});
      update.settings = JSON.stringify({ ...current, dashboardTheme: String(dashboardTheme || 'indigo') });
    }

    for (const [field, value] of [['primaryColor', primaryColor], ['secondaryColor', secondaryColor]] as const) {
      if (value === undefined) continue;
      if (!HEX_COLOR.test(String(value))) {
        throw new ValidationError([{ field, message: `"${field}" must be a hex colour such as #4f8ef7` }]);
      }
      update[field === 'primaryColor' ? 'primary_color' : 'secondary_color'] = value;
    }

    await db('tenants').where({ id: tenant.id }).update(update);

    // The tenant record is cached for five minutes — the cache has to be
    // dropped now, or the new name/logo would not appear until the TTL
    // expired.
    await invalidateTenantCache(tenant.id);

    AuditService.log({
      tenantId: tenant.id,
      userId: req.user!.id,
      action: 'branding.update',
      resourceType: 'tenant',
      resourceId: tenant.id,
      newValues: update,
      ip: req.ip,
    });

    const branding = await getTenantBranding(tenant.id);
    res.json({ success: true, data: { branding } });
  };

  // ── POST /branding/preview ───────────────────────────────────────────────
  previewBranding = async (req: Request, res: Response) => {
    const current = await getTenantBranding(req.tenant!.id);
    const overrides = req.body || {};

    const preview: TenantBranding = {
      ...current,
      businessName: overrides.name || overrides.businessName || current.businessName,
      legalName: overrides.legalName ?? current.legalName,
      tradingName: overrides.tradingName ?? current.tradingName,
      description: overrides.description ?? current.description,
      logoUrl: overrides.logoUrl ?? current.logoUrl,
      logoLightUrl: overrides.logoLightUrl ?? current.logoLightUrl,
      logoDarkUrl: overrides.logoDarkUrl ?? current.logoDarkUrl,
      faviconUrl: overrides.faviconUrl ?? current.faviconUrl,
      primaryColor: overrides.primaryColor || current.primaryColor,
      secondaryColor: overrides.secondaryColor || current.secondaryColor,
      fontFamily: overrides.brandFont ?? current.fontFamily,
      supportEmail: overrides.contactEmail ?? current.supportEmail,
      supportPhone: overrides.phone ?? current.supportPhone,
    };

    res.json({
      success: true,
      data: {
        branding: preview,
        cssVars: cssVariables(preview),
      },
    });
  };

  // ── POST /branding/assets ─────────────────────────────────────────────────
  uploadAssetHandler = async (req: Request, res: Response) => {
    const tenant = req.tenant!;
    if (!req.file) throw new ValidationError([{ field: 'file', message: 'An image file is required' }]);

    const kind = String(req.body?.kind || 'logo');
    if (!['logo', 'logo_light', 'logo_dark', 'favicon'].includes(kind)) {
      throw new ValidationError([{ field: 'kind', message: '"kind" must be logo, logo_light, logo_dark or favicon' }]);
    }

    const tenantDir = path.join(BRANDING_ROOT, tenant.id);
    await fs.mkdir(tenantDir, { recursive: true });

    const stamp = crypto.randomBytes(6).toString('hex');
    const variants = await renderVariants(req.file.buffer, req.file.mimetype, tenantDir, stamp, tenant.id);

    const update: Record<string, any> = {};
    if (kind === 'favicon') {
      update.favicon_url = variants.favicon;
      update.favicon_apple_touch_url = variants.appleTouchIcon;
    } else if (kind === 'logo_dark') {
      update.logo_dark_url = variants.logo;
    } else {
      update.logo_url = variants.logo;
      update.logo_light_url = variants.logo;
    }

    await db('tenants').where({ id: tenant.id }).update(update);
    await invalidateTenantCache(tenant.id);

    AuditService.log({
      tenantId: tenant.id,
      userId: req.user!.id,
      action: 'branding.asset.upload',
      resourceType: 'tenant',
      resourceId: tenant.id,
      newValues: { kind, files: variants },
      ip: req.ip,
    });

    const branding = await getTenantBranding(tenant.id);
    res.status(201).json({ success: true, data: { branding, kind, ...variants } });
  };

  // ── GET /branding/public?host=… ───────────────────────────────────────────
  // Resolves the branding of the business that owns a hostname. Used by the
  // public website so it renders with the right name, logo and favicon.
  getPublicBranding = async (req: Request, res: Response) => {
    const host = (req.query.host as string) || req.hostname;
    const tenant = await resolveTenantByHostname(host);
    if (!tenant) {
      res.status(404).json({ success: false, error: { code: 'TENANT_NOT_FOUND', message: 'No business is registered for this address' } });
      return;
    }

    const branding = await getTenantBranding(tenant.id);
    res.json({
      success: true,
      data: {
        branding,
        hostname: host,
        published: tenant.status === 'active' || tenant.status === 'trial',
      },
    });
  };

  /**
   * Public, hostname-scoped website payload.  It only exposes pages that the
   * owner has actually published; drafts and another business's pages can
   * never leak through the shared API origin.
   */
  getPublicSite = async (req: Request, res: Response) => {
    const host = (req.query.host as string) || req.hostname;
    const tenant = await resolveTenantByHostname(host);
    if (!tenant) {
      res.status(404).json({ success: false, error: { code: 'TENANT_NOT_FOUND', message: 'No business is registered for this address' } });
      return;
    }

    const website = await db('websites')
      .where({ tenant_id: tenant.id, is_published: true })
      .orderBy('updated_at', 'desc')
      .first();
    const pages = website
      ? await db('pages')
        .where({ tenant_id: tenant.id, website_id: website.id, status: 'published' })
        .orderBy([{ column: 'is_homepage', order: 'desc' }, { column: 'created_at', order: 'asc' }])
      : [];
    const requestedSlug = String(req.query.page || '').trim();
    const page = requestedSlug
      ? pages.find((item: any) => item.slug === requestedSlug)
      : pages.find((item: any) => item.is_homepage) || pages[0];
    const branding = await getTenantBranding(tenant.id);

    res.json({
      success: true,
      data: {
        branding,
        website: website ? { id: website.id, name: website.name, theme: website.theme, seo: website.seo } : null,
        page: page || null,
        pages: pages.map((item: any) => ({ title: item.title, slug: item.slug, isHomepage: item.is_homepage })),
      },
    });
  };
}

/**
 * The CSS custom properties a tenant's theme maps onto.
 *
 * Exported so the same mapping can be produced on the server (for the public
 * site and for generated documents) and in the browser.
 */
export function cssVariables(branding: TenantBranding): Record<string, string> {
  return {
    '--brand-primary': branding.primaryColor,
    '--brand-secondary': branding.secondaryColor,
    '--brand-name': branding.businessName,
    ...(branding.fontFamily ? { '--brand-font': branding.fontFamily } : {}),
  };
}

/**
 * Renders the uploaded image into the sizes and formats the platform needs.
 *
 * SVG uploads are rasterised to PNG, so an uploaded file can never carry
 * active content into a page that renders it. Every variant is stored under
 * the tenant's own folder, so one business's logo can never overwrite
 * another's.
 */
async function renderVariants(
  buffer: Buffer,
  mimeType: string,
  outDir: string,
  stamp: string,
  tenantId: string,
): Promise<{ logo: string; favicon: string; appleTouchIcon: string }> {
  const safeInput = mimeType === 'image/svg+xml'
    ? await sharp(buffer, { density: 300 }).png().toBuffer()
    : buffer;

  const logoFile = `${stamp}-logo.png`;
  const faviconFile = `${stamp}-favicon.png`;
  const appleFile = `${stamp}-apple-touch-icon.png`;

  const logoDir = path.join(outDir, 'logo');
  const faviconDir = path.join(outDir, 'favicon');
  const iconDir = path.join(outDir, 'icon');
  await fs.mkdir(logoDir, { recursive: true });
  await fs.mkdir(faviconDir, { recursive: true });
  await fs.mkdir(iconDir, { recursive: true });

  await sharp(safeInput).resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true })
    .png({ quality: 90 }).toFile(path.join(logoDir, logoFile));
  await sharp(safeInput).resize({ width: 32, height: 32, fit: 'cover' })
    .png({ quality: 90 }).toFile(path.join(faviconDir, faviconFile));
  await sharp(safeInput).resize({ width: 180, height: 180, fit: 'inside', withoutEnlargement: true })
    .png({ quality: 90 }).toFile(path.join(iconDir, appleFile));

  return {
    logo: `/public/branding/${tenantId}/logo/${logoFile}`,
    favicon: `/public/branding/${tenantId}/favicon/${faviconFile}`,
    appleTouchIcon: `/public/branding/${tenantId}/icon/${appleFile}`,
  };
}

/** The multer middleware that receives a branding upload. */
export const brandingUpload = upload.single('file');
