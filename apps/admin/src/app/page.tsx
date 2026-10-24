'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Building2, Users, DollarSign, TrendingUp, TrendingDown,
  CheckCircle, Clock, AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

function StatCard({ label, value, change, icon: Icon, color }: any) {
  const colorMap: Record<string, string> = {
    violet: 'bg-violet-500/10 text-violet-500',
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    amber: 'bg-amber-500/10 text-amber-500',
  };
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
            <p className="text-2xl font-bold tabular-nums">{value}</p>
            {change && (
              <div className={`flex items-center gap-1 text-xs font-medium mt-1 ${change.type === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {change.type === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {change.value}
              </div>
            )}
          </div>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colorMap[color]}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminOverviewPage() {
  const { data: statsData, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-platform-stats'],
    queryFn: adminApi.platformStats,
  });

  const stats = (statsData as any)?.data;

  if (isError) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
        <div><h1 className="text-lg font-semibold">Platform data could not be loaded</h1><p className="mt-1 text-sm text-muted-foreground">Check that the API is running and sign in again if your session has expired.</p></div>
        <button onClick={() => refetch()} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time metrics across the entire NexOS platform</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Tenants"
          value={isLoading ? '—' : (stats?.tenants?.total ?? 0).toLocaleString()}
          change={isLoading ? undefined : { value: `+${stats?.tenants?.newThisMonth ?? 0} this month`, type: 'up' }}
          icon={Building2}
          color="violet"
        />
        <StatCard
          label="Platform MRR"
          value={isLoading ? '—' : `$${((stats?.mrr ?? 0) / 1000).toFixed(0)}k`}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          label="Total Users"
          value={isLoading ? '—' : (stats?.users?.total ?? 0).toLocaleString()}
          icon={Users}
          color="blue"
        />
        <StatCard
          label="Churn (monthly)"
          value={isLoading ? '—' : (stats?.tenants?.churnThisMonth ?? 0)}
          icon={AlertTriangle}
          color="amber"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="text-center">
          <CardContent className="pt-6">
            <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
            <p className="text-xl font-bold">{isLoading ? '—' : (stats?.tenants?.active ?? 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">Active Tenants</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6">
            <Clock className="h-6 w-6 text-amber-500 mx-auto mb-2" />
            <p className="text-xl font-bold">{isLoading ? '—' : (stats?.tenants?.trial ?? 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">On Trial</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6">
            <AlertTriangle className="h-6 w-6 text-red-500 mx-auto mb-2" />
            <p className="text-xl font-bold">{isLoading ? '—' : (stats?.tenants?.suspended ?? 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">Suspended</p>
          </CardContent>
        </Card>
      </div>

      {!isLoading && stats?.growth?.length > 0 && <Card>
        <CardHeader>
          <CardTitle className="text-base">Growth Trend — Last 6 Months</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={stats.growth}>
              <defs>
                <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}`, 'MRR']} />
              <Area type="monotone" dataKey="mrr" stroke="#a855f7" strokeWidth={2} fill="url(#mrrGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>}
    </div>
  );
}
