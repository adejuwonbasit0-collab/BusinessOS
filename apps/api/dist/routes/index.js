"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsRouter = exports.invoicesRouter = exports.contactsRouter = void 0;
const express_1 = require("express");
const ContactController_1 = require("../controllers/ContactController");
const InvoiceController_1 = require("../controllers/InvoiceController");
const AnalyticsController_1 = require("../controllers/AnalyticsController");
const authenticate_1 = require("../middleware/authenticate");
const middleware_1 = require("../middleware");
const validation_1 = require("../lib/validation");
// ── Contacts ───────────────────────────────────────────────────────────────
const contactsRouter = (0, express_1.Router)();
exports.contactsRouter = contactsRouter;
const contactCtrl = new ContactController_1.ContactController();
contactsRouter.use(authenticate_1.authenticate, middleware_1.rateLimiter);
contactsRouter.get('/', contactCtrl.list);
contactsRouter.post('/', (0, validation_1.requireFields)('firstName'), contactCtrl.create);
contactsRouter.get('/stats', contactCtrl.stats);
contactsRouter.get('/:id', contactCtrl.getOne);
contactsRouter.patch('/:id', contactCtrl.update);
contactsRouter.delete('/:id', (0, authenticate_1.authorize)('super_admin', 'owner', 'admin'), contactCtrl.delete);
// ── Invoices ───────────────────────────────────────────────────────────────
const invoicesRouter = (0, express_1.Router)();
exports.invoicesRouter = invoicesRouter;
const invoiceCtrl = new InvoiceController_1.InvoiceController();
invoicesRouter.use(authenticate_1.authenticate, middleware_1.rateLimiter);
invoicesRouter.get('/', invoiceCtrl.list);
invoicesRouter.post('/', (0, authenticate_1.authorize)('super_admin', 'owner', 'admin', 'manager'), (0, validation_1.requireLineItems)('items'), invoiceCtrl.create);
invoicesRouter.get('/stats/summary', invoiceCtrl.stats);
invoicesRouter.get('/:id', invoiceCtrl.getOne);
invoicesRouter.post('/:id/send', (0, authenticate_1.authorize)('super_admin', 'owner', 'admin', 'manager'), invoiceCtrl.send);
invoicesRouter.post('/:id/mark-paid', (0, authenticate_1.authorize)('super_admin', 'owner', 'admin'), invoiceCtrl.markPaid);
// ── Analytics ──────────────────────────────────────────────────────────────
const analyticsRouter = (0, express_1.Router)();
exports.analyticsRouter = analyticsRouter;
const analyticsCtrl = new AnalyticsController_1.AnalyticsController();
analyticsRouter.use(authenticate_1.authenticate, middleware_1.rateLimiter);
analyticsRouter.get('/dashboard', analyticsCtrl.dashboard);
analyticsRouter.get('/executive', analyticsCtrl.executive);
analyticsRouter.get('/revenue', analyticsCtrl.revenue);
analyticsRouter.get('/kpis', analyticsCtrl.kpis);
analyticsRouter.get('/sales', analyticsCtrl.salesAnalytics);
analyticsRouter.get('/customers', analyticsCtrl.customerAnalytics);
analyticsRouter.get('/inventory', analyticsCtrl.inventoryAnalytics);
analyticsRouter.get('/staff', analyticsCtrl.staffAnalytics);
//# sourceMappingURL=index.js.map