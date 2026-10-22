import { Request, Response } from 'express';
import { db } from '../lib/database';
import { NotFoundError } from '../lib/errors';
import { AuditService } from '../services/index';
import { toJsonb } from '../lib/validation';

export class InventoryController {
  // ── Products & Categories ─────────────────────────────────────────────────
  listProducts = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { search, categoryId, page = 1, limit = 25 } = req.query as any;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = db('products').leftJoin('product_categories', 'products.category_id', 'product_categories.id')
      .where({ 'products.tenant_id': tenantId }).whereNull('products.deleted_at');
    if (search) query = query.whereILike('products.name', `%${search}%`);
    if (categoryId) query = query.where('products.category_id', categoryId);

    const [{ count }] = await query.clone().count('products.id as count');
    const products = await query.clone()
      .select('products.*', 'product_categories.name as category_name')
      .orderBy('products.name').limit(parseInt(limit)).offset(offset);

    res.json({ success: true, data: { products, pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(count as string) } } });
  };

  createProduct = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { name, sku, categoryId, price, cost, trackInventory, reorderPoint, reorderQuantity, barcode } = req.body;
    const [product] = await db('products').insert({
      tenant_id: tenantId, name, sku, category_id: categoryId || null, price: price || 0, cost: cost || 0,
      track_inventory: !!trackInventory, reorder_point: reorderPoint || 0, reorder_quantity: reorderQuantity || 0, barcode,
    }).returning('*');
    res.status(201).json({ success: true, data: { product } });
  };

  listCategories = async (req: Request, res: Response) => {
    const categories = await db('product_categories').where({ tenant_id: req.tenant!.id }).orderBy('name');
    res.json({ success: true, data: { categories } });
  };

  createCategory = async (req: Request, res: Response) => {
    const { name, parentId } = req.body;
    const [category] = await db('product_categories').insert({ tenant_id: req.tenant!.id, name, parent_id: parentId || null }).returning('*');
    res.status(201).json({ success: true, data: { category } });
  };

  // ── Warehouses ─────────────────────────────────────────────────────────────
  listWarehouses = async (req: Request, res: Response) => {
    const warehouses = await db('warehouses').where({ tenant_id: req.tenant!.id }).orderBy('is_default', 'desc').orderBy('name');
    res.json({ success: true, data: { warehouses } });
  };

  createWarehouse = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { name, code, branchId } = req.body;
    const [{ count }] = await db('warehouses').where({ tenant_id: tenantId }).count('id as count');
    const [warehouse] = await db('warehouses').insert({
      tenant_id: tenantId, name, code, branch_id: branchId || null, is_default: parseInt(count as string) === 0,
    }).returning('*');
    res.status(201).json({ success: true, data: { warehouse } });
  };

  // ── Stock levels ───────────────────────────────────────────────────────────
  listStock = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { warehouseId, lowStockOnly } = req.query as any;

    let query = db('stock_levels')
      .join('products', 'stock_levels.product_id', 'products.id')
      .leftJoin('product_variants', 'stock_levels.variant_id', 'product_variants.id')
      .join('warehouses', 'stock_levels.warehouse_id', 'warehouses.id')
      .where({ 'stock_levels.tenant_id': tenantId });

    if (warehouseId) query = query.where('stock_levels.warehouse_id', warehouseId);
    if (lowStockOnly === 'true') query = query.whereRaw('stock_levels.quantity_available <= products.reorder_point');

    const stock = await query.select(
      'stock_levels.*', 'products.name as product_name', 'products.sku', 'products.reorder_point',
      'product_variants.name as variant_name', 'warehouses.name as warehouse_name'
    ).orderBy('products.name');

    res.json({ success: true, data: { stock } });
  };

  adjustStock = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { warehouseId, productId, variantId, quantity, movementType = 'adjustment', notes } = req.body;

    await db.transaction(async (trx) => {
      const existing = await trx('stock_levels').where({ tenant_id: tenantId, warehouse_id: warehouseId, product_id: productId, variant_id: variantId || null }).first();

      if (existing) {
        await trx('stock_levels').where({ id: existing.id }).update({
          quantity_on_hand: trx.raw('quantity_on_hand + ?', [quantity]),
          quantity_available: trx.raw('quantity_available + ?', [quantity]),
          updated_at: new Date(),
        });
      } else {
        await trx('stock_levels').insert({
          tenant_id: tenantId, warehouse_id: warehouseId, product_id: productId, variant_id: variantId || null,
          quantity_on_hand: quantity, quantity_available: quantity,
        });
      }

      await trx('stock_movements').insert({
        tenant_id: tenantId, warehouse_id: warehouseId, product_id: productId, variant_id: variantId || null,
        movement_type: movementType, quantity, created_by: req.user!.id, notes,
      });
    });

    AuditService.log({ tenantId, userId: req.user!.id, action: 'inventory.adjust', resourceType: 'product', resourceId: productId, ip: req.ip });
    res.json({ success: true, message: 'Stock adjusted' });
  };

  // ── Transfers ──────────────────────────────────────────────────────────────
  listTransfers = async (req: Request, res: Response) => {
    const transfers = await db('inventory_transfers')
      .join('warehouses as fw', 'inventory_transfers.from_warehouse_id', 'fw.id')
      .join('warehouses as tw', 'inventory_transfers.to_warehouse_id', 'tw.id')
      .where({ 'inventory_transfers.tenant_id': req.tenant!.id })
      .select('inventory_transfers.*', 'fw.name as from_warehouse_name', 'tw.name as to_warehouse_name')
      .orderBy('inventory_transfers.created_at', 'desc');
    res.json({ success: true, data: { transfers } });
  };

  createTransfer = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { fromWarehouseId, toWarehouseId, items, notes } = req.body;
    const [{ count }] = await db('inventory_transfers').where({ tenant_id: tenantId }).count('id as count');
    const transferNumber = `TRF-${String(parseInt(count as string) + 1).padStart(5, '0')}`;

    const [transfer] = await db.transaction(async (trx) => {
      const [t] = await trx('inventory_transfers').insert({
        tenant_id: tenantId, from_warehouse_id: fromWarehouseId, to_warehouse_id: toWarehouseId,
        transfer_number: transferNumber, requested_by: req.user!.id, notes,
      }).returning('*');

      if (items?.length) {
        await trx('inventory_transfer_items').insert(items.map((item: any) => ({
          transfer_id: t.id, product_id: item.productId, variant_id: item.variantId || null, quantity: item.quantity,
        })));
      }
      return [t];
    });

    res.status(201).json({ success: true, data: { transfer } });
  };

  // ── Suppliers ──────────────────────────────────────────────────────────────
  listSuppliers = async (req: Request, res: Response) => {
    const suppliers = await db('suppliers').where({ tenant_id: req.tenant!.id }).orderBy('name');
    res.json({ success: true, data: { suppliers } });
  };

  createSupplier = async (req: Request, res: Response) => {
    const { name, contactName, email, phone, address, paymentTerms } = req.body;
    const [supplier] = await db('suppliers').insert({
      tenant_id: req.tenant!.id, name, contact_name: contactName, email, phone, address: toJsonb(address), payment_terms: paymentTerms,
    }).returning('*');
    res.status(201).json({ success: true, data: { supplier } });
  };

  // ── Purchase Orders ────────────────────────────────────────────────────────
  listPurchaseOrders = async (req: Request, res: Response) => {
    const pos = await db('purchase_orders').leftJoin('suppliers', 'purchase_orders.supplier_id', 'suppliers.id')
      .where({ 'purchase_orders.tenant_id': req.tenant!.id })
      .select('purchase_orders.*', 'suppliers.name as supplier_name')
      .orderBy('purchase_orders.created_at', 'desc');
    res.json({ success: true, data: { purchaseOrders: pos } });
  };

  createPurchaseOrder = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { supplierId, warehouseId, items, expectedDate, notes } = req.body;
    const [{ count }] = await db('purchase_orders').where({ tenant_id: tenantId }).count('id as count');
    const poNumber = `PO-${new Date().getFullYear()}-${String(parseInt(count as string) + 1).padStart(4, '0')}`;

    let subtotal = 0;
    const lineItems = (items || []).map((item: any) => {
      const total = parseFloat(item.quantity) * parseFloat(item.unitCost);
      subtotal += total;
      return { product_id: item.productId, variant_id: item.variantId || null, quantity_ordered: item.quantity, unit_cost: item.unitCost, total };
    });

    const [po] = await db.transaction(async (trx) => {
      const [order] = await trx('purchase_orders').insert({
        tenant_id: tenantId, supplier_id: supplierId, warehouse_id: warehouseId, created_by: req.user!.id,
        po_number: poNumber, subtotal, total: subtotal, order_date: new Date(),
        expected_date: expectedDate ? new Date(expectedDate) : null, notes,
      }).returning('*');

      if (lineItems.length) await trx('purchase_order_items').insert(lineItems.map((i: any) => ({ ...i, purchase_order_id: order.id })));
      return [order];
    });

    res.status(201).json({ success: true, data: { purchaseOrder: po } });
  };

  receivePurchaseOrder = async (req: Request, res: Response) => {
    const { id } = req.params;
    const po = await db('purchase_orders').where({ id, tenant_id: req.tenant!.id }).first();
    if (!po) throw new NotFoundError('Purchase Order');

    const items = await db('purchase_order_items').where({ purchase_order_id: id });

    await db.transaction(async (trx) => {
      for (const item of items) {
        const existing = await trx('stock_levels').where({ tenant_id: req.tenant!.id, warehouse_id: po.warehouse_id, product_id: item.product_id, variant_id: item.variant_id }).first();
        if (existing) {
          await trx('stock_levels').where({ id: existing.id }).update({
            quantity_on_hand: trx.raw('quantity_on_hand + ?', [item.quantity_ordered]),
            quantity_available: trx.raw('quantity_available + ?', [item.quantity_ordered]),
          });
        } else {
          await trx('stock_levels').insert({
            tenant_id: req.tenant!.id, warehouse_id: po.warehouse_id, product_id: item.product_id, variant_id: item.variant_id,
            quantity_on_hand: item.quantity_ordered, quantity_available: item.quantity_ordered,
          });
        }
        await trx('stock_movements').insert({
          tenant_id: req.tenant!.id, warehouse_id: po.warehouse_id, product_id: item.product_id, variant_id: item.variant_id,
          movement_type: 'purchase', quantity: item.quantity_ordered, reference_type: 'purchase_order', reference_id: id, created_by: req.user!.id,
        });
        await trx('purchase_order_items').where({ id: item.id }).update({ quantity_received: item.quantity_ordered });
      }
      await trx('purchase_orders').where({ id }).update({ status: 'received', received_at: new Date() });
    });

    res.json({ success: true, message: 'Purchase order received and stock updated' });
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  stats = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const [totalProducts, totalValue, lowStock] = await Promise.all([
      db('products').where({ tenant_id: tenantId }).whereNull('deleted_at').count('id as count').first(),
      db('stock_levels').join('products', 'stock_levels.product_id', 'products.id').where({ 'stock_levels.tenant_id': tenantId })
        .sum(db.raw('stock_levels.quantity_on_hand * products.cost')).first(),
      db('stock_levels').join('products', 'stock_levels.product_id', 'products.id').where({ 'stock_levels.tenant_id': tenantId })
        .whereRaw('stock_levels.quantity_available <= products.reorder_point').count('stock_levels.id as count').first(),
    ]);
    res.json({ success: true, data: { totalProducts: parseInt((totalProducts as any)?.count || '0'), totalValue: parseFloat((totalValue as any)?.sum || '0'), lowStockCount: parseInt((lowStock as any)?.count || '0') } });
  };
}
