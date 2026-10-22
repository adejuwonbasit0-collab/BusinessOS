import { Request, Response } from 'express';
import { db } from '../lib/database';
import { AppError, NotFoundError } from '../lib/errors';
import { AuditService } from '../services/index';
import PDFDocument from 'pdfkit';
import { EmailService } from '../services/EmailService';
import { lineItemName } from '../lib/validation';

export class InvoiceController {
  list = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { page = 1, limit = 25, status, search } = req.query as any;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = db('invoices').leftJoin('contacts', 'invoices.contact_id', 'contacts.id')
      .where({ 'invoices.tenant_id': tenantId }).whereNull('invoices.deleted_at');
    if (status) query = query.where('invoices.status', status);
    if (search) query = query.whereILike('invoices.invoice_number', `%${search}%`);

    const [{ count }] = await query.clone().count('invoices.id as count');
    const invoices = await query.clone()
      .select('invoices.*', db.raw("CONCAT(contacts.first_name, ' ', contacts.last_name) as contact_name"), 'contacts.email as contact_email', 'contacts.company_name')
      .orderBy('invoices.created_at', 'desc').limit(parseInt(limit)).offset(offset);

    res.json({
      success: true,
      data: { invoices, pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(count as string), totalPages: Math.ceil(parseInt(count as string) / parseInt(limit)) } },
    });
  };

  create = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { contactId, items, notes, dueDate, currency } = req.body;

    const tenant = await db('tenants').where({ id: tenantId }).first();
    const [{ count }] = await db('invoices').where({ tenant_id: tenantId }).count('id as count');
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(parseInt(count as string) + 1).padStart(4, '0')}`;

    let subtotal = 0;
    const lineItems = (items || []).map((item: any, i: number) => {
      const quantity = parseFloat(item.quantity);
      const unitPrice = parseFloat(item.unitPrice);
      const lineTotal = quantity * unitPrice;
      subtotal += lineTotal;
      return {
        name: lineItemName(item),
        description: item.description || null,
        quantity,
        unit_price: unitPrice,
        total: lineTotal,
        sort_order: i,
      };
    });

    const [invoice] = await db.transaction(async (trx) => {
      const [inv] = await trx('invoices').insert({
        tenant_id: tenantId, contact_id: contactId || null, created_by: req.user!.id,
        invoice_number: invoiceNumber, status: 'draft', subtotal, total: subtotal,
        amount_paid: 0, amount_due: subtotal, currency: currency || tenant.currency || 'USD',
        notes: notes || null, issue_date: new Date(), due_date: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 86400000),
      }).returning('*');

      if (lineItems.length > 0) {
        await trx('invoice_items').insert(lineItems.map((item: any) => ({ ...item, invoice_id: inv.id })));
      }
      return [inv];
    });

    AuditService.log({ tenantId, userId: req.user!.id, action: 'invoice.create', resourceType: 'invoice', resourceId: invoice.id, ip: req.ip });
    res.status(201).json({ success: true, data: { invoice } });
  };

  downloadPdf = async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenant!.id;

    const invoice = await db('invoices').leftJoin('contacts', 'invoices.contact_id', 'contacts.id')
      .where({ 'invoices.id': id, 'invoices.tenant_id': tenantId }).whereNull('invoices.deleted_at')
      .select('invoices.*', db.raw("CONCAT(contacts.first_name, ' ', contacts.last_name) as contact_name"), 'contacts.email as contact_email', 'contacts.company_name')
      .first();
    if (!invoice) throw new NotFoundError('Invoice');

    const items = await db('invoice_items').where({ invoice_id: id }).orderBy('sort_order');
    const tenant = await db('tenants').where({ id: tenantId }).first();

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoice_number}.pdf"`);
    doc.pipe(res);

    // Header with tenant branding
    doc.fontSize(20).font('Helvetica-Bold').text(tenant.name || 'Invoice', 50, 50);
    if (tenant.address) doc.fontSize(9).font('Helvetica').text(tenant.address, 50, 75);
    if (tenant.phone) doc.text(`Tel: ${tenant.phone}`, 50, 88);
    if (tenant.business_email) doc.text(tenant.business_email, 50, 101);

    // Invoice title
    doc.fontSize(16).font('Helvetica-Bold').text('INVOICE', 400, 50, { align: 'right' });
    doc.fontSize(10).font('Helvetica').text(invoice.invoice_number, 400, 72, { align: 'right' });
    doc.text(`Date: ${new Date(invoice.issue_date).toLocaleDateString()}`, 400, 86, { align: 'right' });
    if (invoice.due_date) doc.text(`Due: ${new Date(invoice.due_date).toLocaleDateString()}`, 400, 100, { align: 'right' });

    // Bill to
    doc.fontSize(10).font('Helvetica-Bold').text('Bill To:', 50, 130);
    doc.font('Helvetica').text(invoice.contact_name || 'Customer', 50, 145);
    if (invoice.contact_email) doc.text(invoice.contact_email, 50, 158);
    if (invoice.company_name) doc.text(invoice.company_name, 50, 171);

    // Line items table
    const tableTop = 200;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Description', 50, tableTop);
    doc.text('Qty', 320, tableTop, { width: 50, align: 'right' });
    doc.text('Unit Price', 370, tableTop, { width: 80, align: 'right' });
    doc.text('Total', 450, tableTop, { width: 100, align: 'right' });

    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    let y = tableTop + 25;
    doc.font('Helvetica').fontSize(9);
    for (const item of items) {
      doc.text(item.name || item.description || 'Item', 50, y, { width: 260 });
      doc.text(String(item.quantity), 320, y, { width: 50, align: 'right' });
      doc.text(`${invoice.currency} ${Number(item.unit_price).toFixed(2)}`, 370, y, { width: 80, align: 'right' });
      doc.text(`${invoice.currency} ${Number(item.total).toFixed(2)}`, 450, y, { width: 100, align: 'right' });
      y += 18;
    }

    doc.moveTo(50, y + 5).lineTo(550, y + 5).stroke();

    // Totals
    y += 15;
    doc.font('Helvetica').fontSize(10);
    doc.text('Subtotal:', 370, y, { width: 80, align: 'right' });
    doc.text(`${invoice.currency} ${Number(invoice.subtotal).toFixed(2)}`, 450, y, { width: 100, align: 'right' });
    y += 16;
    if (invoice.tax_amount && parseFloat(invoice.tax_amount) > 0) {
      doc.text('Tax:', 370, y, { width: 80, align: 'right' });
      doc.text(`${invoice.currency} ${Number(invoice.tax_amount).toFixed(2)}`, 450, y, { width: 100, align: 'right' });
      y += 16;
    }
    doc.font('Helvetica-Bold');
    doc.text('Total:', 370, y, { width: 80, align: 'right' });
    doc.text(`${invoice.currency} ${Number(invoice.total).toFixed(2)}`, 450, y, { width: 100, align: 'right' });
    y += 16;
    doc.font('Helvetica');
    doc.text('Amount Due:', 370, y, { width: 80, align: 'right' });
    doc.text(`${invoice.currency} ${Number(invoice.amount_due).toFixed(2)}`, 450, y, { width: 100, align: 'right' });

    // Notes
    if (invoice.notes) {
      y += 30;
      doc.fontSize(9).font('Helvetica').text('Notes:', 50, y);
      doc.text(invoice.notes, 50, y + 12, { width: 500 });
    }

    // Footer
    doc.fontSize(8).font('Helvetica').text('Thank you for your business.', 50, 750, { align: 'center', width: 500 });

    doc.end();
  };

  getOne = async (req: Request, res: Response) => {
    const { id } = req.params;
    const invoice = await db('invoices').leftJoin('contacts', 'invoices.contact_id', 'contacts.id')
      .where({ 'invoices.id': id, 'invoices.tenant_id': req.tenant!.id }).whereNull('invoices.deleted_at')
      .select('invoices.*', db.raw("CONCAT(contacts.first_name, ' ', contacts.last_name) as contact_name"), 'contacts.email as contact_email')
      .first();
    if (!invoice) throw new NotFoundError('Invoice');

    const items = await db('invoice_items').where({ invoice_id: id }).orderBy('sort_order');
    const payments = await db('payments').where({ invoice_id: id }).orderBy('created_at', 'desc');
    res.json({ success: true, data: { invoice, items, payments } });
  };

  send = async (req: Request, res: Response) => {
    const { id } = req.params;
    const invoice = await db('invoices').leftJoin('contacts', 'invoices.contact_id', 'contacts.id')
      .where({ 'invoices.id': id, 'invoices.tenant_id': req.tenant!.id }).whereNull('invoices.deleted_at')
      .select('invoices.*', 'contacts.email as contact_email', db.raw("CONCAT(contacts.first_name, ' ', contacts.last_name) as contact_name"))
      .first();
    if (!invoice) throw new NotFoundError('Invoice');

    const recipientEmail = req.body.email || invoice.contact_email;
    if (!recipientEmail) throw new AppError('No recipient email available', 400, 'NO_EMAIL');

    const tenant = await db('tenants').where({ id: req.tenant!.id }).first();
    await EmailService.sendCustomEmail({
      to: recipientEmail, subject: `Invoice ${invoice.invoice_number} from ${tenant.name}`,
      body: `<h2>Invoice ${invoice.invoice_number}</h2><p>Amount Due: ${invoice.currency} ${Number(invoice.amount_due).toFixed(2)}</p>`,
      fromName: tenant.name,
    });

    await db('invoices').where({ id }).update({ status: invoice.status === 'draft' ? 'sent' : invoice.status, sent_at: new Date() });
    res.json({ success: true, message: `Invoice sent to ${recipientEmail}` });
  };

  markPaid = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { amount, method = 'manual' } = req.body;
    const invoice = await db('invoices').where({ id, tenant_id: req.tenant!.id }).whereNull('deleted_at').first();
    if (!invoice) throw new NotFoundError('Invoice');

    const paymentAmount = amount ? parseFloat(amount) : parseFloat(invoice.amount_due);
    await db.transaction(async (trx) => {
      await trx('payments').insert({ tenant_id: req.tenant!.id, invoice_id: id, contact_id: invoice.contact_id, amount: paymentAmount, currency: invoice.currency, method, status: 'completed' });
      const newPaid = parseFloat(invoice.amount_paid) + paymentAmount;
      const newDue = Math.max(0, parseFloat(invoice.total) - newPaid);
      await trx('invoices').where({ id }).update({ amount_paid: newPaid, amount_due: newDue, status: newDue <= 0 ? 'paid' : 'partial', paid_at: newDue <= 0 ? new Date() : null });
    });

    res.json({ success: true, message: 'Invoice marked as paid' });
  };

  stats = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const summary = await db('invoices').where({ tenant_id: tenantId }).whereNull('deleted_at')
      .select(
        db.raw('COUNT(*) as total_count'), db.raw('SUM(total) as total_value'),
        db.raw("SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END) as paid_value"),
        db.raw("SUM(CASE WHEN status = 'overdue' THEN amount_due ELSE 0 END) as overdue_value"),
        db.raw("SUM(CASE WHEN status IN ('sent','viewed','partial') THEN amount_due ELSE 0 END) as outstanding_value")
      ).first();
    res.json({ success: true, data: { summary } });
  };
}
