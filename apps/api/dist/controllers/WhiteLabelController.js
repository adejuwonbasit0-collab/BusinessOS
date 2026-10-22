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
exports.WhiteLabelController = void 0;
const database_1 = require("../lib/database");
const errors_1 = require("../lib/errors");
const index_1 = require("../services/index");
class WhiteLabelController {
    getConfig = async (req, res) => {
        const config = await (0, database_1.db)('white_label_configs').where({ tenant_id: req.tenant.id }).first();
        res.json({ success: true, data: { config: config || null } });
    };
    saveConfig = async (req, res) => {
        const tenantId = req.tenant.id;
        if (!req.tenant.feature_white_label) {
            throw new errors_1.AppError('White label is not available on your current plan. Please upgrade to Enterprise.', 403, 'FEATURE_NOT_AVAILABLE');
        }
        const { brandName, brandLogoUrl, brandFaviconUrl, primaryColor, secondaryColor, customDomain, supportEmail, supportPhone, termsUrl, privacyUrl, emailSettings, smtpSettings, hidePoweredBy, } = req.body;
        const existing = await (0, database_1.db)('white_label_configs').where({ tenant_id: tenantId }).first();
        const data = {
            brand_name: brandName || req.tenant.name,
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
            [config] = await (0, database_1.db)('white_label_configs').where({ tenant_id: tenantId }).update({ ...data, updated_at: new Date() }).returning('*');
        }
        else {
            [config] = await (0, database_1.db)('white_label_configs').insert({ tenant_id: tenantId, ...data }).returning('*');
        }
        index_1.AuditService.log({ tenantId, userId: req.user.id, action: 'white_label.save', ip: req.ip });
        res.json({ success: true, data: { config } });
    };
    previewBranding = async (req, res) => {
        const config = await (0, database_1.db)('white_label_configs').where({ tenant_id: req.tenant.id }).first();
        const tenant = req.tenant;
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
    listResellers = async (req, res) => {
        // Tenants where this tenant's ID is the reseller_parent (conceptually stored in settings)
        const tenantId = req.tenant.id;
        const resellers = await (0, database_1.db)('tenants').whereRaw(`settings->>'resellerParentId' = ?`, [tenantId]).whereNull('deleted_at');
        res.json({ success: true, data: { resellers } });
    };
    createReseller = async (req, res) => {
        const tenantId = req.tenant.id;
        if (!req.tenant.feature_white_label)
            throw new errors_1.AppError('White label required for reseller accounts', 403, 'FEATURE_NOT_AVAILABLE');
        const { businessName, ownerEmail, ownerFirstName, ownerLastName, plan = 'starter' } = req.body;
        const planRecord = await (0, database_1.db)('plans').where({ slug: plan }).first();
        if (!planRecord)
            throw new errors_1.AppError('Invalid plan', 400, 'INVALID_PLAN');
        const { TenantService } = await Promise.resolve().then(() => __importStar(require('../services/index')));
        const slug = await TenantService.generateUniqueSlug(businessName);
        const bcrypt = await Promise.resolve().then(() => __importStar(require('bcryptjs')));
        const crypto = await Promise.resolve().then(() => __importStar(require('crypto')));
        const tempPassword = crypto.randomBytes(12).toString('hex');
        const passwordHash = await bcrypt.hash(tempPassword, 12);
        const [newTenant] = await (0, database_1.db)('tenants').insert({
            name: businessName, slug, subdomain: slug, plan_id: planRecord.id, status: 'active',
            settings: JSON.stringify({ resellerParentId: tenantId }),
        }).returning('*');
        const [owner] = await (0, database_1.db)('users').insert({
            tenant_id: newTenant.id, email: ownerEmail, password_hash: passwordHash,
            first_name: ownerFirstName, last_name: ownerLastName, role: 'owner', status: 'active',
        }).returning('*');
        // Copy white-label config from parent
        const parentWL = await (0, database_1.db)('white_label_configs').where({ tenant_id: tenantId }).first();
        if (parentWL) {
            await (0, database_1.db)('white_label_configs').insert({ ...parentWL, id: undefined, tenant_id: newTenant.id });
        }
        index_1.AuditService.log({ tenantId, userId: req.user.id, action: 'reseller.create', resourceId: newTenant.id, ip: req.ip });
        res.status(201).json({ success: true, data: { tenant: newTenant, owner: { ...owner, tempPassword } } });
    };
}
exports.WhiteLabelController = WhiteLabelController;
//# sourceMappingURL=WhiteLabelController.js.map