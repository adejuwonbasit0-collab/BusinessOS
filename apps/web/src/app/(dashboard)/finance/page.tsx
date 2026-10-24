'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const [createOpen, setCreateOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ customer: '', description: '', quantity: '1', unitPrice: '', dueDate: '' });
  const [templateKey, setTemplateKey] = useState('classic');
  useEffect(() => setTemplateKey(window.localStorage.getItem('nexos:invoice-template') || 'classic'), []);
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
  const createMutation = useMutation({
    mutationFn: (payload: any) => invoicesApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['invoice-stats'] });
      setCreateOpen(false);
      setInvoiceForm({ customer: '', description: '', quantity: '1', unitPrice: '', dueDate: '' });
      toast({ title: 'Invoice created as a draft.' });
    },
    onError: (error: any) => toast({ title: error.message || 'Could not create invoice', variant: 'destructive' }),
  });

  const invoices = (data as any)?.data?.invoices || [];
  const stats = (statsData as any)?.data?.summary;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div><h1 className="text-2xl font-bold tracking-tight">Finance</h1><p className="text-sm text-muted-foreground mt-1">Invoices and payments</p></div>
        <div className="flex gap-2"><Button size="sm" variant="outline" asChild><Link href="/invoice-templates">Invoice templates</Link></Button><Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />New Invoice</Button></div>
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Create invoice</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Customer name (shown on invoice)</Label><Input value={invoiceForm.customer} onChange={(event) => setInvoiceForm((current) => ({ ...current, customer: event.target.value }))} placeholder="Customer or company" /></div>
            <div><Label>Line item / service</Label><Input value={invoiceForm.description} onChange={(event) => setInvoiceForm((current) => ({ ...current, description: event.target.value }))} placeholder="Website design service" /></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Quantity</Label><Input type="number" min="1" value={invoiceForm.quantity} onChange={(event) => setInvoiceForm((current) => ({ ...current, quantity: event.target.value }))} /></div><div><Label>Unit price</Label><Input type="number" min="0" step="0.01" value={invoiceForm.unitPrice} onChange={(event) => setInvoiceForm((current) => ({ ...current, unitPrice: event.target.value }))} /></div></div>
            <div><Label>Due date</Label><Input type="date" value={invoiceForm.dueDate} onChange={(event) => setInvoiceForm((current) => ({ ...current, dueDate: event.target.value }))} /></div>
            <div><Label>Invoice template</Label><select value={templateKey} onChange={(event) => setTemplateKey(event.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="classic">Classic</option><option value="modern-indigo">Modern Indigo</option><option value="ocean-clean">Ocean Clean</option><option value="forest-ledger">Forest Ledger</option><option value="sunset-studio">Sunset Studio</option><option value="plum-premium">Plum Premium</option><option value="rose-editorial">Rose Editorial</option><option value="slate-minimal">Slate Minimal</option></select><Link href="/invoice-templates" className="mt-1 inline-block text-xs text-indigo-600">Browse all 32 templates</Link></div>
            <p className="text-xs text-muted-foreground">This creates a real draft invoice. You can send, mark paid, or download its PDF from the invoice list.</p>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button disabled={createMutation.isPending} onClick={() => {
              if (!invoiceForm.description || Number(invoiceForm.quantity) <= 0 || Number(invoiceForm.unitPrice) < 0) { toast({ title: 'Add a line item, quantity and price.', variant: 'destructive' }); return; }
              createMutation.mutate({ dueDate: invoiceForm.dueDate || undefined, templateKey, notes: invoiceForm.customer ? `Bill to: ${invoiceForm.customer}` : undefined, items: [{ name: invoiceForm.description, quantity: Number(invoiceForm.quantity), unitPrice: Number(invoiceForm.unitPrice) }] });
            }}>{createMutation.isPending ? 'Creating…' : 'Create draft'}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
