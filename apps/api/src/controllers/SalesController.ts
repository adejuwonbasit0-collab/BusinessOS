import { Request, Response } from 'express';
import { db } from '../lib/database';
import { NotFoundError } from '../lib/errors';
import { AuditService } from '../services/index';
import { lineItemName } from '../lib/validation';

export class SalesController {
  // ── Sales Orders / POS ─────────────────────────────────────────────────────
  listOrders = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { channel, status, page = 1, limit = 25 } = req.query as any;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = db('sales_orders').leftJoin('contacts', 'sales_orders.contact_id', 'contacts.id').where({ 'sales_orders.tenant_id': tenantId });
    if (channel) query = query.where('sales_orders.channel', channel);
    if (status) query = query.where('sales_orders.status', status);

    const [{ count }] = await query.clone().count('sales_orders.id as count');
    const orders = await query.clone()
      .select('sales_orders.*', db.raw("CONCAT(contacts.first_name, ' ', contacts.last_name) as contact_name"))
      .orderBy('sales_orders.created_at', 'desc').limit(parseInt(limit)).offset(offset);

    res.json({ success: true, data: { orders, pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(count as string) } } });
  };

  createOrder = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { contactId, branchId, warehouseId, channel = 'manual', items, discountAmount = 0 } = req.body;

    const [{ count }] = await db('sales_orders').where({ tenant_id: tenantId }).count('id as count');
    const orderNumber = `ORD-${new Date().getFullYear()}-${String(parseInt(count as string) + 1).padStart(5, '0')}`;

    let subtotal = 0;
    const lineItems = (items || []).map((item: any) => {
      const quantity = parseFloat(item.quantity);
      const unitPrice = parseFloat(item.unitPrice);
      const lineTotal = quantity * unitPrice;
      subtotal += lineTotal;
      return {
        product_id: item.productId || null,
        variant_id: item.variantId || null,
        name: lineItemName(item),
        quantity,
        unit_price: unitPrice,
        total: lineTotal,
      };
    });
    const total = subtotal - discountAmount;

    const [order] = await db.transaction(async (trx) => {
      const [o] = await trx('sales_orders').insert({
        tenant_id: tenantId, branch_id: branchId || null, warehouse_id: warehouseId || null, contact_id: contactId || null,
        created_by: req.user!.id, order_number: orderNumber, channel, subtotal, discount_amount: discountAmount, total, amount_paid: 0,
      }).returning('*');

      if (lineItems.length) {
        await trx('sales_order_items').insert(lineItems.map((i: any) => ({ ...i, order_id: o.id })));

        // Decrement stock if warehouse specified and product tracks inventory
        if (warehouseId) {
          for (const item of lineItems) {
            if (!item.product_id) continue;
            const stockRow = await trx('stock_levels').where({ tenant_id: tenantId, warehouse_id: warehouseId, product_id: item.product_id, variant_id: item.variant_id }).first();
            if (stockRow) {
              await trx('stock_levels').where({ id: stockRow.id }).update({
                quantity_on_hand: trx.raw('quantity_on_hand - ?', [item.quantity]),
                quantity_available: trx.raw('quantity_available - ?', [item.quantity]),
              });
              await trx('stock_movements').insert({
                tenant_id: tenantId, warehouse_id: warehouseId, product_id: item.product_id, variant_id: item.variant_id,
                movement_type: 'sale', quantity: -item.quantity, reference_type: 'sales_order', reference_id: o.id, created_by: req.user!.id,
              });
            }
          }
        }
      }
      return [o];
    });

    AuditService.log({ tenantId, userId: req.user!.id, action: 'sales_order.create', resourceType: 'sales_order', resourceId: order.id, ip: req.ip });
    res.status(201).json({ success: true, data: { order } });
  };

  getOrder = async (req: Request, res: Response) => {
    const { id } = req.params;
    const order = await db('sales_orders').where({ id, tenant_id: req.tenant!.id }).first();
    if (!order) throw new NotFoundError('Order');
    const items = await db('sales_order_items').where({ order_id: id });
    res.json({ success: true, data: { order, items } });
  };

  confirmOrder = async (req: Request, res: Response) => {
    const { id } = req.params;
    const order = await db('sales_orders').where({ id, tenant_id: req.tenant!.id }).first();
    if (!order) throw new NotFoundError('Order');
    await db('sales_orders').where({ id }).update({ status: 'confirmed' });
    res.json({ success: true, message: 'Order confirmed' });
  };

  recordPayment = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { amount, method = 'cash' } = req.body;
    const order = await db('sales_orders').where({ id, tenant_id: req.tenant!.id }).first();
    if (!order) throw new NotFoundError('Order');

    const newPaid = parseFloat(order.amount_paid) + parseFloat(amount);
    const paymentStatus = newPaid >= parseFloat(order.total) ? 'paid' : 'partial';

    await db.transaction(async (trx) => {
      await trx('payments').insert({ tenant_id: req.tenant!.id, contact_id: order.contact_id, amount, method, status: 'completed' });
      await trx('sales_orders').where({ id }).update({ amount_paid: newPaid, payment_status: paymentStatus });
    });

    res.json({ success: true, message: 'Payment recorded' });
  };

  // ── Quotations / Estimates ─────────────────────────────────────────────────
  listQuotations = async (req: Request, res: Response) => {
    const quotations = await db('quotations').leftJoin('contacts', 'quotations.contact_id', 'contacts.id')
      .where({ 'quotations.tenant_id': req.tenant!.id })
      .select('quotations.*', db.raw("CONCAT(contacts.first_name, ' ', contacts.last_name) as contact_name"))
      .orderBy('quotations.created_at', 'desc');
    res.json({ success: true, data: { quotations } });
  };

  createQuotation = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { contactId, dealId, type = 'quotation', items, validUntil } = req.body;
    const [{ count }] = await db('quotations').where({ tenant_id: tenantId }).count('id as count');
    const quoteNumber = `QT-${new Date().getFullYear()}-${String(parseInt(count as string) + 1).padStart(4, '0')}`;

    let subtotal = 0;
    const lineItems = (items || []).map((item: any) => {
      const quantity = parseFloat(item.quantity);
      const unitPrice = parseFloat(item.unitPrice);
      const total = quantity * unitPrice;
      subtotal += total;
      return { product_id: item.productId || null, name: lineItemName(item), quantity, unit_price: unitPrice, total };
    });

    const [quotation] = await db.transaction(async (trx) => {
      const [q] = await trx('quotations').insert({
        tenant_id: tenantId, contact_id: contactId || null, deal_id: dealId || null, created_by: req.user!.id,
        quote_number: quoteNumber, type, subtotal, total: subtotal, valid_until: validUntil ? new Date(validUntil) : null,
      }).returning('*');
      if (lineItems.length) await trx('quotation_items').insert(lineItems.map((i: any) => ({ ...i, quotation_id: q.id })));
      return [q];
    });

    res.status(201).json({ success: true, data: { quotation } });
  };

  convertQuotationToInvoice = async (req: Request, res: Response) => {
    const { id } = req.params;
    const quotation = await db('quotations').where({ id, tenant_id: req.tenant!.id }).first();
    if (!quotation) throw new NotFoundError('Quotation');

    const items = await db('quotation_items').where({ quotation_id: id });
    const [{ count }] = await db('invoices').where({ tenant_id: req.tenant!.id }).count('id as count');
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(parseInt(count as string) + 1).padStart(4, '0')}`;

    const [invoice] = await db.transaction(async (trx) => {
      const [inv] = await trx('invoices').insert({
        tenant_id: req.tenant!.id, contact_id: quotation.contact_id, created_by: req.user!.id,
        invoice_number: invoiceNumber, subtotal: quotation.subtotal, total: quotation.total, amount_due: quotation.total,
        issue_date: new Date(), due_date: new Date(Date.now() + 30 * 86400000),
      }).returning('*');

      if (items.length) {
        await trx('invoice_items').insert(items.map((i) => ({ invoice_id: inv.id, name: i.name, quantity: i.quantity, unit_price: i.unit_price, total: i.total })));
      }
      await trx('quotations').where({ id }).update({ status: 'converted', converted_invoice_id: inv.id });
      return [inv];
    });

    res.json({ success: true, data: { invoice } });
  };

  // ── Refunds ────────────────────────────────────────────────────────────────
  createRefund = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { orderId, invoiceId, amount, reason } = req.body;
    const [refund] = await db('refunds').insert({
      tenant_id: tenantId, order_id: orderId || null, invoice_id: invoiceId || null, processed_by: req.user!.id, amount, reason,
    }).returning('*');

    if (orderId) await db('sales_orders').where({ id: orderId }).update({ payment_status: 'refunded', status: 'refunded' });

    res.status(201).json({ success: true, data: { refund } });
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  stats = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const since = new Date(Date.now() - 30 * 86400000);
    const [revenue, orderCount, byChannel] = await Promise.all([
      db('sales_orders').where({ tenant_id: tenantId }).where('created_at', '>=', since).sum('total as total').first(),
      db('sales_orders').where({ tenant_id: tenantId }).where('created_at', '>=', since).count('id as count').first(),
      db('sales_orders').where({ tenant_id: tenantId }).where('created_at', '>=', since).groupBy('channel').select('channel', db.raw('COUNT(*) as count')),
    ]);
    res.json({ success: true, data: { revenue: parseFloat((revenue as any)?.total || '0'), orderCount: parseInt((orderCount as any)?.count || '0'), byChannel } });
  };
}
