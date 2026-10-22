"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.whiteLabelRouter = exports.integrationsRouter = exports.marketplaceRouter = exports.tablesRouter = exports.formsRouter = exports.portalsRouter = void 0;
const express_1 = require("express");
const AppBuilderController_1 = require("../controllers/AppBuilderController");
const MarketplaceController_1 = require("../controllers/MarketplaceController");
const IntegrationController_1 = require("../controllers/IntegrationController");
const WhiteLabelController_1 = require("../controllers/WhiteLabelController");
const authenticate_1 = require("../middleware/authenticate");
const middleware_1 = require("../middleware");
const appCtrl = new AppBuilderController_1.AppBuilderController();
const mktCtrl = new MarketplaceController_1.MarketplaceController();
const intCtrl = new IntegrationController_1.IntegrationController();
const wlCtrl = new WhiteLabelController_1.WhiteLabelController();
// ── Portals ────────────────────────────────────────────────────────────────
exports.portalsRouter = (0, express_1.Router)();
exports.portalsRouter.use(authenticate_1.authenticate, middleware_1.rateLimiter);
exports.portalsRouter.get('/', appCtrl.listPortals);
exports.portalsRouter.post('/', appCtrl.createPortal);
exports.portalsRouter.post('/generate', appCtrl.generatePortalWithAI);
exports.portalsRouter.get('/:id', appCtrl.getPortal);
exports.portalsRouter.patch('/:id', appCtrl.updatePortal);
exports.portalsRouter.delete('/:id', (0, authenticate_1.authorize)('super_admin', 'owner', 'admin'), appCtrl.deletePortal);
exports.portalsRouter.post('/:portalId/pages', appCtrl.addPage);
exports.portalsRouter.patch('/:portalId/pages/:pageId', appCtrl.savePage);
// ── Forms ──────────────────────────────────────────────────────────────────
exports.formsRouter = (0, express_1.Router)();
exports.formsRouter.use(authenticate_1.authenticate, middleware_1.rateLimiter);
exports.formsRouter.get('/', appCtrl.listForms);
exports.formsRouter.post('/', appCtrl.createForm);
exports.formsRouter.post('/generate', appCtrl.generateFormWithAI);
exports.formsRouter.patch('/:id', appCtrl.updateForm);
exports.formsRouter.delete('/:id', (0, authenticate_1.authorize)('super_admin', 'owner', 'admin'), appCtrl.deleteForm);
// Public submit endpoint — no auth required
exports.formsRouter.post('/:id/submit', appCtrl.submitForm);
exports.formsRouter.get('/:id/submissions', authenticate_1.authenticate, appCtrl.getFormSubmissions);
// ── Custom Tables (No-Code DB) ─────────────────────────────────────────────
exports.tablesRouter = (0, express_1.Router)();
exports.tablesRouter.use(authenticate_1.authenticate, middleware_1.rateLimiter);
exports.tablesRouter.get('/', appCtrl.listTables);
exports.tablesRouter.post('/', (0, authenticate_1.authorize)('super_admin', 'owner', 'admin'), appCtrl.createTable);
exports.tablesRouter.patch('/:id', (0, authenticate_1.authorize)('super_admin', 'owner', 'admin'), appCtrl.updateTable);
exports.tablesRouter.delete('/:id', (0, authenticate_1.authorize)('super_admin', 'owner', 'admin'), appCtrl.deleteTable);
exports.tablesRouter.get('/:tableId/records', appCtrl.listRecords);
exports.tablesRouter.post('/:tableId/records', appCtrl.createRecord);
exports.tablesRouter.patch('/:tableId/records/:recordId', appCtrl.updateRecord);
exports.tablesRouter.delete('/:tableId/records/:recordId', appCtrl.deleteRecord);
// ── Marketplace ────────────────────────────────────────────────────────────
exports.marketplaceRouter = (0, express_1.Router)();
exports.marketplaceRouter.use(authenticate_1.authenticate, middleware_1.rateLimiter);
exports.marketplaceRouter.get('/', mktCtrl.listListings);
exports.marketplaceRouter.get('/featured', mktCtrl.getFeatured);
exports.marketplaceRouter.get('/categories', mktCtrl.getCategories);
exports.marketplaceRouter.get('/installed', mktCtrl.getInstalledApps);
exports.marketplaceRouter.post('/submit', mktCtrl.submitListing);
exports.marketplaceRouter.get('/:id', mktCtrl.getListing);
exports.marketplaceRouter.post('/:id/install', mktCtrl.installApp);
exports.marketplaceRouter.delete('/:id/install', mktCtrl.uninstallApp);
// Super-admin moderation
exports.marketplaceRouter.patch('/:id/moderate', (0, authenticate_1.authorize)('super_admin'), mktCtrl.moderateListing);
// ── Integrations ───────────────────────────────────────────────────────────
exports.integrationsRouter = (0, express_1.Router)();
exports.integrationsRouter.use(authenticate_1.authenticate, middleware_1.rateLimiter);
exports.integrationsRouter.get('/catalog', intCtrl.getCatalog);
exports.integrationsRouter.get('/', intCtrl.listConnected);
exports.integrationsRouter.post('/connect', (0, authenticate_1.authorize)('super_admin', 'owner', 'admin'), intCtrl.connect);
exports.integrationsRouter.delete('/:provider', (0, authenticate_1.authorize)('super_admin', 'owner', 'admin'), intCtrl.disconnect);
exports.integrationsRouter.post('/:provider/test', intCtrl.testConnection);
exports.integrationsRouter.get('/:provider/webhook-url', intCtrl.getWebhookUrl);
// ── White Label ────────────────────────────────────────────────────────────
exports.whiteLabelRouter = (0, express_1.Router)();
exports.whiteLabelRouter.use(authenticate_1.authenticate, middleware_1.rateLimiter);
exports.whiteLabelRouter.get('/', wlCtrl.getConfig);
exports.whiteLabelRouter.post('/', (0, authenticate_1.authorize)('super_admin', 'owner', 'admin'), wlCtrl.saveConfig);
exports.whiteLabelRouter.get('/preview', wlCtrl.previewBranding);
exports.whiteLabelRouter.get('/resellers', (0, authenticate_1.authorize)('super_admin', 'owner'), wlCtrl.listResellers);
exports.whiteLabelRouter.post('/resellers', (0, authenticate_1.authorize)('super_admin', 'owner'), wlCtrl.createReseller);
//# sourceMappingURL=phase3.js.map