import { Router } from 'express';
import { DocumentController } from '../controllers/DocumentController';
import { CommunicationController } from '../controllers/CommunicationController';
import { AccountingController } from '../controllers/AccountingController';
import { authenticate, authorize } from '../middleware/authenticate';
import { rateLimiter } from '../middleware';
import { requireFields } from '../lib/validation';

// ── Documents ──────────────────────────────────────────────────────────────
const documentsRouter = Router();
const docCtrl = new DocumentController();
documentsRouter.use(authenticate, rateLimiter);
documentsRouter.get('/', docCtrl.list);
documentsRouter.post('/', requireFields('title'), docCtrl.create);
documentsRouter.get('/stats', docCtrl.stats);
documentsRouter.get('/:id', docCtrl.getOne);
documentsRouter.post('/:id/request-signature', docCtrl.requestSignature);
documentsRouter.post('/signatures/:signatureId/submit', docCtrl.submitSignature);
documentsRouter.get('/approvals/list', docCtrl.listApprovals);
documentsRouter.post('/approvals', requireFields('resourceType', 'resourceId'), docCtrl.requestApproval);
documentsRouter.post('/approvals/:id/decide', authorize('super_admin', 'owner', 'admin', 'manager'), docCtrl.decideApproval);

// ── Communication ──────────────────────────────────────────────────────────
const communicationRouter = Router();
const commCtrl = new CommunicationController();
communicationRouter.use(authenticate, rateLimiter);
communicationRouter.get('/threads', commCtrl.listThreads);
communicationRouter.post('/threads', commCtrl.createThread);
communicationRouter.get('/threads/:threadId/messages', commCtrl.listMessages);
communicationRouter.post('/threads/:threadId/messages', commCtrl.sendMessage);
communicationRouter.get('/logs', commCtrl.listCommunicationLogs);
communicationRouter.post('/send-email', requireFields('recipient', 'subject', 'body'), commCtrl.sendEmail);
communicationRouter.get('/notifications', commCtrl.listNotifications);
communicationRouter.post('/notifications/:id/read', commCtrl.markNotificationRead);
communicationRouter.post('/notifications/mark-all-read', commCtrl.markAllRead);
communicationRouter.get('/stats', commCtrl.stats);

// ── Accounting ─────────────────────────────────────────────────────────────
const accountingRouter = Router();
const acctCtrl = new AccountingController();
accountingRouter.use(authenticate, rateLimiter);
accountingRouter.get('/accounts', acctCtrl.listAccounts);
accountingRouter.post('/accounts', authorize('super_admin', 'owner', 'admin'), requireFields('code', 'name', 'type'), acctCtrl.createAccount);
accountingRouter.get('/journal-entries', acctCtrl.listJournalEntries);
accountingRouter.post('/journal-entries', authorize('super_admin', 'owner', 'admin'), requireFields('entryDate', 'lines'), acctCtrl.createJournalEntry);
accountingRouter.get('/general-ledger', acctCtrl.generalLedger);
accountingRouter.get('/budgets', acctCtrl.listBudgets);
accountingRouter.post('/budgets', authorize('super_admin', 'owner', 'admin'), requireFields('name', 'fiscalYear'), acctCtrl.createBudget);
accountingRouter.get('/tax-rates', acctCtrl.listTaxRates);
accountingRouter.post('/tax-rates', authorize('super_admin', 'owner', 'admin'), requireFields('name', 'rate'), acctCtrl.createTaxRate);
accountingRouter.get('/cash-flow', acctCtrl.cashFlow);
accountingRouter.get('/profit-and-loss', acctCtrl.profitAndLoss);

export { documentsRouter, communicationRouter, accountingRouter };
