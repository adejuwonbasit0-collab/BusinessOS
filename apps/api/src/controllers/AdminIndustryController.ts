import { Request, Response } from 'express';
import { db } from '../lib/database';
import { AppError, NotFoundError, ValidationError } from '../lib/errors';
import { AuditService } from '../services/index';
import { invalidateTenantCache } from '../services/TenantContextService';

/**
 * Super Admin control over the business catalogue.
 *
 * Everything the platform owner needs to manage the catalogue — adding
 * categories, creating sub-categories, editing descriptions, assigning icons,
 * configuring the recommended modules, deactivating obsolete entries — is
 * available here, without editing application source code.
 */
export class AdminIndustryController {
  // ── GET /admin/industries — the whole catalogue, including inactive ────
  listAll = async (req: Request, res: Response) => {
    const [categories, presets, dashboardPresets] = await Promise.all([
      db('industry_categories').orderBy('sort_order'),
      db('industry_presets').orderBy('sort_order').orderBy('name'),
      db('dashboard_presets').orderBy('sort_order'),
    ]);
    res.json({ success: true, data: { categories, presets, dashboardPresets } });
  };

  // ── POST /admin/industries — create a preset ────────────────────────────
  createPreset = async (req: Request, res: Response) => {
    const {
      key, name, icon, description, category, parentKey, defaultModules = [],
      terminologyOverrides = {}, searchKeywords = [], aliases = [],
      dashboardPresetKey, sortOrder,
    } = req.body || {};

    if (!key || !name) {
      throw new ValidationError([{ field: key ? 'name' : 'key', message: 'Both "key" and "name" are required' }]);
    }

    const existing = await db('industry_presets').where({ key }).first();
    if (existing) throw new AppError('An industry with this key already exists', 409, 'DUPLICATE_INDUSTRY');

    const [preset] = await db('industry_presets').insert({
      key, name, icon: icon || null, description: description || null,
      category: category || null, parent_key: parentKey || null,
      default_modules: defaultModules,
      terminology_overrides: JSON.stringify(terminologyOverrides || {}),
      search_keywords: searchKeywords, aliases: aliases || [],
      dashboard_preset_key: dashboardPresetKey || null,
      is_custom: false, is_active: true,
      sort_order: sortOrder ?? 0,
    } as any).returning('*');

    AuditService.log({ userId: req.user!.id, action: 'admin.industry.create', resourceType: 'industry_preset', resourceId: preset.key, newValues: preset, ip: req.ip });
    res.status(201).json({ success: true, data: { preset } });
  };

  // ── PATCH /admin/industries/:key — edit a preset ─────────────────────────
  updatePreset = async (req: Request, res: Response) => {
    const { key } = req.params;
    const existing = await db('industry_presets').where({ key }).first();
    if (!existing) throw new NotFoundError('Industry preset');

    const {
      name, icon, description, category, parentKey, defaultModules,
      terminologyOverrides, searchKeywords, aliases, dashboardPresetKey, sortOrder, isActive,
    } = req.body || {};

    const update: Record<string, any> = {};
    if (name !== undefined) update.name = name;
    if (icon !== undefined) update.icon = icon;
    if (description !== undefined) update.description = description;
    if (category !== undefined) update.category = category;
    if (parentKey !== undefined) update.parent_key = parentKey;
    if (defaultModules !== undefined) update.default_modules = defaultModules;
    if (terminologyOverrides !== undefined) update.terminology_overrides = JSON.stringify(terminologyOverrides || {});
    if (searchKeywords !== undefined) update.search_keywords = searchKeywords;
    if (aliases !== undefined) update.aliases = aliases;
    if (dashboardPresetKey !== undefined) update.dashboard_preset_key = dashboardPresetKey;
    if (sortOrder !== undefined) update.sort_order = sortOrder;
    if (isActive !== undefined) update.is_active = isActive === true;

    const [preset] = await db('industry_presets').where({ key }).update(update).returning('*');

    // A tenant that already uses this preset picks up the new modules and
    // terminology immediately.
    const affected = await db('tenants').where({ industry: key }).whereNull('deleted_at').pluck('id');
    for (const tenantId of affected) {
      await db('tenants').where({ id: tenantId }).update({
        enabled_modules: JSON.stringify(preset.default_modules || []),
        settings: db.raw('settings || ?::jsonb', [
          JSON.stringify({ terminologyOverrides: preset.terminology_overrides || {} }),
        ]),
      });
      await invalidateTenantCache(tenantId);
    }

    AuditService.log({ userId: req.user!.id, action: 'admin.industry.update', resourceType: 'industry_preset', resourceId: key, newValues: update, ip: req.ip });
    res.json({ success: true, data: { preset, affectedTenants: affected.length } });
  };

  // ── DELETE /admin/industries/:key — deactivate a preset ──────────────────
  deactivatePreset = async (req: Request, res: Response) => {
    const { key } = req.params;
    const existing = await db('industry_presets').where({ key }).first();
    if (!existing) throw new NotFoundError('Industry preset');

    // The preset is deactivated rather than deleted: tenants that already use
    // it keep their configuration and their history.
    await db('industry_presets').where({ key }).update({ is_active: false, updated_at: new Date() });

    AuditService.log({ userId: req.user!.id, action: 'admin.industry.deactivate', resourceType: 'industry_preset', resourceId: key, ip: req.ip });
    res.json({ success: true, data: { key, is_active: false } });
  };

  // ── POST /admin/industry-categories ──────────────────────────────────────
  createCategory = async (req: Request, res: Response) => {
    const { key, name, description, icon, sortOrder } = req.body || {};
    if (!key || !name) {
      throw new ValidationError([{ field: key ? 'name' : 'key', message: 'Both "key" and "name" are required' }]);
    }
    const existing = await db('industry_categories').where({ key }).first();
    if (existing) throw new AppError('A category with this key already exists', 409, 'DUPLICATE_CATEGORY');

    const [category] = await db('industry_categories').insert({
      key, name, description: description || null, icon: icon || null,
      sort_order: sortOrder ?? 0, is_active: true,
    } as any).returning('*');

    AuditService.log({ userId: req.user!.id, action: 'admin.industry_category.create', resourceType: 'industry_category', resourceId: key, ip: req.ip });
    res.status(201).json({ success: true, data: { category } });
  };

  // ── PATCH /admin/industry-categories/:key ────────────────────────────────
  updateCategory = async (req: Request, res: Response) => {
    const { key } = req.params;
    const existing = await db('industry_categories').where({ key }).first();
    if (!existing) throw new NotFoundError('Industry category');

    const { name, description, icon, sortOrder, isActive } = req.body || {};
    const update: Record<string, any> = {};
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (icon !== undefined) update.icon = icon;
    if (sortOrder !== undefined) update.sort_order = sortOrder;
    if (isActive !== undefined) update.is_active = isActive === true;

    const [category] = await db('industry_categories').where({ key }).update(update).returning('*');
    AuditService.log({ userId: req.user!.id, action: 'admin.industry_category.update', resourceType: 'industry_category', resourceId: key, newValues: update, ip: req.ip });
    res.json({ success: true, data: { category } });
  };

  // ── PATCH /admin/dashboard-presets/:key ──────────────────────────────────
  updateDashboardPreset = async (req: Request, res: Response) => {
    const { key } = req.params;
    const existing = await db('dashboard_presets').where({ key }).first();
    if (!existing) throw new NotFoundError('Dashboard preset');

    const { name, description, navigation, layout, isActive, sortOrder } = req.body || {};
    const update: Record<string, any> = {};
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (navigation !== undefined) update.navigation = JSON.stringify(navigation);
    if (layout !== undefined) update.layout = JSON.stringify(layout);
    if (isActive !== undefined) update.is_active = isActive === true;
    if (sortOrder !== undefined) update.sort_order = sortOrder;

    const [preset] = await db('dashboard_presets').where({ key }).update(update).returning('*');

    // Every tenant using this preset picks up the new navigation.
    const affected = await db('tenants').where({ dashboard_preset_key: key }).whereNull('deleted_at').pluck('id');
    for (const tenantId of affected) await invalidateTenantCache(tenantId);

    AuditService.log({ userId: req.user!.id, action: 'admin.dashboard_preset.update', resourceType: 'dashboard_preset', resourceId: key, newValues: update, ip: req.ip });
    res.json({ success: true, data: { preset, affectedTenants: affected.length } });
  };
}
