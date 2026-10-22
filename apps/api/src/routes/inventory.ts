import { Router } from 'express';
import { InventoryController } from '../controllers/InventoryController';
import { authenticate, authorize } from '../middleware/authenticate';
import { rateLimiter } from '../middleware';
import { requireFields } from '../lib/validation';

const router = Router();
const ctrl = new InventoryController();
router.use(authenticate, rateLimiter);

router.get('/products', ctrl.listProducts);
router.post('/products', authorize('super_admin', 'owner', 'admin', 'manager'), requireFields('name'), ctrl.createProduct);
router.get('/categories', ctrl.listCategories);
router.post('/categories', authorize('super_admin', 'owner', 'admin', 'manager'), requireFields('name'), ctrl.createCategory);
router.get('/warehouses', ctrl.listWarehouses);
router.post('/warehouses', authorize('super_admin', 'owner', 'admin'), requireFields('name'), ctrl.createWarehouse);
router.get('/stock', ctrl.listStock);
router.post('/stock/adjust', authorize('super_admin', 'owner', 'admin', 'manager'), requireFields('warehouseId', 'productId', 'quantity'), ctrl.adjustStock);
router.get('/transfers', ctrl.listTransfers);
router.post('/transfers', authorize('super_admin', 'owner', 'admin', 'manager'), requireFields('fromWarehouseId', 'toWarehouseId'), ctrl.createTransfer);
router.get('/suppliers', ctrl.listSuppliers);
router.post('/suppliers', authorize('super_admin', 'owner', 'admin', 'manager'), requireFields('name'), ctrl.createSupplier);
router.get('/purchase-orders', ctrl.listPurchaseOrders);
router.post('/purchase-orders', authorize('super_admin', 'owner', 'admin', 'manager'), requireFields('supplierId', 'warehouseId'), ctrl.createPurchaseOrder);
router.post('/purchase-orders/:id/receive', authorize('super_admin', 'owner', 'admin', 'manager'), ctrl.receivePurchaseOrder);
router.get('/stats', ctrl.stats);

export default router;
