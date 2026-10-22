'use client';

import { useQuery } from '@tanstack/react-query';
import { documentsApi } from '@/lib/operationsApi';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, PenTool, CheckCircle, Clock } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground', pending_review: 'bg-amber-500/15 text-amber-600',
  pending_signature: 'bg-blue-500/15 text-blue-600', signed: 'bg-green-500/15 text-green-600',
  archived: 'bg-muted text-muted-foreground', expired: 'bg-red-500/15 text-red-600',
};

export default function DocumentsPage() {
  const { data: statsData } = useQuery({ queryKey: ['documents-stats'], queryFn: documentsApi.stats });
  const { data: docsData, isLoading } = useQuery({ queryKey: ['documents'], queryFn: () => documentsApi.list() });

  const stats = (statsData as any)?.data;
  const documents = (docsData as any)?.data?.documents || [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div><h1 className="text-2xl font-bold tracking-tight">Documents</h1><p className="text-sm text-muted-foreground mt-1">Contracts, policies, approvals, and e-signatures</p></div>
        <Button size="sm"><Plus className="h-4 w-4 mr-2" />Upload Document</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Pending Signature</p><p className="text-2xl font-bold">{stats?.pendingSignature ?? 0}</p></div><div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center"><PenTool className="h-4 w-4" /></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Pending Approval</p><p className="text-2xl font-bold">{stats?.pendingApproval ?? 0}</p></div><div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center"><Clock className="h-4 w-4" /></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Expiring Soon</p><p className="text-2xl font-bold">{stats?.expiringSoon ?? 0}</p></div><div className="w-9 h-9 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center"><Clock className="h-4 w-4" /></div></div></CardContent></Card>
      </div>

      <div className="rounded-xl border bg-card divide-y">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 skeleton" />)
        ) : documents.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground"><FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />No documents yet</div>
        ) : documents.map((doc: any) => (
          <div key={doc.id} className="flex items-center gap-3 p-4">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center"><FileText className="h-4 w-4 text-muted-foreground" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{doc.title}</p>
              <p className="text-xs text-muted-foreground capitalize">{doc.type}</p>
            </div>
            <Badge variant="outline" className={`capitalize ${STATUS_COLORS[doc.status] || ''}`}>{doc.status.replace('_', ' ')}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
