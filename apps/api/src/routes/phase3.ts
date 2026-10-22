import { Router } from 'express';
import { AppBuilderController } from '../controllers/AppBuilderController';
import { MarketplaceController } from '../controllers/MarketplaceController';
import { IntegrationController } from '../controllers/IntegrationController';
import { WhiteLabelController } from '../controllers/WhiteLabelController';
import { authenticate, authorize } from '../middleware/authenticate';
import { rateLimiter } from '../middleware';

const appCtrl = new AppBuilderController();
const mktCtrl = new MarketplaceController();
const intCtrl = new IntegrationController();
const wlCtrl = new WhiteLabelController();

// ── Portals ────────────────────────────────────────────────────────────────
export const portalsRouter = Router();
portalsRouter.use(authenticate, rateLimiter);
portalsRouter.get('/', appCtrl.listPortals);
portalsRouter.post('/', appCtrl.createPortal);
portalsRouter.post('/generate', appCtrl.generatePortalWithAI);
portalsRouter.get('/:id', appCtrl.getPortal);
portalsRouter.patch('/:id', appCtrl.updatePortal);
portalsRouter.delete('/:id', authorize('super_admin', 'owner', 'admin'), appCtrl.deletePortal);
portalsRouter.post('/:portalId/pages', appCtrl.addPage);
portalsRouter.patch('/:portalId/pages/:pageId', appCtrl.savePage);

// ── Forms ──────────────────────────────────────────────────────────────────
export const formsRouter = Router();
formsRouter.use(authenticate, rateLimiter);
formsRouter.get('/', appCtrl.listForms);
formsRouter.post('/', appCtrl.createForm);
formsRouter.post('/generate', appCtrl.generateFormWithAI);
formsRouter.patch('/:id', appCtrl.updateForm);
formsRouter.delete('/:id', authorize('super_admin', 'owner', 'admin'), appCtrl.deleteForm);
// Public submit endpoint — no auth required
formsRouter.post('/:id/submit', appCtrl.submitForm);
formsRouter.get('/:id/submissions', authenticate, appCtrl.getFormSubmissions);

// ── Custom Tables (No-Code DB) ─────────────────────────────────────────────
export const tablesRouter = Router();
tablesRouter.use(authenticate, rateLimiter);
tablesRouter.get('/', appCtrl.listTables);
tablesRouter.post('/', authorize('super_admin', 'owner', 'admin'), appCtrl.createTable);
tablesRouter.patch('/:id', authorize('super_admin', 'owner', 'admin'), appCtrl.updateTable);
tablesRouter.delete('/:id', authorize('super_admin', 'owner', 'admin'), appCtrl.deleteTable);
tablesRouter.get('/:tableId/records', appCtrl.listRecords);
tablesRouter.post('/:tableId/records', appCtrl.createRecord);
tablesRouter.patch('/:tableId/records/:recordId', appCtrl.updateRecord);
tablesRouter.delete('/:tableId/records/:recordId', appCtrl.deleteRecord);

// ── Marketplace ────────────────────────────────────────────────────────────
export const marketplaceRouter = Router();
marketplaceRouter.use(authenticate, rateLimiter);
marketplaceRouter.get('/', mktCtrl.listListings);
marketplaceRouter.get('/featured', mktCtrl.getFeatured);
marketplaceRouter.get('/categories', mktCtrl.getCategories);
marketplaceRouter.get('/installed', mktCtrl.getInstalledApps);
marketplaceRouter.post('/submit', mktCtrl.submitListing);
marketplaceRouter.get('/:id', mktCtrl.getListing);
marketplaceRouter.post('/:id/install', mktCtrl.installApp);
marketplaceRouter.delete('/:id/install', mktCtrl.uninstallApp);
// Super-admin moderation
marketplaceRouter.patch('/:id/moderate', authorize('super_admin'), mktCtrl.moderateListing);

// ── Integrations ───────────────────────────────────────────────────────────
export const integrationsRouter = Router();
integrationsRouter.use(authenticate, rateLimiter);
integrationsRouter.get('/catalog', intCtrl.getCatalog);
integrationsRouter.get('/', intCtrl.listConnected);
integrationsRouter.post('/connect', authorize('super_admin', 'owner', 'admin'), intCtrl.connect);
integrationsRouter.delete('/:provider', authorize('super_admin', 'owner', 'admin'), intCtrl.disconnect);
integrationsRouter.post('/:provider/test', intCtrl.testConnection);
integrationsRouter.get('/:provider/webhook-url', intCtrl.getWebhookUrl);

// ── White Label ────────────────────────────────────────────────────────────
export const whiteLabelRouter = Router();
whiteLabelRouter.use(authenticate, rateLimiter);
whiteLabelRouter.get('/', wlCtrl.getConfig);
whiteLabelRouter.post('/', authorize('super_admin', 'owner', 'admin'), wlCtrl.saveConfig);
whiteLabelRouter.get('/preview', wlCtrl.previewBranding);
whiteLabelRouter.get('/resellers', authorize('super_admin', 'owner'), wlCtrl.listResellers);
whiteLabelRouter.post('/resellers', authorize('super_admin', 'owner'), wlCtrl.createReseller);
