'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactsApi } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Plus, Users } from 'lucide-react';
import { toast } from '@/hooks/useToast';

const TYPE_COLORS: Record<string, string> = {
  lead: 'bg-blue-500/15 text-blue-600 border-blue-500/20',
  prospect: 'bg-amber-500/15 text-amber-600 border-amber-500/20',
  customer: 'bg-green-500/15 text-green-600 border-green-500/20',
  churned: 'bg-red-500/15 text-red-600 border-red-500/20',
};

export default function ContactsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', companyName: '', type: 'lead', leadSource: '' });

  const debouncedSearch = useDebounce(search, 400);

  const qc = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: any) => contactsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); setCreateOpen(false); setForm({ firstName: '', lastName: '', email: '', phone: '', companyName: '', type: 'lead', leadSource: '' }); toast({ title: 'Contact created' }); },
    onError: (e: any) => toast({ title: e.message || 'Failed to create contact', variant: 'destructive' }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', { page, search: debouncedSearch, type: typeFilter }],
    queryFn: () => contactsApi.list({ page, limit: 25, search: debouncedSearch || undefined, type: typeFilter === 'all' ? undefined : typeFilter }),
  });

  const contacts = (data as any)?.data?.contacts || [];
  const pagination = (data as any)?.data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">CRM Contacts</h1>
          <p className="text-sm text-muted-foreground mt-1">{pagination?.total ?? '–'} total contacts</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Contact</Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search contacts…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="lead">Leads</SelectItem>
            <SelectItem value="prospect">Prospects</SelectItem>
            <SelectItem value="customer">Customers</SelectItem>
            <SelectItem value="churned">Churned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Contact</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Lead Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 4 }).map((_, j) => <TableCell key={j}><div className="h-4 skeleton rounded" /></TableCell>)}</TableRow>
              ))
            ) : contacts.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-16 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-3 opacity-30" /><p className="font-medium">No contacts found</p>
              </TableCell></TableRow>
            ) : contacts.map((contact: any) => (
              <TableRow key={contact.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8"><AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-blue-500 to-violet-600 text-white">{contact.first_name?.charAt(0)}{contact.last_name?.charAt(0)}</AvatarFallback></Avatar>
                    <div><p className="font-medium text-sm">{contact.first_name} {contact.last_name}</p><p className="text-xs text-muted-foreground">{contact.email}</p></div>
                  </div>
                </TableCell>
                <TableCell><p className="text-sm">{contact.company_name || '–'}</p></TableCell>
                <TableCell><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border capitalize ${TYPE_COLORS[contact.type] || ''}`}>{contact.type}</span></TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500" style={{ width: `${contact.lead_score || 0}%` }} /></div>
                    <span className="text-xs text-muted-foreground">{contact.lead_score || 0}</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Contact</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>First name</Label><Input value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Last name</Label><Input value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Company</Label><Input value={form.companyName} onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="churned">Churned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Lead source</Label><Input value={form.leadSource} onChange={(e) => setForm((p) => ({ ...p, leadSource: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate(form)} disabled={!form.firstName || createMutation.isPending}>{createMutation.isPending ? 'Saving…' : 'Create Contact'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
