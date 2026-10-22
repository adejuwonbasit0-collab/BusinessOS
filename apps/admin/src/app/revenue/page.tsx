'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
} from 'recharts';
import { DollarSign } from 'lucide-react';

const SAMPLE_BY_PLAN = [
  { plan_name: 'Starter', tenant_count: 1842, mrr: 90258 },
  { plan_name: 'Pro', tenant_count: 1684, mrr: 250916 },
  { plan_name: 'Enterprise', tenant_count: 315, mrr: 157185 },
];

const COLORS = ['#14b8a6', '#a855f7', '#4f8ef7'];

export default function AdminRevenuePage() {
  const { data } = useQuery({
    queryKey: ['admin-revenue-overview'],
    queryFn: adminApi.revenueOverview,
  });

  const byPlan = (data as any)?.data?.byPlan || SAMPLE_BY_PLAN;
  const totalMRR = (data as any)?.data?.totalMRR || byPlan.reduce((s: number, p: any) => s + Number(p.mrr), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Revenue Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform-wide subscription revenue breakdown</p>
      </div>

      <Card className="border-violet-500/30 bg-gradient-to-br from-violet-600/10 to-transparent">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-violet-500/15 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-violet-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Monthly Recurring Revenue</p>
              <p className="text-3xl font-bold">${Number(totalMRR).toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">MRR by Plan</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byPlan}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="plan_name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}`, 'MRR']} />
                <Bar dataKey="mrr" radius={[6, 6, 0, 0]}>
                  {byPlan.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Tenant Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={byPlan} dataKey="tenant_count" nameKey="plan_name" cx="50%" cy="50%" outerRadius={90} paddingAngle={3}>
                  {byPlan.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              {byPlan.map((p: any, i: number) => (
                <div key={p.plan_name} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  {p.plan_name} ({p.tenant_count})
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
