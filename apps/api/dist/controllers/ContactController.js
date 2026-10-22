"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactController = void 0;
const database_1 = require("../lib/database");
const errors_1 = require("../lib/errors");
const index_1 = require("../services/index");
class ContactController {
    list = async (req, res) => {
        const tenantId = req.tenant.id;
        const { page = 1, limit = 25, search, type, sortBy = 'created_at', sortDir = 'desc' } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        let query = (0, database_1.db)('contacts').where({ 'contacts.tenant_id': tenantId }).whereNull('contacts.deleted_at');
        if (type)
            query = query.where('contacts.type', type);
        if (search) {
            query = query.where((q) => {
                q.whereILike('contacts.first_name', `%${search}%`).orWhereILike('contacts.last_name', `%${search}%`)
                    .orWhereILike('contacts.email', `%${search}%`).orWhereILike('contacts.company_name', `%${search}%`);
            });
        }
        const [{ count }] = await query.clone().count('id as count');
        const contacts = await query.clone()
            .leftJoin('users as owner', 'contacts.owner_id', 'owner.id')
            .select('contacts.*', database_1.db.raw("CONCAT(owner.first_name, ' ', owner.last_name) as owner_name"))
            .orderBy(`contacts.${sortBy}`, sortDir).limit(parseInt(limit)).offset(offset);
        res.json({
            success: true,
            data: { contacts, pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(count), totalPages: Math.ceil(parseInt(count) / parseInt(limit)) } },
        });
    };
    create = async (req, res) => {
        const tenantId = req.tenant.id;
        const { firstName, lastName, email, phone, companyName, jobTitle, type = 'lead', leadSource } = req.body;
        if (email) {
            const existing = await (0, database_1.db)('contacts').where({ tenant_id: tenantId, email }).whereNull('deleted_at').first();
            if (existing)
                throw new errors_1.AppError('A contact with this email already exists', 409, 'DUPLICATE_CONTACT');
        }
        const [contact] = await (0, database_1.db)('contacts').insert({
            tenant_id: tenantId, owner_id: req.user.id, first_name: firstName, last_name: lastName,
            email, phone, company_name: companyName, job_title: jobTitle, type, lead_source: leadSource,
            email_subscribed: true, tags: [],
        }).returning('*');
        index_1.AuditService.log({ tenantId, userId: req.user.id, action: 'contact.create', resourceType: 'contact', resourceId: contact.id, ip: req.ip });
        res.status(201).json({ success: true, data: { contact } });
    };
    getOne = async (req, res) => {
        const { id } = req.params;
        const contact = await (0, database_1.db)('contacts').where({ id, tenant_id: req.tenant.id }).whereNull('deleted_at').first();
        if (!contact)
            throw new errors_1.NotFoundError('Contact');
        const [deals, activities] = await Promise.all([
            (0, database_1.db)('deals').where({ contact_id: id, tenant_id: req.tenant.id }).whereNull('deleted_at').orderBy('created_at', 'desc').limit(10),
            (0, database_1.db)('activities').where({ contact_id: id, tenant_id: req.tenant.id }).orderBy('created_at', 'desc').limit(20),
        ]);
        res.json({ success: true, data: { contact, deals, activities } });
    };
    update = async (req, res) => {
        const { id } = req.params;
        const contact = await (0, database_1.db)('contacts').where({ id, tenant_id: req.tenant.id }).whereNull('deleted_at').first();
        if (!contact)
            throw new errors_1.NotFoundError('Contact');
        const allowed = ['first_name', 'last_name', 'email', 'phone', 'company_name', 'job_title', 'type', 'status', 'lead_score', 'notes'];
        const fieldMap = { firstName: 'first_name', lastName: 'last_name', companyName: 'company_name', jobTitle: 'job_title', leadScore: 'lead_score' };
        const update = { updated_at: new Date() };
        for (const key of Object.keys(req.body)) {
            const dbKey = fieldMap[key] || (allowed.includes(key) ? key : null);
            if (dbKey)
                update[dbKey] = req.body[key];
        }
        const [updated] = await (0, database_1.db)('contacts').where({ id }).update(update).returning('*');
        res.json({ success: true, data: { contact: updated } });
    };
    delete = async (req, res) => {
        const { id } = req.params;
        const contact = await (0, database_1.db)('contacts').where({ id, tenant_id: req.tenant.id }).whereNull('deleted_at').first();
        if (!contact)
            throw new errors_1.NotFoundError('Contact');
        await (0, database_1.db)('contacts').where({ id }).update({ deleted_at: new Date() });
        res.json({ success: true, message: 'Contact deleted' });
    };
    stats = async (req, res) => {
        const tenantId = req.tenant.id;
        const [byType, totalDealsValue] = await Promise.all([
            (0, database_1.db)('contacts').where({ tenant_id: tenantId }).whereNull('deleted_at').groupBy('type').select('type', database_1.db.raw('COUNT(*) as count')),
            (0, database_1.db)('deals').where({ tenant_id: tenantId, status: 'open' }).whereNull('deleted_at').sum('amount as total'),
        ]);
        res.json({ success: true, data: { byType, totalDealsValue: totalDealsValue[0]?.total || 0 } });
    };
}
exports.ContactController = ContactController;
//# sourceMappingURL=ContactController.js.map