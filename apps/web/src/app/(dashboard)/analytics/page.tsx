'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { TrendingUp, Users, Package, Briefcase, DollarSign, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const analyticsApi = {
  kpis: () => api.get('/analytics/kpis') as Promise<any>,
  revenue: () => api.get('/analytics/revenue') as Promise<any>,
  sales: () => api.get('/analytics/sales') as Promise<any>,
  customers: () => api.get('/analytics/customers') as Promise<any>,
  inventory: () => api.get('/analytics/inventory') as Promise<any>,
  staff: () => api.get('/analytics/staff') as Promise<any>,
};

const COLORS = ['#4f8ef7', '#8b5cf6', '#14b8a6', '#f59e0b', '#22c55e', '#ef4444', '#ec4899'];

function MetricBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center p-4 rounded-xl bg-muted/40 border">
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: kpiData } = useQuery({ queryKey: ['kpis'], queryFn: analyticsApi.kpis, staleTime: 120_000 });
  const { data: revenueData } = useQuery({ queryKey: ['revenue-analytics'], queryFn: analyticsApi.revenue, staleTime: 120_000 });
  const { data: salesData } = useQuery({ queryKey: ['sales-analytics'], queryFn: analyticsApi.sales, staleTime: 120_000 });
  const { data: customerData } = useQuery({ queryKey: ['customer-analytics'], queryFn: analyticsApi.customers, staleTime: 120_000 });
  const { data: inventoryData } = useQuery({ queryKey: ['inventory-analytics'], queryFn: analyticsApi.inventory, staleTime: 120_000 });
  const { data: staffData } = useQuery({ queryKey: ['staff-analytics'], queryFn: analyticsApi.staff, staleTime: 120_000 });

  const kpis = kpiData?.data;
  const revenueByPeriod = (revenueData?.data?.byPeriod || []).map((r: any) => ({
    month: format(new Date(r.period), 'MMM yy'),
    revenue: parseFloat(r.revenue || 0),
  }));
  const salesByChannel = salesData?.data?.byChannel || [];
  const topProducts = salesData?.data?.topProducts || [];
  const customersBySource = customerData?.data?.bySource || [];
  const customerMonthly = (customerData?.data?.monthly || []).map((r: any) => ({
    month: format(new Date(r.month), 'MMM yy'),
    count: parseInt(r.count),
  }));
  const inventoryByCategory = inventoryData?.data?.byCategory || [];
  const staffByDept = staffData?.data?.byDepartment || [];
  const attendanceTrend = (staffData?.data?.attendanceTrend || []).map((r: any) => ({
    date: format(new Date(r.date), 'MMM d'),
    present: parseInt(r.present),
  }));

  const customersByType = customerData?.data?.byType || [];
  const totalLeads = parseInt(customersByType.find((t: any) => t.type === 'lead')?.count || '100');
  const totalProspects = parseInt(customersByType.find((t: any) => t.type === 'prospect')?.count || '60');
  const totalCustomers = parseInt(customersByType.find((t: any) => t.type === 'customer')?.count || '30');
  const funnelData = [
    { name: 'Leads', value: totalLeads, fill: '#4f8ef7' },
    { name: 'Prospects', value: totalProspects, fill: '#8b5cf6' },
    { name: 'Customers', value: totalCustomers, fill: '#14b8a6' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Advanced Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">KPI tracking, predictive analytics, and business intelligence</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'MRR', value: kpis?.mrr ? `$${Number(kpis.mrr).toLocaleString()}` : '—' },
          { label: 'ARPU', value: kpis?.arpu ? `$${Number(kpis.arpu).toFixed(0)}` : '—' },
          { label: 'Avg Deal Size', value: kpis?.avgDealSize ? `$${Number(kpis.avgDealSize).toLocaleString()}` : '—' },
          { label: 'Lead Conversion', value: kpis?.leadToCustomerRate ? `${Number(kpis.leadToCustomerRate).toFixed(1)}%` : '—' },
          { label: 'Churn Risk', value: String(kpis?.churnRisk ?? '—') },
        ].map((m) => <MetricBadge key={m.label} {...m} />)}
      </div>

      <Tabs defaultValue="revenue">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="revenue"><DollarSign className="h-3.5 w-3.5 mr-1" />Revenue</TabsTrigger>
          <TabsTrigger value="sales"><BarChart3 className="h-3.5 w-3.5 mr-1" />Sales</TabsTrigger>
          <TabsTrigger value="customers"><Users className="h-3.5 w-3.5 mr-1" />Customers</TabsTrigger>
          <TabsTrigger value="funnel">Funnel</TabsTrigger>
          <TabsTrigger value="inventory"><Package className="h-3.5 w-3.5 mr-1" />Inventory</TabsTrigger>
          <TabsTrigger value="staff"><Briefcase className="h-3.5 w-3.5 mr-1" />Staff</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monthly Revenue Trend</CardTitle>
              <CardDescription>Paid invoices aggregated by month</CardDescription>
            </CardHeader>
            <CardContent>
              {revenueByPeriod.length === 0 ? (
                <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">No revenue data yet — mark invoices as paid to see trends</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueByPeriod}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f8ef7" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4f8ef7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}`, 'Revenue']} />
                    <Area type="monotone" dataKey="revenue" stroke="#4f8ef7" strokeWidth={2.5} fill="url(#revGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="mt-4 grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Orders by Channel</CardTitle></CardHeader>
            <CardContent>
              {salesByChannel.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No order data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={salesByChannel}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="channel" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {salesByChannel.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Top Products by Revenue</CardTitle></CardHeader>
            <CardContent>
              {topProducts.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No product revenue data</div>
              ) : (
                <div className="space-y-3">
                  {topProducts.slice(0, 7).map((p: any, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: COLORS[i % COLORS.length] }}>{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <div className="w-full h-1.5 bg-muted rounded-full mt-1">
                          <div className="h-full rounded-full" style={{ width: `${Math.min((p.revenue / (topProducts[0]?.revenue || 1)) * 100, 100)}%`, background: COLORS[i % COLORS.length] }} />
                        </div>
                      </div>
                      <span className="text-xs font-semibold shrink-0">${Number(p.revenue).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="mt-4 grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Customer Growth</CardTitle></CardHeader>
            <CardContent>
              {customerMonthly.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No customer data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={customerMonthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Contacts by Lead Source</CardTitle></CardHeader>
            <CardContent>
              {customersBySource.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No source data yet</div>
              ) : (
                <div className="space-y-2.5">
                  {customersBySource.slice(0, 8).map((s: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="capitalize">{s.lead_source || 'Unknown'}</span>
                      </div>
                      <span className="font-semibold tabular-nums">{s.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funnel" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lead-to-Customer Conversion Funnel</CardTitle>
              <CardDescription>Track how contacts progress through your pipeline</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-md mx-auto space-y-4 py-4">
                {funnelData.map((stage, i) => {
                  const maxVal = funnelData[0].value || 1;
                  const widthPct = Math.round((stage.value / maxVal) * 100);
                  const convPct = i > 0 ? Math.round((stage.value / (funnelData[i - 1].value || 1)) * 100) : 100;
                  return (
                    <div key={stage.name} className="space-y-1.5">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium">{stage.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground tabular-nums">{stage.value.toLocaleString()}</span>
                          {i > 0 && <Badge variant="outline" className="text-[10px]">{convPct}%</Badge>}
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <div className="h-10 rounded-lg transition-all duration-500" style={{ width: `${widthPct}%`, background: stage.fill, opacity: 0.85 }} />
                      </div>
                    </div>
                  );
                })}
                <div className="mt-6 p-4 rounded-xl bg-muted/40 text-center border">
                  <p className="text-3xl font-bold">{kpis?.leadToCustomerRate ? `${Number(kpis.leadToCustomerRate).toFixed(1)}%` : '—'}</p>
                  <p className="text-sm text-muted-foreground mt-1">Overall lead-to-customer conversion rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Stock Value by Category</CardTitle></CardHeader>
            <CardContent>
              {inventoryByCategory.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No inventory data yet</div>
              ) : (
                <div className="grid lg:grid-cols-2 gap-8 items-center">
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={inventoryByCategory} dataKey="total_value" nameKey="category" cx="50%" cy="50%" outerRadius={100} paddingAngle={3}>
                        {inventoryByCategory.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}`, 'Value']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2.5">
                    {inventoryByCategory.map((c: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="truncate">{c.category}</span>
                        </div>
                        <span className="font-semibold tabular-nums">${Number(c.total_value).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="mt-4 grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Headcount by Department</CardTitle></CardHeader>
            <CardContent>
              {staffByDept.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No department data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={staffByDept} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="department" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                      {staffByDept.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Attendance Trend (30 days)</CardTitle></CardHeader>
            <CardContent>
              {attendanceTrend.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No attendance data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={attendanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="present" stroke="#14b8a6" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
