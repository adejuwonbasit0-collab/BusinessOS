'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Mail, Building2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const SAMPLE_USERS = [
  { id: '1', first_name: 'James', last_name: 'Donovan', email: 'james@acmecorp.com', role: 'owner', tenant_name: 'Acme Corp', last_login_at: new Date() },
  { id: '2', first_name: 'Sarah', last_name: 'Reynolds', email: 'sarah@acmecorp.com', role: 'admin', tenant_name: 'Acme Corp', last_login_at: new Date(Date.now() - 3600000) },
  { id: '3', first_name: 'Alex', last_name: 'Chen', email: 'owner@studioblue.io', role: 'owner', tenant_name: 'Studio Blue', last_login_at: new Date(Date.now() - 86400000) },
  { id: '4', first_name: 'Marcus', last_name: 'Kim', email: 'm.kim@nexuslabs.co', role: 'owner', tenant_name: 'Nexus Labs', last_login_at: new Date(Date.now() - 2 * 86400000) },
];

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users-list', search],
    queryFn: () => adminApi.listAllUsers({ search: search || undefined, limit: 50 }),
  });

  const users = (data as any)?.data?.users || SAMPLE_USERS;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">All Users</h1>
        <p className="text-sm text-muted-foreground mt-1">Every user across every tenant on the platform</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">User</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Tenant</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Active</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u: any) => (
              <tr key={u.id} className="hover:bg-muted/20">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                      {u.first_name?.charAt(0)}{u.last_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{u.first_name} {u.last_name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3"><Badge variant="outline" className="capitalize">{u.role}</Badge></td>
                <td className="p-3 text-muted-foreground flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{u.tenant_name}</td>
                <td className="p-3 text-xs text-muted-foreground">
                  {u.last_login_at ? formatDistanceToNow(new Date(u.last_login_at), { addSuffix: true }) : 'Never'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
