"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndustryController = void 0;
const database_1 = require("../lib/database");
const errors_1 = require("../lib/errors");
const index_1 = require("../services/index");
const validation_1 = require("../lib/validation");
class IndustryController {
    // ── GET /industries — list all built-in presets ──────────────────────────
    listPresets = async (req, res) => {
        const presets = await (0, database_1.db)('industry_presets').where({ is_custom: false }).orderBy('name');
        res.json({ success: true, data: { presets } });
    };
    // ── GET /industries/modules — full module catalog ────────────────────────
    listModules = async (req, res) => {
        const modules = await (0, database_1.db)('module_registry').orderBy('category');
        res.json({ success: true, data: { modules } });
    };
    // ── POST /industries/select — apply a preset to the tenant ───────────────
    selectIndustry = async (req, res) => {
        const tenantId = req.tenant.id;
        const { industryKey } = req.body;
        const preset = await (0, database_1.db)('industry_presets').where({ key: industryKey, is_custom: false }).first();
        if (!preset)
            throw new errors_1.AppError('Unknown industry preset', 404, 'INDUSTRY_NOT_FOUND');
        await (0, database_1.db)('tenants').where({ id: tenantId }).update({
            industry: industryKey,
            enabled_modules: JSON.stringify(preset.default_modules),
            settings: database_1.db.raw(`settings || ?::jsonb`, [JSON.stringify({ terminologyOverrides: preset.terminology_overrides })]),
        });
        index_1.AuditService.log({ tenantId, userId: req.user.id, action: 'industry.select', resourceType: 'tenant', resourceId: tenantId, newValues: { industry: industryKey }, ip: req.ip });
        const updated = await (0, database_1.db)('tenants').where({ id: tenantId }).first();
        res.json({ success: true, data: { tenant: updated, preset } });
    };
    // ── POST /industries/custom — define a custom industry ───────────────────
    createCustomIndustry = async (req, res) => {
        const tenantId = req.tenant.id;
        const { name, enabledModules = [], terminologyOverrides = {} } = req.body;
        const existing = await (0, database_1.db)('custom_industries').where({ tenant_id: tenantId, name }).first();
        if (existing)
            throw new errors_1.AppError('A custom industry with this name already exists', 409, 'DUPLICATE_INDUSTRY');
        const [custom] = await (0, database_1.db)('custom_industries').insert({
            tenant_id: tenantId, name, enabled_modules: enabledModules, terminology_overrides: (0, validation_1.toJsonb)(terminologyOverrides),
        }).returning('*');
        await (0, database_1.db)('tenants').where({ id: tenantId }).update({
            industry: `custom:${custom.id}`, enabled_modules: JSON.stringify(enabledModules),
            settings: database_1.db.raw(`settings || ?::jsonb`, [JSON.stringify({ terminologyOverrides })]),
        });
        res.status(201).json({ success: true, data: { customIndustry: custom } });
    };
    // ── PATCH /industries/modules — manually toggle individual modules ───────
    toggleModule = async (req, res) => {
        const tenantId = req.tenant.id;
        const { moduleKey, enabled } = req.body;
        const moduleEntry = await (0, database_1.db)('module_registry').where({ key: moduleKey }).first();
        if (!moduleEntry)
            throw new errors_1.AppError('Unknown module', 404, 'MODULE_NOT_FOUND');
        if (moduleEntry.is_core && !enabled)
            throw new errors_1.AppError(`"${moduleEntry.name}" is a core module and cannot be disabled`, 400, 'CORE_MODULE');
        const tenant = await (0, database_1.db)('tenants').where({ id: tenantId }).first();
        let modules = tenant.enabled_modules || [];
        if (enabled) {
            // Check dependencies
            for (const dep of moduleEntry.depends_on || []) {
                if (!modules.includes(dep))
                    modules.push(dep);
            }
            if (!modules.includes(moduleKey))
                modules.push(moduleKey);
        }
        else {
            modules = modules.filter((m) => m !== moduleKey);
        }
        await (0, database_1.db)('tenants').where({ id: tenantId }).update({ enabled_modules: JSON.stringify(modules) });
        res.json({ success: true, data: { enabledModules: modules } });
    };
    // ── GET /industries/current — current tenant's active config ─────────────
    getCurrentConfig = async (req, res) => {
        const tenant = req.tenant;
        let presetInfo = null;
        if (tenant.industry && !tenant.industry.startsWith('custom:')) {
            presetInfo = await (0, database_1.db)('industry_presets').where({ key: tenant.industry }).first();
        }
        else if (tenant.industry?.startsWith('custom:')) {
            const customId = tenant.industry.replace('custom:', '');
            presetInfo = await (0, database_1.db)('custom_industries').where({ id: customId }).first();
        }
        res.json({
            success: true,
            data: {
                industry: tenant.industry,
                enabledModules: tenant.enabled_modules || [],
                preset: presetInfo,
                terminologyOverrides: tenant.settings?.terminologyOverrides || {},
            },
        });
    };
}
exports.IndustryController = IndustryController;
//# sourceMappingURL=IndustryController.js.map