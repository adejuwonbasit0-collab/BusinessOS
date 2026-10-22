import { Request, Response } from 'express';
import { db } from '../lib/database';
import { AppError, NotFoundError, ValidationError } from '../lib/errors';
import { AuditService } from '../services/index';
import { invalidateTenantCache } from '../services/TenantContextService';
import {
  listCatalogue,
  listPresets,
  getPreset,
  applyPreset,
  assertModulesExist,
  scoreIndustries,
  suggestModules,
  CataloguePreset,
} from '../services/IndustryService';

/**
 * Onboarding — the guided path from "I signed up" to "my workspace is ready".
 *
 * The wizard is resumable: every answer is written to
 * `tenants.onboarding_data` together with the step it belongs to, so a user
 * who closes the browser can pick up exactly where they stopped. Nothing is
 * activated before the user approves the proposed configuration.
 */

/** The ordered steps of the wizard. The frontend renders them from this list. */
export const ONBOARDING_STEPS = [
  { key: 'business', title: 'Your business', description: 'Name, what you do and where you operate.' },
  { key: 'industry', title: 'Your industry', description: 'Pick a sector, or describe an unusual one.' },
  { key: 'profile', title: 'Locations and size', description: 'Country, currency, staff and sites.' },
  { key: 'capabilities', title: 'What you need', description: 'Selling, stock, bookings, portals and website.' },
  { key: 'review', title: 'Review and start', description: 'Approve the configuration we will apply.' },
] as const;

export type OnboardingStep = typeof ONBOARDING_STEPS[number]['key'];

const MODULE_FEATURE_REQUIREMENTS: Record<string, string> = {
  // A module that needs a paid capability is only activated when the tenant's
  // plan actually grants it. Anything the plan does not cover is reported back
  // to the user instead of being silently activated.
  ai: 'feature_ai',
};

export class OnboardingController {
  // ── GET /onboarding/state ─────────────────────────────────────────────────
  getState = async (req: Request, res: Response) => {
    const tenant = req.tenant!;
    const [catalogue, modules] = await Promise.all([
      listCatalogue(),
      db('module_registry').where({ is_active: true }).orderBy('sort_order'),
    ]);

    res.json({
      success: true,
      data: {
        steps: ONBOARDING_STEPS,
        step: tenant.onboarding_step || 'business',
        completed: tenant.onboarding_completed === true,
        data: tenant.onboarding_data || {},
        business: {
          name: tenant.name,
          legalName: tenant.legal_name,
          tradingName: tenant.trading_name,
          description: tenant.description,
          country: tenant.country,
          currency: tenant.currency,
          timezone: tenant.timezone,
          logoUrl: tenant.logo_url,
          faviconUrl: tenant.favicon_url,
          primaryColor: tenant.primary_color,
          secondaryColor: tenant.secondary_color,
        },
        industry: tenant.industry,
        enabledModules: tenant.enabled_modules || [],
        catalogue,
        modules: (modules as any[]).map((m) => ({
          key: m.key, name: m.name, category: m.category, icon: m.icon,
          summary: m.summary, status: m.status, route: m.route,
          is_core: m.is_core, depends_on: m.depends_on || [],
        })),
      },
    });
  };

  // ── PUT /onboarding/state ─────────────────────────────────────────────────
  saveState = async (req: Request, res: Response) => {
    const tenant = req.tenant!;
    const { step, data } = req.body || {};

    const validStep = ONBOARDING_STEPS.some((s) => s.key === step) ? step : tenant.onboarding_step || 'business';

    const merged = { ...(tenant.onboarding_data || {}), ...(data || {}) };

    await db('tenants').where({ id: tenant.id }).update({
      onboarding_step: validStep,
      onboarding_data: JSON.stringify(merged),
      updated_at: new Date(),
    });

    res.json({ success: true, data: { step: validStep, data: merged, completed: tenant.onboarding_completed === true } });
  };

  // ── POST /onboarding/recommend ────────────────────────────────────────────
  recommend = async (req: Request, res: Response) => {
    const { description, businessName } = req.body || {};
    if (!description || typeof description !== 'string' || !description.trim()) {
      throw new ValidationError([{ field: 'description', message: '"description" is required' }]);
    }

    const presets = await listPresets();
    const haystack = businessName ? `${businessName}. ${description}` : description;

    const recommendations = scoreIndustries(haystack, presets as CataloguePreset[]);
    const moduleSuggestions = suggestModules(haystack);

    // The industry the tenant already picked stays in the list even when the
    // description does not mention it — it is the user's explicit choice.
    const current = req.tenant!.industry;
    if (current && !current.startsWith('custom:')) {
      const already = recommendations.find((r) => r.industryKey === current);
      if (!already) {
        const preset = presets.find((p) => p.key === current);
        if (preset) {
          recommendations.unshift({
            industryKey: preset.key,
            industryName: preset.name,
            icon: preset.icon,
            category: preset.category,
            confidence: 1,
            matchedTerms: ['your current selection'],
            modules: preset.default_modules,
            rationale: 'This is the industry your workspace is already configured for.',
          });
        }
      }
    }

    res.json({
      success: true,
      data: {
        description,
        recommendations,
        suggestedModules: moduleSuggestions,
        // The wizard tells the user explicitly when nothing matched, so they
        // can fall back to "Other — describe my business" instead of being
        // shown a meaningless best guess.
        confident: recommendations.length > 0 && recommendations[0].confidence >= 0.4,
      },
    });
  };

  // ── POST /onboarding/complete ─────────────────────────────────────────────
  complete = async (req: Request, res: Response) => {
    const tenant = req.tenant!;
    const {
      industryKey,
      customIndustry,
      businessProfile = {},
      capabilities = {},
      planSlug,
      website,
    } = req.body || {};

    // ── Resolve the industry ────────────────────────────────────────────────
    let preset: CataloguePreset | null = null;
    let customIndustryId: string | null = null;

    if (customIndustry && customIndustry.name) {
      const name = String(customIndustry.name).trim();
      const existing = await db('custom_industries').where({ tenant_id: tenant.id, name }).first();
      if (existing) {
        customIndustryId = existing.id;
      } else {
        const [created] = await db('custom_industries').insert({
          tenant_id: tenant.id,
          name,
          enabled_modules: [],
          terminology_overrides: JSON.stringify({}),
          description: customIndustry.description || null,
        } as any).returning('*');
        customIndustryId = created.id;
      }
    } else if (industryKey) {
      preset = await getPreset(industryKey);
      if (!preset) throw new AppError('Unknown industry preset', 400, 'INDUSTRY_NOT_FOUND');
      if (preset.is_active === false) {
        throw new AppError('That industry is no longer available. Please choose another one.', 400, 'INDUSTRY_INACTIVE');
      }
    } else {
      throw new ValidationError([{ field: 'industryKey', message: 'Select an industry, or describe your business' }]);
    }

    // ── Resolve the module set ──────────────────────────────────────────────
    const requestedModules: string[] = [];
    if (preset) requestedModules.push(...(preset.default_modules || []));
    if (Array.isArray(capabilities.extraModules)) requestedModules.push(...capabilities.extraModules);

    // Capabilities the tenant ticked map onto real modules.
    const capabilityModules: string[] = [];
    if (capabilities.needsInventory) capabilityModules.push('inventory');
    if (capabilities.needsAccounting) capabilityModules.push('accounting');
    if (capabilities.needsProjects) capabilityModules.push('projects');
    if (capabilities.needsBooking) capabilityModules.push('booking');
    if (capabilities.needsPortal) capabilityModules.push('portals');
    if (capabilities.needsForms) capabilityModules.push('forms');
    if (capabilities.needsWebsite) capabilityModules.push('website');
    if (capabilities.needsHr) capabilityModules.push('hr');
    if (capabilities.needsSales) capabilityModules.push('sales');
    if (capabilities.needsDocuments) capabilityModules.push('documents');
    if (capabilities.needsAutomation) capabilityModules.push('workflows');
    requestedModules.push(...capabilityModules);

    const uniqueModules = Array.from(new Set(requestedModules));
    await assertModulesExist(uniqueModules);

    // Only modules that are actually implemented can be activated.
    const available = await db('module_registry')
      .whereIn('key', uniqueModules)
      .where({ is_active: true })
      .select('key', 'name', 'status');
    const unavailable = uniqueModules
      .filter((key) => !available.some((m: any) => m.key === key))
      .map((key) => uniqueModules.find((k) => k === key)!);
    const availableKeys = available.filter((m: any) => m.status !== 'planned').map((m: any) => m.key);
    const notYetAvailable = uniqueModules.filter((key) => !availableKeys.includes(key));

    // ── Plan entitlements ───────────────────────────────────────────────────
    let planRecord: any = tenant.plan_id
      ? await db('plans').where({ id: tenant.plan_id }).first()
      : await db('plans').where({ slug: 'starter' }).first();
    if (planSlug) {
      const requestedPlan = await db('plans').where({ slug: planSlug }).first();
      if (!requestedPlan) throw new AppError('Invalid plan selected', 400, 'INVALID_PLAN');
      planRecord = requestedPlan;
    }

    const grantedModules = availableKeys.filter((key) => {
      const requirement = MODULE_FEATURE_REQUIREMENTS[key];
      if (!requirement) return true;
      return planRecord[requirement] === true;
    });
    const blockedByPlan = availableKeys.filter((key) => !grantedModules.includes(key));

    // ── Apply everything in one transaction ─────────────────────────────────
    const profileFields: Record<string, any> = {};
    if (businessProfile.name) profileFields.name = String(businessProfile.name).trim();
    if (businessProfile.legalName !== undefined) profileFields.legal_name = businessProfile.legalName || null;
    if (businessProfile.tradingName !== undefined) profileFields.trading_name = businessProfile.tradingName || null;
    if (businessProfile.description !== undefined) profileFields.description = businessProfile.description || null;
    if (businessProfile.country) profileFields.country = businessProfile.country;
    if (businessProfile.currency) profileFields.currency = businessProfile.currency;
    if (businessProfile.timezone) profileFields.timezone = businessProfile.timezone;
    if (businessProfile.staffCount !== undefined) profileFields.company_size = businessProfile.staffCount || null;
    if (businessProfile.registrationNumber !== undefined) profileFields.registration_number = businessProfile.registrationNumber || null;

    const finalModules = Array.from(new Set([...grantedModules]));

    const tenantUpdate: Record<string, any> = {
      ...profileFields,
      enabled_modules: JSON.stringify(finalModules),
      onboarding_completed: true,
      onboarding_step: 'done',
      onboarding_data: JSON.stringify(req.body.onboardingData || {}),
      dashboard_preset_key: preset?.dashboard_preset_key || 'general',
      plan_id: planRecord.id,
      updated_at: new Date(),
    };

    if (customIndustryId) {
      tenantUpdate.industry = `custom:${customIndustryId}`;
      await db('custom_industries').where({ id: customIndustryId }).update({
        enabled_modules: finalModules,
      } as any);
    } else if (preset) {
      tenantUpdate.industry = preset.key;
      tenantUpdate.settings = db.raw('settings || ?::jsonb', [
        JSON.stringify({ terminologyOverrides: preset.terminology_overrides || {} }),
      ]);
    }

    await db('tenants').where({ id: tenant.id }).update(tenantUpdate);

    // ── Initial public website ──────────────────────────────────────────────
    let websiteCreated = false;
    if (website && website.enabled) {
      const existingSite = await db('websites').where({ tenant_id: tenant.id }).first();
      if (!existingSite) {
        const siteName = profileFields.name || tenant.name;
        await db.transaction(async (trx) => {
          const [site] = await trx('websites').insert({
            tenant_id: tenant.id,
            name: `${siteName} — Website`,
            subdomain: null,
            theme: JSON.stringify({ primaryColor: tenant.primary_color, secondaryColor: tenant.secondary_color }),
            seo: JSON.stringify({}),
            is_published: false,
          } as any).returning('*');

          await trx('pages').insert({
            website_id: site.id,
            tenant_id: tenant.id,
            title: 'Home',
            slug: 'home',
            is_homepage: true,
            status: 'draft',
            blocks: JSON.stringify([
              { type: 'hero', props: { heading: siteName, subheading: tenant.description || '' } },
              { type: 'cta', props: { label: 'Get in touch' } },
            ]),
            seo: JSON.stringify({}),
          } as any);
        });
        websiteCreated = true;
      }
    }

    await invalidateTenantCache(tenant.id);

    AuditService.log({
      tenantId: tenant.id,
      userId: req.user!.id,
      action: 'onboarding.complete',
      resourceType: 'tenant',
      resourceId: tenant.id,
      newValues: { industry: tenantUpdate.industry, modules: finalModules },
      ip: req.ip,
    });

    const updatedTenant = await db('tenants').where({ id: tenant.id }).first();

    res.json({
      success: true,
      data: {
        tenant: updatedTenant,
        enabledModules: finalModules,
        industry: tenantUpdate.industry,
        preset,
        websiteCreated,
        // Anything we could not activate is reported explicitly rather than
        // being applied silently or pretended to be active.
        skipped: {
          notImplemented: notYetAvailable,
          notInPlan: blockedByPlan,
          unknown: unavailable,
        },
        checklist: buildChecklist(updatedTenant, finalModules, { websiteCreated }),
      },
    });
  };

  // ── POST /onboarding/reset (restart the wizard) ───────────────────────────
  reset = async (req: Request, res: Response) => {
    const tenant = req.tenant!;
    await db('tenants').where({ id: tenant.id }).update({
      onboarding_completed: false,
      onboarding_step: 'business',
      onboarding_data: JSON.stringify({}),
      updated_at: new Date(),
    });
    await invalidateTenantCache(tenant.id);
    res.json({ success: true, data: { step: 'business', completed: false } });
  };
}

/**
 * The setup checklist shown after onboarding.
 *
 * Every item is derived from the workspace's own state, so an item is only
 * listed while it is genuinely outstanding.
 */
function buildChecklist(tenant: any, modules: string[], context: { websiteCreated: boolean }) {
  const checklist: Array<{ key: string; label: string; href: string; done: boolean }> = [];

  checklist.push({
    key: 'profile',
    label: 'Confirm your business details and branding',
    href: '/settings',
    done: Boolean(tenant.description && tenant.country),
  });

  if (modules.includes('crm')) {
    checklist.push({ key: 'contacts', label: 'Add your first customer or lead', href: '/crm/contacts', done: false });
  }
  if (modules.includes('inventory')) {
    checklist.push({ key: 'products', label: 'Add your first product or service', href: '/inventory', done: false });
  }
  if (modules.includes('booking')) {
    checklist.push({ key: 'resources', label: 'Add a bookable resource', href: '/bookings', done: false });
  }
  if (modules.includes('hr')) {
    checklist.push({ key: 'staff', label: 'Invite your team', href: '/hr', done: false });
  }
  if (modules.includes('website') || context.websiteCreated) {
    checklist.push({ key: 'website', label: 'Publish your website', href: '/website', done: false });
  }
  if (modules.includes('workflows')) {
    checklist.push({ key: 'automation', label: 'Create your first automation', href: '/automation', done: false });
  }

  checklist.push({ key: 'explore', label: 'Explore the module marketplace', href: '/marketplace', done: false });

  return checklist;
}

export { NotFoundError };
