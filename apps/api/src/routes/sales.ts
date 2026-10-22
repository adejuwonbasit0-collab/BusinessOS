import { Router } from 'express';
import { SalesController } from '../controllers/SalesController';
import { authenticate, authorize } from '../middleware/authenticate';
import { rateLimiter } from '../middleware';
import { requireFields, requireLineItems } from '../lib/validation';

const router = Router();
const ctrl = new SalesController();
router.use(authenticate, rateLimiter);

router.get('/orders', ctrl.listOrders);
router.post('/orders', authorize('super_admin', 'owner', 'admin', 'manager', 'staff'), requireLineItems('items'), ctrl.createOrder);
router.get('/orders/:id', ctrl.getOrder);
router.post('/orders/:id/confirm', authorize('super_admin', 'owner', 'admin', 'manager', 'staff'), ctrl.confirmOrder);
router.post('/orders/:id/payment', authorize('super_admin', 'owner', 'admin', 'manager', 'staff'), ctrl.recordPayment);

router.get('/quotations', ctrl.listQuotations);
router.post('/quotations', authorize('super_admin', 'owner', 'admin', 'manager'), requireLineItems('items'), ctrl.createQuotation);
router.post('/quotations/:id/convert', authorize('super_admin', 'owner', 'admin', 'manager'), ctrl.convertQuotationToInvoice);

router.post('/refunds', authorize('super_admin', 'owner', 'admin'), requireFields('amount'), ctrl.createRefund);
router.get('/stats', ctrl.stats);

export default router;
