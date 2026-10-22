"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppBuilderController = void 0;
const database_1 = require("../lib/database");
const errors_1 = require("../lib/errors");
const index_1 = require("../services/index");
const AIService_1 = require("../services/AIService");
class AppBuilderController {
    // ── Portals ────────────────────────────────────────────────────────────────
    listPortals = async (req, res) => {
        const portals = await (0, database_1.db)('portals').where({ tenant_id: req.tenant.id }).whereNull('deleted_at').orderBy('created_at', 'desc');
        res.json({ success: true, data: { portals } });
    };
    createPortal = async (req, res) => {
        const tenantId = req.tenant.id;
        const { name, type = 'customer', description, theme } = req.body;
        if (!name)
            throw new errors_1.AppError('Portal name required', 400, 'MISSING_NAME');
        const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        const [portal] = await (0, database_1.db)('portals').insert({
            tenant_id: tenantId, created_by: req.user.id, name, slug: `${slug}-${Date.now()}`,
            type, description, theme: JSON.stringify(theme || {}),
        }).returning('*');
        // Auto-create a home page
        await (0, database_1.db)('portal_pages').insert({ portal_id: portal.id, name: 'Home', slug: '/', is_home: true, components: JSON.stringify([]) });
        index_1.AuditService.log({ tenantId, userId: req.user.id, action: 'portal.create', resourceId: portal.id, ip: req.ip });
        res.status(201).json({ success: true, data: { portal } });
    };
    getPortal = async (req, res) => {
        const { id } = req.params;
        const portal = await (0, database_1.db)('portals').where({ id, tenant_id: req.tenant.id }).whereNull('deleted_at').first();
        if (!portal)
            throw new errors_1.NotFoundError('Portal');
        const pages = await (0, database_1.db)('portal_pages').where({ portal_id: id }).orderBy('sort_order');
        res.json({ success: true, data: { portal, pages } });
    };
    updatePortal = async (req, res) => {
        const { id } = req.params;
        const portal = await (0, database_1.db)('portals').where({ id, tenant_id: req.tenant.id }).whereNull('deleted_at').first();
        if (!portal)
            throw new errors_1.NotFoundError('Portal');
        const allowed = {};
        for (const f of ['name', 'description', 'is_published', 'custom_domain']) {
            if (req.body[f] !== undefined)
                allowed[f] = req.body[f];
        }
        if (req.body.theme)
            allowed.theme = JSON.stringify(req.body.theme);
        if (req.body.settings)
            allowed.settings = JSON.stringify(req.body.settings);
        allowed.updated_at = new Date();
        const [updated] = await (0, database_1.db)('portals').where({ id }).update(allowed).returning('*');
        res.json({ success: true, data: { portal: updated } });
    };
    deletePortal = async (req, res) => {
        const { id } = req.params;
        const portal = await (0, database_1.db)('portals').where({ id, tenant_id: req.tenant.id }).whereNull('deleted_at').first();
        if (!portal)
            throw new errors_1.NotFoundError('Portal');
        await (0, database_1.db)('portals').where({ id }).update({ deleted_at: new Date() });
        res.json({ success: true, message: 'Portal deleted' });
    };
    // ── Portal pages ───────────────────────────────────────────────────────────
    savePage = async (req, res) => {
        const { portalId, pageId } = req.params;
        const { components, layout, name } = req.body;
        const existing = await (0, database_1.db)('portal_pages').where({ id: pageId, portal_id: portalId }).first();
        if (!existing)
            throw new errors_1.NotFoundError('Page');
        const update = { updated_at: new Date() };
        if (components !== undefined)
            update.components = JSON.stringify(components);
        if (layout !== undefined)
            update.layout = JSON.stringify(layout);
        if (name)
            update.name = name;
        await (0, database_1.db)('portal_pages').where({ id: pageId }).update(update);
        res.json({ success: true, message: 'Page saved' });
    };
    addPage = async (req, res) => {
        const { portalId } = req.params;
        const { name, slug } = req.body;
        const [page] = await (0, database_1.db)('portal_pages').insert({
            portal_id: portalId, name, slug: slug || `/${name.toLowerCase().replace(/\s+/g, '-')}`,
            components: JSON.stringify([]),
        }).returning('*');
        res.status(201).json({ success: true, data: { page } });
    };
    // ── AI portal generation ──────────────────────────────────────────────────
    generatePortalWithAI = async (req, res) => {
        const { portalType, description } = req.body;
        const tenant = req.tenant;
        const portalConfig = await AIService_1.AIService.generatePortalConfig(portalType, tenant.settings?.businessType || tenant.industry || 'business', description || '');
        // Create the portal and pages from AI config
        const slug = `${portalConfig.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
        const [portal] = await (0, database_1.db)('portals').insert({
            tenant_id: req.tenant.id, created_by: req.user.id,
            name: portalConfig.name, slug, type: portalType, description,
        }).returning('*');
        if (portalConfig.pages?.length) {
            await (0, database_1.db)('portal_pages').insert(portalConfig.pages.map((page, i) => ({
                portal_id: portal.id, name: page.name, slug: page.slug,
                is_home: i === 0, components: JSON.stringify(page.components || []),
                sort_order: i,
            })));
        }
        res.status(201).json({ success: true, data: { portal, config: portalConfig } });
    };
    // ── Form Builder ──────────────────────────────────────────────────────────
    listForms = async (req, res) => {
        const forms = await (0, database_1.db)('form_definitions')
            .where({ tenant_id: req.tenant.id }).whereNull('deleted_at')
            .orderBy('created_at', 'desc');
        res.json({ success: true, data: { forms } });
    };
    createForm = async (req, res) => {
        const tenantId = req.tenant.id;
        const { name, description, fields, settings } = req.body;
        if (!name)
            throw new errors_1.AppError('Form name required', 400, 'MISSING_NAME');
        const [form] = await (0, database_1.db)('form_definitions').insert({
            tenant_id: tenantId, created_by: req.user.id, name, description,
            fields: JSON.stringify(fields || []), settings: JSON.stringify(settings || {}),
        }).returning('*');
        res.status(201).json({ success: true, data: { form } });
    };
    updateForm = async (req, res) => {
        const { id } = req.params;
        const form = await (0, database_1.db)('form_definitions').where({ id, tenant_id: req.tenant.id }).whereNull('deleted_at').first();
        if (!form)
            throw new errors_1.NotFoundError('Form');
        const update = { updated_at: new Date() };
        for (const f of ['name', 'description', 'is_published', 'webhook_url']) {
            if (req.body[f] !== undefined)
                update[f] = req.body[f];
        }
        if (req.body.fields !== undefined)
            update.fields = JSON.stringify(req.body.fields);
        if (req.body.settings !== undefined)
            update.settings = JSON.stringify(req.body.settings);
        const [updated] = await (0, database_1.db)('form_definitions').where({ id }).update(update).returning('*');
        res.json({ success: true, data: { form: updated } });
    };
    deleteForm = async (req, res) => {
        const { id } = req.params;
        await (0, database_1.db)('form_definitions').where({ id, tenant_id: req.tenant.id }).update({ deleted_at: new Date() });
        res.json({ success: true, message: 'Form deleted' });
    };
    submitForm = async (req, res) => {
        const { id } = req.params;
        const form = await (0, database_1.db)('form_definitions').where({ id, tenant_id: req.tenant.id, is_published: true }).whereNull('deleted_at').first();
        if (!form)
            throw new errors_1.NotFoundError('Form');
        const [submission] = await (0, database_1.db)('form_submissions').insert({
            form_id: id, tenant_id: req.tenant.id, data: JSON.stringify(req.body),
            submitter_email: req.body.email || null, ip_address: req.ip,
        }).returning('*');
        await (0, database_1.db)('form_definitions').where({ id }).update({ submission_count: database_1.db.raw('submission_count + 1') });
        // Fire workflow trigger if configured
        const { WorkflowEngine } = await Promise.resolve().then(() => __importStar(require('../services/WorkflowEngine')));
        WorkflowEngine.trigger(req.tenant.id, 'form.submitted', { formId: id, ...req.body }).catch(() => { });
        res.status(201).json({ success: true, data: { submissionId: submission.id } });
    };
    getFormSubmissions = async (req, res) => {
        const { id } = req.params;
        const submissions = await (0, database_1.db)('form_submissions').where({ form_id: id, tenant_id: req.tenant.id }).orderBy('created_at', 'desc').limit(100);
        res.json({ success: true, data: { submissions } });
    };
    generateFormWithAI = async (req, res) => {
        const { purpose } = req.body;
        if (!purpose)
            throw new errors_1.AppError('Purpose required', 400, 'MISSING_PURPOSE');
        const tenant = req.tenant;
        const businessType = tenant.settings?.businessType || tenant.industry || 'business';
        const formConfig = await AIService_1.AIService.generateForms(businessType, purpose);
        const [form] = await (0, database_1.db)('form_definitions').insert({
            tenant_id: req.tenant.id, created_by: req.user.id,
            name: formConfig.name, description: formConfig.purpose,
            fields: JSON.stringify(formConfig.fields || []),
        }).returning('*');
        res.status(201).json({ success: true, data: { form, config: formConfig } });
    };
    // ── Custom Tables (No-Code Database Builder) ──────────────────────────────
    listTables = async (req, res) => {
        const tables = await (0, database_1.db)('custom_tables').where({ tenant_id: req.tenant.id }).whereNull('deleted_at').orderBy('name');
        res.json({ success: true, data: { tables } });
    };
    createTable = async (req, res) => {
        const tenantId = req.tenant.id;
        const { name, label, fields } = req.body;
        if (!name)
            throw new errors_1.AppError('Table name required', 400, 'MISSING_NAME');
        const [table] = await (0, database_1.db)('custom_tables').insert({
            tenant_id: tenantId, created_by: req.user.id,
            name: name.toLowerCase().replace(/[^a-z0-9_]/g, '_'), label: label || name,
            fields: JSON.stringify(fields || []),
        }).returning('*');
        index_1.AuditService.log({ tenantId, userId: req.user.id, action: 'custom_table.create', resourceId: table.id, ip: req.ip });
        res.status(201).json({ success: true, data: { table } });
    };
    updateTable = async (req, res) => {
        const { id } = req.params;
        const table = await (0, database_1.db)('custom_tables').where({ id, tenant_id: req.tenant.id }).whereNull('deleted_at').first();
        if (!table)
            throw new errors_1.NotFoundError('Table');
        const update = { updated_at: new Date() };
        if (req.body.label)
            update.label = req.body.label;
        if (req.body.fields !== undefined)
            update.fields = JSON.stringify(req.body.fields);
        if (req.body.views !== undefined)
            update.views = JSON.stringify(req.body.views);
        const [updated] = await (0, database_1.db)('custom_tables').where({ id }).update(update).returning('*');
        res.json({ success: true, data: { table: updated } });
    };
    deleteTable = async (req, res) => {
        const { id } = req.params;
        await (0, database_1.db)('custom_tables').where({ id, tenant_id: req.tenant.id }).update({ deleted_at: new Date() });
        res.json({ success: true, message: 'Table deleted' });
    };
    // ── Custom Table Records ──────────────────────────────────────────────────
    listRecords = async (req, res) => {
        const { tableId } = req.params;
        const { limit = 100, offset = 0 } = req.query;
        const records = await (0, database_1.db)('custom_records').where({ table_id: tableId, tenant_id: req.tenant.id }).whereNull('deleted_at').orderBy('created_at', 'desc').limit(parseInt(limit)).offset(parseInt(offset));
        const [{ count }] = await (0, database_1.db)('custom_records').where({ table_id: tableId, tenant_id: req.tenant.id }).whereNull('deleted_at').count('id as count');
        res.json({ success: true, data: { records, total: parseInt(count) } });
    };
    createRecord = async (req, res) => {
        const { tableId } = req.params;
        const [record] = await (0, database_1.db)('custom_records').insert({
            table_id: tableId, tenant_id: req.tenant.id, created_by: req.user.id, data: JSON.stringify(req.body.data || {}),
        }).returning('*');
        res.status(201).json({ success: true, data: { record } });
    };
    updateRecord = async (req, res) => {
        const { tableId, recordId } = req.params;
        const record = await (0, database_1.db)('custom_records').where({ id: recordId, table_id: tableId, tenant_id: req.tenant.id }).whereNull('deleted_at').first();
        if (!record)
            throw new errors_1.NotFoundError('Record');
        await (0, database_1.db)('custom_records').where({ id: recordId }).update({ data: JSON.stringify(req.body.data || {}), updated_at: new Date() });
        res.json({ success: true, message: 'Record updated' });
    };
    deleteRecord = async (req, res) => {
        const { tableId, recordId } = req.params;
        await (0, database_1.db)('custom_records').where({ id: recordId, table_id: tableId, tenant_id: req.tenant.id }).update({ deleted_at: new Date() });
        res.json({ success: true, message: 'Record deleted' });
    };
}
exports.AppBuilderController = AppBuilderController;
//# sourceMappingURL=AppBuilderController.js.map