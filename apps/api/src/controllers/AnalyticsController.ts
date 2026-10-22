import { Request, Response } from 'express';
import { db } from '../lib/database';

export class AnalyticsController {
  dashboard = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { period = '30d' } = req.query as any;
    const days = parseInt(period) || 30;
    const since = new Date(Date.now() - days * 86400000);

    const [revenue, contacts, workflows, taskStats] = await Promise.all([
      db('invoices').where({ tenant_id: tenantId, status: 'paid' }).where('paid_at', '>=', since).sum('total as total').first(),
      db('contacts').where({ tenant_id: tenantId }).whereNull('deleted_at').count('id as count').first(),
      db('workflows').where({ tenant_id: tenantId, status: 'active' }).count('id as count').first(),
      db('activities').where({ tenant_id: tenantId }).where('created_at', '>=', since)
        .select(db.raw('COUNT(*) as total'), db.raw("COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed")).first(),
    ]);

    const taskTotal = parseInt((taskStats as any)?.total || '0');
    const taskCompleted = parseInt((taskStats as any)?.completed || '0');

    res.json({
      success: true,
      data: {
        stats: {
          totalRevenue: parseFloat((revenue as any)?.total || '0'),
          activeCustomers: parseInt((contacts as any)?.count || '0'),
          activeWorkflows: parseInt((workflows as any)?.count || '0'),
          taskCompletion: taskTotal > 0 ? Math.round((taskCompleted / taskTotal) * 1000) / 10 : 0,
        },
      },
    });
  };

  revenue = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { period = '90d' } = req.query as any;
    const days = parseInt(period) || 90;
    const since = new Date(Date.now() - days * 86400000);

    const byPeriod = await db.raw(`
      SELECT DATE_TRUNC('month', paid_at) as period, SUM(total) as revenue, COUNT(*) as invoice_count
      FROM invoices WHERE tenant_id = ? AND status = 'paid' AND paid_at >= ?
      GROUP BY DATE_TRUNC('month', paid_at) ORDER BY period ASC
    `, [tenantId, since]);

    res.json({ success: true, data: { byPeriod: (byPeriod as any).rows } });
  };

  // ── Executive dashboard — rich multi-source overview ──────────────────────
  executive = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const now = new Date();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      revenueCurrent, revenuePrev,
      expensesCurrent, expensesPrev,
      ordersCurrent, ordersPrev,
      customerCount, customerCountPrev,
      inventoryValue, lowStockCount,
      headcount, presentToday,
      openDeals, overdueInvoices,
      revenueByMonth, taskStats,
    ] = await Promise.all([
      db('invoices').where({ tenant_id: tenantId, status: 'paid' }).where('paid_at', '>=', thisMonthStart).sum('total as total').first(),
      db('invoices').where({ tenant_id: tenantId, status: 'paid' }).whereBetween('paid_at', [lastMonthStart, lastMonthEnd]).sum('total as total').first(),
      db('expenses').where({ tenant_id: tenantId, status: 'approved' }).where('expense_date', '>=', thisMonthStart).sum('amount as total').first(),
      db('expenses').where({ tenant_id: tenantId, status: 'approved' }).whereBetween('expense_date', [lastMonthStart, lastMonthEnd]).sum('amount as total').first(),
      db('sales_orders').where({ tenant_id: tenantId }).where('created_at', '>=', thisMonthStart).count('id as count').first(),
      db('sales_orders').where({ tenant_id: tenantId }).whereBetween('created_at', [lastMonthStart, lastMonthEnd]).count('id as count').first(),
      db('contacts').where({ tenant_id: tenantId, type: 'customer' }).whereNull('deleted_at').count('id as count').first(),
      db('contacts').where({ tenant_id: tenantId, type: 'customer' }).whereNull('deleted_at').where('created_at', '<', thirtyDaysAgo).count('id as count').first(),
      db('stock_levels').join('products', 'stock_levels.product_id', 'products.id').where({ 'stock_levels.tenant_id': tenantId }).sum(db.raw('stock_levels.quantity_on_hand * products.cost')).first(),
      db('stock_levels').join('products', 'stock_levels.product_id', 'products.id').where({ 'stock_levels.tenant_id': tenantId }).whereRaw('stock_levels.quantity_available <= products.reorder_point').count('stock_levels.id as count').first(),
      db('users').where({ tenant_id: tenantId, status: 'active' }).whereNull('deleted_at').count('id as count').first(),
      db('attendance_records').where({ tenant_id: tenantId, date: now.toISOString().slice(0, 10) }).count('id as count').first(),
      db('deals').where({ tenant_id: tenantId, status: 'open' }).whereNull('deleted_at').count('id as count').first(),
      db('invoices').where({ tenant_id: tenantId, status: 'overdue' }).whereNull('deleted_at').count('id as count').first(),
      db.raw(`
        SELECT DATE_TRUNC('month', paid_at) as month, SUM(total) as revenue
        FROM invoices WHERE tenant_id = ? AND status = 'paid' AND paid_at >= ?
        GROUP BY DATE_TRUNC('month', paid_at) ORDER BY month ASC
      `, [tenantId, sixtyDaysAgo]),
      db('tasks').where({ tenant_id: tenantId }).whereNull('deleted_at')
        .select(db.raw('COUNT(*) as total'), db.raw("SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed")).first(),
    ]);

    const revCurr = parseFloat((revenueCurrent as any)?.total || '0');
    const revPrev = parseFloat((revenuePrev as any)?.total || '0');
    const expCurr = parseFloat((expensesCurrent as any)?.total || '0');
    const expPrev = parseFloat((expensesPrev as any)?.total || '0');
    const ordCurr = parseInt((ordersCurrent as any)?.count || '0');
    const ordPrev = parseInt((ordersPrev as any)?.count || '0');
    const custCurr = parseInt((customerCount as any)?.count || '0');
    const custPrev = parseInt((customerCountPrev as any)?.count || '0');

    const pct = (curr: number, prev: number) => prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 0;

    // Simplified 3-month revenue forecast (linear trend extrapolation)
    const months = (revenueByMonth as any).rows || [];
    const avgRevenue = months.length > 0 ? months.reduce((s: number, m: any) => s + parseFloat(m.revenue), 0) / months.length : 0;
    const forecast = [1, 2, 3].map((i) => ({
      month: new Date(now.getFullYear(), now.getMonth() + i, 1).toISOString().slice(0, 7),
      projectedRevenue: Math.round(avgRevenue * (1 + (0.05 * i))),
    }));

    const taskTotal = parseInt((taskStats as any)?.total || '0');
    const taskCompleted = parseInt((taskStats as any)?.completed || '0');

    res.json({
      success: true,
      data: {
        revenue: { current: revCurr, previous: revPrev, changePercent: pct(revCurr, revPrev) },
        profit: { current: revCurr - expCurr, previous: revPrev - expPrev, changePercent: pct(revCurr - expCurr, revPrev - expPrev) },
        expenses: { current: expCurr, previous: expPrev, changePercent: pct(expCurr, expPrev) },
        orders: { current: ordCurr, previous: ordPrev, changePercent: pct(ordCurr, ordPrev) },
        customers: { current: custCurr, newThisMonth: custCurr - custPrev },
        inventory: { totalValue: parseFloat((inventoryValue as any)?.sum || '0'), lowStockCount: parseInt((lowStockCount as any)?.count || '0') },
        staff: { headcount: parseInt((headcount as any)?.count || '0'), presentToday: parseInt((presentToday as any)?.count || '0') },
        alerts: { openDeals: parseInt((openDeals as any)?.count || '0'), overdueInvoices: parseInt((overdueInvoices as any)?.count || '0') },
        tasks: { total: taskTotal, completed: taskCompleted, completionRate: taskTotal > 0 ? Math.round((taskCompleted / taskTotal) * 100) : 0 },
        revenueByMonth: months,
        forecast,
      },
    });
  };

  // ── Advanced analytics — KPIs, cohort, funnel ─────────────────────────────
  kpis = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const thirtyDays = new Date(Date.now() - 30 * 86400000);
    const ninetyDays = new Date(Date.now() - 90 * 86400000);

    const [mrr, arpu, churnCandidates, avgDealSize, conversionRate] = await Promise.all([
      db('invoices').where({ tenant_id: tenantId, status: 'paid', is_recurring: true }).where('paid_at', '>=', thirtyDays).sum('total as total').first(),
      db('payments').where({ tenant_id: tenantId, status: 'completed' }).where('paid_at', '>=', thirtyDays)
        .select(db.raw('SUM(amount) / NULLIF(COUNT(DISTINCT contact_id), 0) as arpu')).first(),
      db('contacts').where({ tenant_id: tenantId, type: 'customer' }).where('last_contacted_at', '<', ninetyDays).count('id as count').first(),
      db('deals').where({ tenant_id: tenantId, status: 'won' }).whereNull('deleted_at').avg('amount as avg').first(),
      db.raw(`
        SELECT
          COUNT(CASE WHEN type = 'customer' THEN 1 END)::float /
          NULLIF(COUNT(CASE WHEN type = 'lead' THEN 1 END), 0) * 100 as rate
        FROM contacts WHERE tenant_id = ?
      `, [tenantId]),
    ]);

    res.json({
      success: true,
      data: {
        mrr: parseFloat((mrr as any)?.total || '0'),
        arpu: parseFloat((arpu as any)?.arpu || '0'),
        churnRisk: parseInt((churnCandidates as any)?.count || '0'),
        avgDealSize: parseFloat((avgDealSize as any)?.avg || '0'),
        leadToCustomerRate: parseFloat((conversionRate as any).rows?.[0]?.rate || '0'),
      },
    });
  };

  // ── Sales analytics ────────────────────────────────────────────────────────
  salesAnalytics = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const since = new Date(Date.now() - 90 * 86400000);

    const [byChannel, topProducts, byStatus] = await Promise.all([
      db('sales_orders').where({ tenant_id: tenantId }).where('created_at', '>=', since)
        .groupBy('channel').select('channel', db.raw('COUNT(*) as count, SUM(total) as revenue')),
      db('sales_order_items').join('sales_orders', 'sales_order_items.order_id', 'sales_orders.id')
        .join('products', 'sales_order_items.product_id', 'products.id')
        .where({ 'sales_orders.tenant_id': tenantId }).where('sales_orders.created_at', '>=', since)
        .groupBy('products.id', 'products.name').select('products.name', db.raw('SUM(sales_order_items.total) as revenue, SUM(sales_order_items.quantity) as units'))
        .orderBy('revenue', 'desc').limit(10),
      db('sales_orders').where({ tenant_id: tenantId }).where('created_at', '>=', since)
        .groupBy('status').select('status', db.raw('COUNT(*) as count')),
    ]);

    res.json({ success: true, data: { byChannel, topProducts, byStatus } });
  };

  // ── Customer analytics ─────────────────────────────────────────────────────
  customerAnalytics = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const byType = await db('contacts').where({ tenant_id: tenantId }).whereNull('deleted_at').groupBy('type').select('type', db.raw('COUNT(*) as count'));
    const bySource = await db('contacts').where({ tenant_id: tenantId }).whereNull('deleted_at').groupBy('lead_source').select('lead_source', db.raw('COUNT(*) as count')).orderBy('count', 'desc');
    const monthly = await db.raw(`
      SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as count
      FROM contacts WHERE tenant_id = ? GROUP BY month ORDER BY month ASC LIMIT 12
    `, [tenantId]);

    res.json({ success: true, data: { byType, bySource, monthly: (monthly as any).rows } });
  };

  // ── Inventory analytics ────────────────────────────────────────────────────
  inventoryAnalytics = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const byCategory = await db('stock_levels').join('products', 'stock_levels.product_id', 'products.id')
      .join('product_categories', 'products.category_id', 'product_categories.id')
      .where({ 'stock_levels.tenant_id': tenantId })
      .groupBy('product_categories.name').select('product_categories.name as category', db.raw('SUM(stock_levels.quantity_on_hand) as total_units, SUM(stock_levels.quantity_on_hand * products.cost) as total_value'));

    res.json({ success: true, data: { byCategory } });
  };

  // ── Staff analytics ────────────────────────────────────────────────────────
  staffAnalytics = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const [byDepartment, byRole, attendanceTrend] = await Promise.all([
      db('users').join('departments', 'users.department_id', 'departments.id').where({ 'users.tenant_id': tenantId }).whereNull('users.deleted_at')
        .groupBy('departments.name').select('departments.name as department', db.raw('COUNT(*) as count')),
      db('users').where({ tenant_id: tenantId }).whereNull('deleted_at').groupBy('role').select('role', db.raw('COUNT(*) as count')),
      db.raw(`
        SELECT date, COUNT(*) as present FROM attendance_records
        WHERE tenant_id = ? AND date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY date ORDER BY date ASC
      `, [tenantId]),
    ]);

    res.json({ success: true, data: { byDepartment, byRole, attendanceTrend: (attendanceTrend as any).rows } });
  };
}
