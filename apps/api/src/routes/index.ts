import { Router } from 'express';
import { ContactController } from '../controllers/ContactController';
import { InvoiceController } from '../controllers/InvoiceController';
import { AnalyticsController } from '../controllers/AnalyticsController';
import { authenticate, authorize } from '../middleware/authenticate';
import { rateLimiter } from '../middleware';
import { requireFields, requireLineItems } from '../lib/validation';

// ── Contacts ───────────────────────────────────────────────────────────────
const contactsRouter = Router();
const contactCtrl = new ContactController();
contactsRouter.use(authenticate, rateLimiter);
contactsRouter.get('/', contactCtrl.list);
contactsRouter.post('/', requireFields('firstName'), contactCtrl.create);
contactsRouter.get('/stats', contactCtrl.stats);
contactsRouter.get('/:id', contactCtrl.getOne);
contactsRouter.patch('/:id', contactCtrl.update);
contactsRouter.delete('/:id', authorize('super_admin', 'owner', 'admin'), contactCtrl.delete);

// ── Invoices ───────────────────────────────────────────────────────────────
const invoicesRouter = Router();
const invoiceCtrl = new InvoiceController();
invoicesRouter.use(authenticate, rateLimiter);
invoicesRouter.get('/', invoiceCtrl.list);
invoicesRouter.post('/', authorize('super_admin', 'owner', 'admin', 'manager'), requireLineItems('items'), invoiceCtrl.create);
invoicesRouter.get('/stats/summary', invoiceCtrl.stats);
invoicesRouter.get('/:id', invoiceCtrl.getOne);
invoicesRouter.get('/:id/pdf', invoiceCtrl.downloadPdf);
invoicesRouter.post('/:id/send', authorize('super_admin', 'owner', 'admin', 'manager'), invoiceCtrl.send);
invoicesRouter.post('/:id/mark-paid', authorize('super_admin', 'owner', 'admin'), invoiceCtrl.markPaid);

// ── Analytics ──────────────────────────────────────────────────────────────
const analyticsRouter = Router();
const analyticsCtrl = new AnalyticsController();
analyticsRouter.use(authenticate, rateLimiter);
analyticsRouter.get('/dashboard', analyticsCtrl.dashboard);
analyticsRouter.get('/executive', analyticsCtrl.executive);
analyticsRouter.get('/revenue', analyticsCtrl.revenue);
analyticsRouter.get('/kpis', analyticsCtrl.kpis);
analyticsRouter.get('/sales', analyticsCtrl.salesAnalytics);
analyticsRouter.get('/customers', analyticsCtrl.customerAnalytics);
analyticsRouter.get('/inventory', analyticsCtrl.inventoryAnalytics);
analyticsRouter.get('/staff', analyticsCtrl.staffAnalytics);

export { contactsRouter, invoicesRouter, analyticsRouter };
