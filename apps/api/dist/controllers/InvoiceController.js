"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceController = void 0;
const database_1 = require("../lib/database");
const errors_1 = require("../lib/errors");
const index_1 = require("../services/index");
const EmailService_1 = require("../services/EmailService");
const validation_1 = require("../lib/validation");
class InvoiceController {
    list = async (req, res) => {
        const tenantId = req.tenant.id;
        const { page = 1, limit = 25, status, search } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        let query = (0, database_1.db)('invoices').leftJoin('contacts', 'invoices.contact_id', 'contacts.id')
            .where({ 'invoices.tenant_id': tenantId }).whereNull('invoices.deleted_at');
        if (status)
            query = query.where('invoices.status', status);
        if (search)
            query = query.whereILike('invoices.invoice_number', `%${search}%`);
        const [{ count }] = await query.clone().count('invoices.id as count');
        const invoices = await query.clone()
            .select('invoices.*', database_1.db.raw("CONCAT(contacts.first_name, ' ', contacts.last_name) as contact_name"), 'contacts.email as contact_email', 'contacts.company_name')
            .orderBy('invoices.created_at', 'desc').limit(parseInt(limit)).offset(offset);
        res.json({
            success: true,
            data: { invoices, pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(count), totalPages: Math.ceil(parseInt(count) / parseInt(limit)) } },
        });
    };
    create = async (req, res) => {
        const tenantId = req.tenant.id;
        const { contactId, items, notes, dueDate, currency } = req.body;
        const tenant = await (0, database_1.db)('tenants').where({ id: tenantId }).first();
        const [{ count }] = await (0, database_1.db)('invoices').where({ tenant_id: tenantId }).count('id as count');
        const invoiceNumber = `INV-${new Date().getFullYear()}-${String(parseInt(count) + 1).padStart(4, '0')}`;
        let subtotal = 0;
        const lineItems = (items || []).map((item, i) => {
            const quantity = parseFloat(item.quantity);
            const unitPrice = parseFloat(item.unitPrice);
            const lineTotal = quantity * unitPrice;
            subtotal += lineTotal;
            return {
                name: (0, validation_1.lineItemName)(item),
                description: item.description || null,
                quantity,
                unit_price: unitPrice,
                total: lineTotal,
                sort_order: i,
            };
        });
        const [invoice] = await database_1.db.transaction(async (trx) => {
            const [inv] = await trx('invoices').insert({
                tenant_id: tenantId, contact_id: contactId || null, created_by: req.user.id,
                invoice_number: invoiceNumber, status: 'draft', subtotal, total: subtotal,
                amount_paid: 0, amount_due: subtotal, currency: currency || tenant.currency || 'USD',
                notes: notes || null, issue_date: new Date(), due_date: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 86400000),
            }).returning('*');
            if (lineItems.length > 0) {
                await trx('invoice_items').insert(lineItems.map((item) => ({ ...item, invoice_id: inv.id })));
            }
            return [inv];
        });
        index_1.AuditService.log({ tenantId, userId: req.user.id, action: 'invoice.create', resourceType: 'invoice', resourceId: invoice.id, ip: req.ip });
        res.status(201).json({ success: true, data: { invoice } });
    };
    getOne = async (req, res) => {
        const { id } = req.params;
        const invoice = await (0, database_1.db)('invoices').leftJoin('contacts', 'invoices.contact_id', 'contacts.id')
            .where({ 'invoices.id': id, 'invoices.tenant_id': req.tenant.id }).whereNull('invoices.deleted_at')
            .select('invoices.*', database_1.db.raw("CONCAT(contacts.first_name, ' ', contacts.last_name) as contact_name"), 'contacts.email as contact_email')
            .first();
        if (!invoice)
            throw new errors_1.NotFoundError('Invoice');
        const items = await (0, database_1.db)('invoice_items').where({ invoice_id: id }).orderBy('sort_order');
        const payments = await (0, database_1.db)('payments').where({ invoice_id: id }).orderBy('created_at', 'desc');
        res.json({ success: true, data: { invoice, items, payments } });
    };
    send = async (req, res) => {
        const { id } = req.params;
        const invoice = await (0, database_1.db)('invoices').leftJoin('contacts', 'invoices.contact_id', 'contacts.id')
            .where({ 'invoices.id': id, 'invoices.tenant_id': req.tenant.id }).whereNull('invoices.deleted_at')
            .select('invoices.*', 'contacts.email as contact_email', database_1.db.raw("CONCAT(contacts.first_name, ' ', contacts.last_name) as contact_name"))
            .first();
        if (!invoice)
            throw new errors_1.NotFoundError('Invoice');
        const recipientEmail = req.body.email || invoice.contact_email;
        if (!recipientEmail)
            throw new errors_1.AppError('No recipient email available', 400, 'NO_EMAIL');
        const tenant = await (0, database_1.db)('tenants').where({ id: req.tenant.id }).first();
        await EmailService_1.EmailService.sendCustomEmail({
            to: recipientEmail, subject: `Invoice ${invoice.invoice_number} from ${tenant.name}`,
            body: `<h2>Invoice ${invoice.invoice_number}</h2><p>Amount Due: ${invoice.currency} ${Number(invoice.amount_due).toFixed(2)}</p>`,
            fromName: tenant.name,
        });
        await (0, database_1.db)('invoices').where({ id }).update({ status: invoice.status === 'draft' ? 'sent' : invoice.status, sent_at: new Date() });
        res.json({ success: true, message: `Invoice sent to ${recipientEmail}` });
    };
    markPaid = async (req, res) => {
        const { id } = req.params;
        const { amount, method = 'manual' } = req.body;
        const invoice = await (0, database_1.db)('invoices').where({ id, tenant_id: req.tenant.id }).whereNull('deleted_at').first();
        if (!invoice)
            throw new errors_1.NotFoundError('Invoice');
        const paymentAmount = amount ? parseFloat(amount) : parseFloat(invoice.amount_due);
        await database_1.db.transaction(async (trx) => {
            await trx('payments').insert({ tenant_id: req.tenant.id, invoice_id: id, contact_id: invoice.contact_id, amount: paymentAmount, currency: invoice.currency, method, status: 'completed' });
            const newPaid = parseFloat(invoice.amount_paid) + paymentAmount;
            const newDue = Math.max(0, parseFloat(invoice.total) - newPaid);
            await trx('invoices').where({ id }).update({ amount_paid: newPaid, amount_due: newDue, status: newDue <= 0 ? 'paid' : 'partial', paid_at: newDue <= 0 ? new Date() : null });
        });
        res.json({ success: true, message: 'Invoice marked as paid' });
    };
    stats = async (req, res) => {
        const tenantId = req.tenant.id;
        const summary = await (0, database_1.db)('invoices').where({ tenant_id: tenantId }).whereNull('deleted_at')
            .select(database_1.db.raw('COUNT(*) as total_count'), database_1.db.raw('SUM(total) as total_value'), database_1.db.raw("SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END) as paid_value"), database_1.db.raw("SUM(CASE WHEN status = 'overdue' THEN amount_due ELSE 0 END) as overdue_value"), database_1.db.raw("SUM(CASE WHEN status IN ('sent','viewed','partial') THEN amount_due ELSE 0 END) as outstanding_value")).first();
        res.json({ success: true, data: { summary } });
    };
}
exports.InvoiceController = InvoiceController;
//# sourceMappingURL=InvoiceController.js.map