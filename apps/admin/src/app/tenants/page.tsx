'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Search, Building2, MoreHorizontal, Ban, CheckCircle, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  active:    { label: 'Active',    color: 'bg-green-500/10 text-green-600 border-green-500/20',  dot: 'bg-green-500' },
  trial:     { label: 'Trial',     color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',  dot: 'bg-amber-500' },
  suspended: { label: 'Suspended', color: 'bg-red-500/10 text-red-600 border-red-500/20',        dot: 'bg-red-500' },
  cancelled: { label: 'Cancelled', color: 'bg-muted text-muted-foreground border-border',        dot: 'bg-muted-foreground' },
  past_due:  { label: 'Past Due',  color: 'bg-orange-500/10 text-orange-600 border-orange-500/20', dot: 'bg-orange-500' },
};

const SAMPLE_TENANTS = [
  { id: '1', name: 'Acme Corp', subdomain: 'acmecorp', plan_name: 'Enterprise', status: 'active', users_count: 24, price_monthly: 49900, created_at: new Date('2023-10-01') },
  { id: '2', name: 'Nexus Labs', subdomain: 'nexuslabs', plan_name: 'Pro', status: 'active', users_count: 8, price_monthly: 14900, created_at: new Date('2023-11-01') },
  { id: '3', name: 'Studio Blue', subdomain: 'studioblue', plan_name: 'Starter', status: 'trial', users_count: 3, price_monthly: 0, created_at: new Date('2023-12-01') },
  { id: '4', name: 'BuildRight LLC', subdomain: 'buildright', plan_name: 'Enterprise', status: 'active', users_count: 41, price_monthly: 49900, created_at: new Date('2023-08-01') },
  { id: '5', name: 'FinPro Group', subdomain: 'finpro', plan_name: 'Pro', status: 'past_due', users_count: 12, price_monthly: 14900, created_at: new Date('2023-09-01') },
];

export default function AdminTenantsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState('');

  // `window.open` has to happen synchronously inside the click handler.
  // Calling it from the mutation's `onSuccess` — i.e. after an await — is
  // no longer a user gesture, so browsers block the popup and the button
  // looks like it does nothing at all.
  const impersonateWindow = useRef<Window | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tenants-list', search],
    queryFn: () => adminApi.listTenants({ search: search || undefined, limit: 50 }),
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) => adminApi.suspendTenant(id),
    onSuccess: () => { setActionError(''); qc.invalidateQueries({ queryKey: ['admin-tenants-list'] }); },
    onError: (err: any) => setActionError(err?.message || 'Could not suspend the tenant'),
  });

  const unsuspendMutation = useMutation({
    mutationFn: (id: string) => adminApi.unsuspendTenant(id),
    onSuccess: () => { setActionError(''); qc.invalidateQueries({ queryKey: ['admin-tenants-list'] }); },
    onError: (err: any) => setActionError(err?.message || 'Could not reactivate the tenant'),
  });

  const impersonateMutation = useMutation({
    mutationFn: (id: string) => adminApi.impersonateTenant(id),
    onSuccess: (res: any) => {
      setActionError('');
      const url = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
      const target = `${url}/dashboard?impersonation_token=${encodeURIComponent(res?.data?.token || '')}`;
      if (impersonateWindow.current && !impersonateWindow.current.closed) {
        impersonateWindow.current.location.href = target;
      } else {
        window.open(target, '_blank');
      }
    },
    onError: (err: any) => {
      setActionError(err?.message || 'Could not open the workspace');
      if (impersonateWindow.current && !impersonateWindow.current.closed) {
        impersonateWindow.current.close();
        impersonateWindow.current = null;
      }
    },
  });

  const tenants = (data as any)?.data?.tenants || SAMPLE_TENANTS;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tenant Management</h1>
          <p className="text-sm text-muted-foreground mt-1">{tenants.length} tenants on the platform</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search tenants…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {actionError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {actionError}
        </div>
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Tenant</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Plan</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="text-center p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Users</th>
              <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">MRR</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {tenants.map((tenant: any) => {
              const statusCfg = STATUS_CONFIG[tenant.status] || STATUS_CONFIG.active;
              return (
                <tr key={tenant.id} className="hover:bg-muted/20">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {tenant.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{tenant.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{tenant.subdomain}.nexos.app</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3"><Badge variant="outline">{tenant.plan_name}</Badge></td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                      <span className="text-xs font-medium">{statusCfg.label}</span>
                    </div>
                  </td>
                  <td className="p-3 text-center">{tenant.users_count}</td>
                  <td className="p-3 text-right font-semibold">
                    {tenant.price_monthly > 0 ? `$${(tenant.price_monthly / 100).toLocaleString()}` : <span className="text-muted-foreground font-normal">Trial</span>}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{format(new Date(tenant.created_at), 'MMM d, yyyy')}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Impersonate"
                        onClick={() => {
                          setActionError('');
                          impersonateWindow.current = window.open('about:blank', '_blank');
                          impersonateMutation.mutate(tenant.id);
                        }}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      {tenant.status === 'suspended' ? (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => unsuspendMutation.mutate(tenant.id)} title="Reactivate">
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" onClick={() => suspendMutation.mutate(tenant.id)} title="Suspend">
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
