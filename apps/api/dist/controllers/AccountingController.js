"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountingController = void 0;
const database_1 = require("../lib/database");
const errors_1 = require("../lib/errors");
class AccountingController {
    // ── Chart of accounts ──────────────────────────────────────────────────────
    listAccounts = async (req, res) => {
        const accounts = await (0, database_1.db)('chart_of_accounts').where({ tenant_id: req.tenant.id, is_active: true }).orderBy('code');
        res.json({ success: true, data: { accounts } });
    };
    createAccount = async (req, res) => {
        const { code, name, type, parentId } = req.body;
        const [account] = await (0, database_1.db)('chart_of_accounts').insert({
            tenant_id: req.tenant.id, code, name, type, parent_id: parentId || null,
        }).returning('*');
        res.status(201).json({ success: true, data: { account } });
    };
    // ── Journal entries (GL) ───────────────────────────────────────────────────
    listJournalEntries = async (req, res) => {
        const entries = await (0, database_1.db)('journal_entries').where({ tenant_id: req.tenant.id }).orderBy('entry_date', 'desc').limit(100);
        res.json({ success: true, data: { entries } });
    };
    createJournalEntry = async (req, res) => {
        const tenantId = req.tenant.id;
        const { entryDate, description, lines } = req.body; // lines: [{ accountId, debit, credit, memo }]
        if (!Array.isArray(lines) || lines.length === 0) {
            throw new errors_1.ValidationError([{ field: 'lines', message: '"lines" must be a non-empty array' }]);
        }
        const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
        const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            throw new errors_1.AppError('Journal entry must balance: total debits must equal total credits', 400, 'UNBALANCED_ENTRY');
        }
        const [{ count }] = await (0, database_1.db)('journal_entries').where({ tenant_id: tenantId }).count('id as count');
        const entryNumber = `JE-${new Date().getFullYear()}-${String(parseInt(count) + 1).padStart(5, '0')}`;
        const [entry] = await database_1.db.transaction(async (trx) => {
            const [e] = await trx('journal_entries').insert({
                tenant_id: tenantId, entry_number: entryNumber, entry_date: entryDate, description, created_by: req.user.id,
            }).returning('*');
            await trx('journal_entry_lines').insert(lines.map((l) => ({
                journal_entry_id: e.id, account_id: l.accountId, debit: l.debit || 0, credit: l.credit || 0, memo: l.memo,
            })));
            return [e];
        });
        res.status(201).json({ success: true, data: { entry } });
    };
    // ── General ledger report (per-account balance) ───────────────────────────
    generalLedger = async (req, res) => {
        const tenantId = req.tenant.id;
        const { accountId } = req.query;
        let query = (0, database_1.db)('journal_entry_lines')
            .join('journal_entries', 'journal_entry_lines.journal_entry_id', 'journal_entries.id')
            .join('chart_of_accounts', 'journal_entry_lines.account_id', 'chart_of_accounts.id')
            .where({ 'journal_entries.tenant_id': tenantId });
        if (accountId)
            query = query.where('journal_entry_lines.account_id', accountId);
        const lines = await query.select('journal_entry_lines.*', 'journal_entries.entry_date', 'journal_entries.entry_number', 'journal_entries.description', 'chart_of_accounts.name as account_name', 'chart_of_accounts.code as account_code').orderBy('journal_entries.entry_date', 'desc');
        res.json({ success: true, data: { lines } });
    };
    // ── Budgets ────────────────────────────────────────────────────────────────
    listBudgets = async (req, res) => {
        const { fiscalYear } = req.query;
        let query = (0, database_1.db)('budgets').where({ tenant_id: req.tenant.id });
        if (fiscalYear)
            query = query.where('fiscal_year', fiscalYear);
        const budgets = await query.orderBy('name');
        res.json({ success: true, data: { budgets } });
    };
    createBudget = async (req, res) => {
        const { name, category, fiscalYear, allocatedAmount, departmentId, branchId } = req.body;
        const [budget] = await (0, database_1.db)('budgets').insert({
            tenant_id: req.tenant.id, name, category, fiscal_year: fiscalYear, allocated_amount: allocatedAmount,
            department_id: departmentId || null, branch_id: branchId || null,
        }).returning('*');
        res.status(201).json({ success: true, data: { budget } });
    };
    // ── Tax ────────────────────────────────────────────────────────────────────
    listTaxRates = async (req, res) => {
        const rates = await (0, database_1.db)('tax_rates').where({ tenant_id: req.tenant.id, is_active: true }).orderBy('name');
        res.json({ success: true, data: { rates } });
    };
    createTaxRate = async (req, res) => {
        const { name, rate, jurisdiction, isDefault } = req.body;
        const [taxRate] = await (0, database_1.db)('tax_rates').insert({
            tenant_id: req.tenant.id, name, rate, jurisdiction, is_default: !!isDefault,
        }).returning('*');
        res.status(201).json({ success: true, data: { taxRate } });
    };
    // ── Cash flow report ───────────────────────────────────────────────────────
    cashFlow = async (req, res) => {
        const tenantId = req.tenant.id;
        const since = new Date(Date.now() - 90 * 86400000);
        const [inflow, outflow] = await Promise.all([
            (0, database_1.db)('payments').where({ tenant_id: tenantId, status: 'completed' }).where('paid_at', '>=', since).sum('amount as total').first(),
            (0, database_1.db)('expenses').where({ tenant_id: tenantId, status: 'approved' }).where('expense_date', '>=', since).sum('amount as total').first(),
        ]);
        const cashIn = parseFloat(inflow?.total || '0');
        const cashOut = parseFloat(outflow?.total || '0');
        res.json({ success: true, data: { cashIn, cashOut, netCashFlow: cashIn - cashOut } });
    };
    // ── Financial statements (simplified P&L) ─────────────────────────────────
    profitAndLoss = async (req, res) => {
        const tenantId = req.tenant.id;
        const { startDate, endDate } = req.query;
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 86400000);
        const end = endDate ? new Date(endDate) : new Date();
        const [revenue, expenses] = await Promise.all([
            (0, database_1.db)('invoices').where({ tenant_id: tenantId, status: 'paid' }).whereBetween('paid_at', [start, end]).sum('total as total').first(),
            (0, database_1.db)('expenses').where({ tenant_id: tenantId, status: 'approved' }).whereBetween('expense_date', [start, end]).sum('amount as total').first(),
        ]);
        const totalRevenue = parseFloat(revenue?.total || '0');
        const totalExpenses = parseFloat(expenses?.total || '0');
        res.json({
            success: true,
            data: { revenue: totalRevenue, expenses: totalExpenses, netIncome: totalRevenue - totalExpenses, period: { start, end } },
        });
    };
}
exports.AccountingController = AccountingController;
//# sourceMappingURL=AccountingController.js.map