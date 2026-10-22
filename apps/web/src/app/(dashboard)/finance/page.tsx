'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, FileText, Send, CheckCircle, Download } from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-500/15 text-blue-600',
  paid: 'bg-green-500/15 text-green-600',
  overdue: 'bg-red-500/15 text-red-600',
  partial: 'bg-amber-500/15 text-amber-600',
};

export default function FinancePage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['invoices'], queryFn: () => invoicesApi.list({ limit: 25 }) });
  const { data: statsData } = useQuery({ queryKey: ['invoice-stats'], queryFn: () => invoicesApi.stats() });

  const sendMutation = useMutation({
    mutationFn: (id: string) => invoicesApi.send(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast({ title: 'Invoice sent' }); },
  });
  const markPaidMutation = useMutation({
    mutationFn: (id: string) => invoicesApi.markPaid(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast({ title: 'Marked as paid' }); },
  });

  const invoices = (data as any)?.data?.invoices || [];
  const stats = (statsData as any)?.data?.summary;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div><h1 className="text-2xl font-bold tracking-tight">Finance</h1><p className="text-sm text-muted-foreground mt-1">Invoices and payments</p></div>
        <Button size="sm"><Plus className="h-4 w-4 mr-2" />New Invoice</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Invoiced', value: stats?.total_value },
          { label: 'Paid', value: stats?.paid_value },
          { label: 'Outstanding', value: stats?.outstanding_value },
          { label: 'Overdue', value: stats?.overdue_value },
        ].map((s) => (
          <Card key={s.label}><CardContent className="pt-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{s.label}</p>
            <p className="text-2xl font-bold">${Number(s.value || 0).toLocaleString()}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-muted/30">
            <TableHead>Invoice</TableHead><TableHead>Customer</TableHead><TableHead>Status</TableHead>
            <TableHead className="text-right">Amount</TableHead><TableHead>Due Date</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><div className="h-4 skeleton rounded" /></TableCell>)}</TableRow>)
            ) : invoices.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-16 text-muted-foreground"><FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />No invoices yet</TableCell></TableRow>
            ) : invoices.map((inv: any) => (
              <TableRow key={inv.id}>
                <TableCell className="font-mono font-medium text-sm">{inv.invoice_number}</TableCell>
                <TableCell className="text-sm">{inv.contact_name || '—'}</TableCell>
                <TableCell><span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${STATUS_COLORS[inv.status] || ''}`}>{inv.status}</span></TableCell>
                <TableCell className="text-right font-semibold text-sm">${Number(inv.total).toLocaleString()}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{inv.due_date ? format(new Date(inv.due_date), 'MMM d, yyyy') : '—'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Download PDF" onClick={() => window.open(invoicesApi.downloadPdf(inv.id), '_blank')}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    {inv.status === 'draft' && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => sendMutation.mutate(inv.id)}><Send className="h-3.5 w-3.5" /></Button>}
                    {inv.status !== 'paid' && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => markPaidMutation.mutate(inv.id)}><CheckCircle className="h-3.5 w-3.5" /></Button>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
