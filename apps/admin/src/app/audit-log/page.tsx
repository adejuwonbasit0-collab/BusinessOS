'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, CheckCircle, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const SAMPLE_LOGS = [
  { id: '1', action: 'admin.tenant.suspend', description: 'Suspended tenant: CloudPeak (policy violation)', status: 'success', tenant_name: 'CloudPeak', user_email: 'admin@nexos.app', created_at: new Date(Date.now() - 3600000) },
  { id: '2', action: 'admin.tenant.impersonate', description: 'Impersonated owner of FinPro Group for support', status: 'success', tenant_name: 'FinPro Group', user_email: 'admin@nexos.app', created_at: new Date(Date.now() - 7200000) },
  { id: '3', action: 'user.login.failed', description: 'Failed admin login attempt', status: 'failure', tenant_name: null, user_email: null, created_at: new Date(Date.now() - 14400000) },
  { id: '4', action: 'admin.tenant.update', description: 'Updated plan for Acme Corp to Enterprise', status: 'success', tenant_name: 'Acme Corp', user_email: 'admin@nexos.app', created_at: new Date(Date.now() - 86400000) },
];

export default function AdminAuditLogPage() {
  const [search, setSearch] = useState('');

  const { data } = useQuery({
    queryKey: ['admin-audit-logs', search],
    queryFn: () => adminApi.auditLogs({ action: search || undefined, limit: 50 }),
  });

  const logs = (data as any)?.data?.logs || SAMPLE_LOGS;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-1">All super-admin actions across the platform</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Filter by action…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card className="overflow-hidden">
        <div className="divide-y">
          {logs.map((log: any) => (
            <div key={log.id} className={cn('flex items-start gap-3 p-4', log.status === 'failure' && 'bg-red-500/5')}>
              {log.status === 'success' ? (
                <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{log.description}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="font-mono">{log.action}</span>
                  {log.tenant_name && <span>· {log.tenant_name}</span>}
                  {log.user_email && <span>· {log.user_email}</span>}
                </div>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
