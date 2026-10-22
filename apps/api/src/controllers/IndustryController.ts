import { Request, Response } from 'express';
import { db } from '../lib/database';
import { AppError } from '../lib/errors';
import { AuditService } from '../services/index';
import { toJsonb } from '../lib/validation';
import { invalidateTenantCache } from '../services/TenantContextService';
import {
  listCatalogue,
  listPresets,
  getPreset,
  applyPreset,
  assertModulesExist,
} from '../services/IndustryService';

export class IndustryController {
  // ── GET /industries — the catalogue, optionally filtered ────────────────
  listPresets = async (req: Request, res: Response) => {
    const { search, category } = req.query as any;
    const presets = await listPresets({ search, category });
    res.json({ success: true, data: { presets } });
  };

  // ── GET /industries/categories — the catalogue grouped for the wizard ───
  listCategories = async (req: Request, res: Response) => {
    const { search, category } = req.query as any;
    const catalogue = await listCatalogue({ search, category });
    res.json({ success: true, data: catalogue });
  };

  // ── GET /industries/modules — full module catalog ────────────────────────
  listModules = async (req: Request, res: Response) => {
    const modules = await db('module_registry').where({ is_active: true }).orderBy('sort_order').orderBy('category');
    res.json({ success: true, data: { modules } });
  };

  // ── POST /industries/select — apply a preset to the tenant ───────────────
  selectIndustry = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { industryKey, modules, additionalModules } = req.body;

    const preset = await getPreset(industryKey);
    if (!preset) throw new AppError('Unknown industry preset', 404, 'INDUSTRY_NOT_FOUND');
    if (preset.is_active === false) {
      throw new AppError('That industry is no longer available. Please choose another one.', 400, 'INDUSTRY_INACTIVE');
    }

    if (modules) await assertModulesExist(modules);

    const enabledModules = await applyPreset(tenantId, preset, { modules, additionalModules });
    await invalidateTenantCache(tenantId);

    AuditService.log({ tenantId, userId: req.user!.id, action: 'industry.select', resourceType: 'tenant', resourceId: tenantId, newValues: { industry: industryKey, modules: enabledModules }, ip: req.ip });

    const updated = await db('tenants').where({ id: tenantId }).first();
    res.json({ success: true, data: { tenant: updated, preset, enabledModules } });
  };

  // ── POST /industries/custom — define a custom industry ───────────────────
  createCustomIndustry = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { name, description, enabledModules = [], terminologyOverrides = {} } = req.body;

    const existing = await db('custom_industries').where({ tenant_id: tenantId, name }).first();
    if (existing) throw new AppError('A custom industry with this name already exists', 409, 'DUPLICATE_INDUSTRY');

    await assertModulesExist(enabledModules);

    const [custom] = await db('custom_industries').insert({
      tenant_id: tenantId, name, enabled_modules: enabledModules, terminology_overrides: toJsonb(terminologyOverrides),
      description: description || null,
    } as any).returning('*');

    await db('tenants').where({ id: tenantId }).update({
      industry: `custom:${custom.id}`, enabled_modules: JSON.stringify(enabledModules),
      settings: db.raw(`settings || ?::jsonb`, [JSON.stringify({ terminologyOverrides })]),
    });
    await invalidateTenantCache(tenantId);

    res.status(201).json({ success: true, data: { customIndustry: custom } });
  };

  // ── PATCH /industries/modules — manually toggle individual modules ───────
  toggleModule = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { moduleKey, enabled } = req.body;

    const moduleEntry = await db('module_registry').where({ key: moduleKey, is_active: true }).first();
    if (!moduleEntry) throw new AppError('Unknown module', 404, 'MODULE_NOT_FOUND');
    if (moduleEntry.is_core && !enabled) throw new AppError(`"${moduleEntry.name}" is a core module and cannot be disabled`, 400, 'CORE_MODULE');

    const tenant = await db('tenants').where({ id: tenantId }).first();
    let modules: string[] = tenant.enabled_modules || [];

    if (enabled) {
      // Check dependencies
      for (const dep of moduleEntry.depends_on || []) {
        if (!modules.includes(dep)) modules.push(dep);
      }
      if (!modules.includes(moduleKey)) modules.push(moduleKey);
    } else {
      modules = modules.filter((m) => m !== moduleKey);
    }

    await db('tenants').where({ id: tenantId }).update({ enabled_modules: JSON.stringify(modules) });
    await invalidateTenantCache(tenantId);
    res.json({ success: true, data: { enabledModules: modules } });
  };

  // ── GET /industries/current — current tenant's active config ─────────────
  getCurrentConfig = async (req: Request, res: Response) => {
    const tenant = req.tenant!;
    let presetInfo = null;

    if (tenant.industry && !tenant.industry.startsWith('custom:')) {
      presetInfo = await db('industry_presets').where({ key: tenant.industry }).first();
    } else if (tenant.industry?.startsWith('custom:')) {
      const customId = tenant.industry.replace('custom:', '');
      presetInfo = await db('custom_industries').where({ id: customId }).first();
    }

    res.json({
      success: true,
      data: {
        industry: tenant.industry,
        enabledModules: tenant.enabled_modules || [],
        preset: presetInfo,
        dashboardPresetKey: tenant.dashboard_preset_key || 'general',
        terminologyOverrides: tenant.settings?.terminologyOverrides || {},
      },
    });
  };
}
