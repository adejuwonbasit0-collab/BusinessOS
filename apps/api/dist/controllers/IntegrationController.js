"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationController = void 0;
const database_1 = require("../lib/database");
const errors_1 = require("../lib/errors");
const index_1 = require("../services/index");
// ── Integration provider catalogue ─────────────────────────────────────────
const INTEGRATION_PROVIDERS = [
    // Payments
    { key: 'stripe', name: 'Stripe', category: 'Payments', icon: '💳', description: 'Accept online payments and manage subscriptions', configFields: ['publishable_key', 'secret_key', 'webhook_secret'], docsUrl: 'https://stripe.com/docs' },
    { key: 'paystack', name: 'Paystack', category: 'Payments', icon: '💳', description: 'Payments for Africa — Nigeria, Ghana, South Africa', configFields: ['public_key', 'secret_key', 'webhook_secret'], docsUrl: 'https://paystack.com/docs' },
    { key: 'flutterwave', name: 'Flutterwave', category: 'Payments', icon: '💳', description: 'Pan-African payment infrastructure', configFields: ['public_key', 'secret_key', 'encryption_key'], docsUrl: 'https://developer.flutterwave.com' },
    { key: 'paypal', name: 'PayPal', category: 'Payments', icon: '🅿️', description: 'PayPal and Venmo payment processing', configFields: ['client_id', 'client_secret'], docsUrl: 'https://developer.paypal.com' },
    // Communication
    { key: 'twilio', name: 'Twilio', category: 'Communication', icon: '📱', description: 'SMS, WhatsApp, and voice messaging', configFields: ['account_sid', 'auth_token', 'phone_number', 'whatsapp_number'], docsUrl: 'https://www.twilio.com/docs' },
    { key: 'telegram', name: 'Telegram', category: 'Communication', icon: '✈️', description: 'Telegram bot notifications', configFields: ['bot_token', 'chat_id'], docsUrl: 'https://core.telegram.org/bots' },
    { key: 'slack', name: 'Slack', category: 'Communication', icon: '💬', description: 'Team notifications and slash commands', configFields: ['webhook_url', 'bot_token'], docsUrl: 'https://api.slack.com' },
    // Productivity
    { key: 'google_workspace', name: 'Google Workspace', category: 'Productivity', icon: '🔤', description: 'Gmail, Calendar, Drive integration', configFields: ['client_id', 'client_secret', 'refresh_token'], docsUrl: 'https://developers.google.com/workspace' },
    { key: 'microsoft_365', name: 'Microsoft 365', category: 'Productivity', icon: '🪟', description: 'Outlook, Teams, OneDrive integration', configFields: ['client_id', 'client_secret', 'tenant_id'], docsUrl: 'https://docs.microsoft.com/en-us/graph' },
    { key: 'zoom', name: 'Zoom', category: 'Productivity', icon: '🎥', description: 'Create Zoom meetings from bookings and deals', configFields: ['client_id', 'client_secret', 'account_id'], docsUrl: 'https://marketplace.zoom.us' },
    // Calendar
    { key: 'google_calendar', name: 'Google Calendar', category: 'Calendar', icon: '📅', description: 'Sync bookings with Google Calendar', configFields: ['client_id', 'client_secret', 'refresh_token'], docsUrl: 'https://developers.google.com/calendar' },
];
class IntegrationController {
    getCatalog = async (req, res) => {
        const installed = await (0, database_1.db)('integrations').where({ tenant_id: req.tenant.id }).pluck('provider');
        const catalog = INTEGRATION_PROVIDERS.map((p) => ({
            ...p,
            isConnected: installed.includes(p.key),
        }));
        res.json({ success: true, data: { catalog } });
    };
    listConnected = async (req, res) => {
        const connected = await (0, database_1.db)('integrations').where({ tenant_id: req.tenant.id });
        res.json({ success: true, data: { integrations: connected } });
    };
    connect = async (req, res) => {
        const tenantId = req.tenant.id;
        const { provider, config } = req.body;
        if (!provider)
            throw new errors_1.AppError('Provider required', 400, 'MISSING_PROVIDER');
        const providerDef = INTEGRATION_PROVIDERS.find((p) => p.key === provider);
        if (!providerDef)
            throw new errors_1.AppError('Unknown provider', 404, 'UNKNOWN_PROVIDER');
        // Upsert integration
        const existing = await (0, database_1.db)('integrations').where({ tenant_id: tenantId, provider }).first();
        if (existing) {
            await (0, database_1.db)('integrations').where({ id: existing.id }).update({
                status: 'active', config: JSON.stringify(config || {}), updated_at: new Date(),
            });
        }
        else {
            await (0, database_1.db)('integrations').insert({
                tenant_id: tenantId, provider, status: 'active',
                config: JSON.stringify(config || {}), connected_at: new Date(),
            });
        }
        index_1.AuditService.log({ tenantId, userId: req.user.id, action: `integration.connect.${provider}`, ip: req.ip });
        res.json({ success: true, message: `${providerDef.name} connected successfully` });
    };
    disconnect = async (req, res) => {
        const { provider } = req.params;
        await (0, database_1.db)('integrations').where({ tenant_id: req.tenant.id, provider }).update({ status: 'inactive', updated_at: new Date() });
        index_1.AuditService.log({ tenantId: req.tenant.id, userId: req.user.id, action: `integration.disconnect.${provider}`, ip: req.ip });
        res.json({ success: true, message: 'Integration disconnected' });
    };
    testConnection = async (req, res) => {
        const { provider } = req.params;
        const integration = await (0, database_1.db)('integrations').where({ tenant_id: req.tenant.id, provider }).first();
        if (!integration)
            throw new errors_1.NotFoundError('Integration');
        // In a real system, each provider has a test fn (e.g. call /v1/balance for Stripe)
        // For now we do a lightweight validation of config presence
        const providerDef = INTEGRATION_PROVIDERS.find((p) => p.key === provider);
        const config = typeof integration.config === 'string' ? JSON.parse(integration.config) : integration.config;
        const missingFields = (providerDef?.configFields || []).filter((f) => !config[f]);
        if (missingFields.length > 0) {
            await (0, database_1.db)('integrations').where({ id: integration.id }).update({ status: 'error' });
            return res.json({ success: false, error: `Missing required fields: ${missingFields.join(', ')}` });
        }
        await (0, database_1.db)('integrations').where({ id: integration.id }).update({ status: 'active' });
        return res.json({ success: true, message: 'Connection verified' });
    };
    getWebhookUrl = async (req, res) => {
        const { provider } = req.params;
        const baseUrl = process.env.API_URL || 'https://api.nexos.app';
        const webhookUrl = `${baseUrl}/api/v1/webhooks/incoming/${req.tenant.id}/${provider}`;
        res.json({ success: true, data: { webhookUrl } });
    };
}
exports.IntegrationController = IntegrationController;
//# sourceMappingURL=IntegrationController.js.map