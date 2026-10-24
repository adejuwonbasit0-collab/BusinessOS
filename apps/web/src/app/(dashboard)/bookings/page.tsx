'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingApi } from '@/lib/bookingApi';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Plus, Users, Clock, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/useToast';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-600', confirmed: 'bg-blue-500/15 text-blue-600',
  checked_in: 'bg-violet-500/15 text-violet-600', completed: 'bg-green-500/15 text-green-600',
  cancelled: 'bg-muted text-muted-foreground', no_show: 'bg-red-500/15 text-red-600',
};

export default function BookingsPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [resourceOpen, setResourceOpen] = useState(false);
  const [resourceForm, setResourceForm] = useState({ name: '', type: 'service' });
  const [form, setForm] = useState({ title: '', resourceId: '', startAt: '', endAt: '', partySize: '1', price: '0' });

  const { data: statsData } = useQuery({ queryKey: ['booking-stats'], queryFn: bookingApi.stats });
  const { data: bookingsData, isLoading } = useQuery({ queryKey: ['bookings'], queryFn: () => bookingApi.list() });
  const { data: resourcesData } = useQuery({ queryKey: ['booking-resources'], queryFn: bookingApi.listResources });

  const createMutation = useMutation({
    mutationFn: (data: any) => bookingApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bookings'] }); setCreateOpen(false); setForm({ title: '', resourceId: '', startAt: '', endAt: '', partySize: '1', price: '0' }); toast({ title: 'Booking created' }); },
    onError: (e: any) => toast({ title: e.message || 'Failed to create booking', variant: 'destructive' }),
  });
  const resourceMutation = useMutation({
    mutationFn: (data: any) => bookingApi.createResource(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['booking-resources'] }); setResourceOpen(false); setResourceForm({ name: '', type: 'service' }); toast({ title: 'Bookable resource added' }); },
    onError: (e: any) => toast({ title: e.message || 'Could not add resource', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => bookingApi.updateStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bookings'] }); toast({ title: 'Booking updated' }); },
  });

  const stats = (statsData as any)?.data;
  const bookings = (bookingsData as any)?.data?.bookings || [];
  const resources = (resourcesData as any)?.data?.resources || [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div><h1 className="text-2xl font-bold tracking-tight">Bookings & Reservations</h1><p className="text-sm text-muted-foreground mt-1">Appointments, reservations, and scheduling</p></div>
        <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setResourceOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Resource</Button><Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />New Booking</Button></div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Today's Bookings</p><p className="text-2xl font-bold">{stats?.todayBookings ?? 0}</p></div><div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center"><Calendar className="h-4 w-4" /></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Pending</p><p className="text-2xl font-bold">{stats?.pendingBookings ?? 0}</p></div><div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center"><Clock className="h-4 w-4" /></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Resources</p><p className="text-2xl font-bold">{stats?.totalResources ?? 0}</p></div><div className="w-9 h-9 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center"><Users className="h-4 w-4" /></div></div></CardContent></Card>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 skeleton rounded-xl" />)
        ) : bookings.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl"><Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />No bookings yet</div>
        ) : bookings.map((b: any) => (
          <Card key={b.id}>
            <CardContent className="pt-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex flex-col items-center justify-center text-white shrink-0">
                <span className="text-[10px] font-medium leading-none">{format(new Date(b.start_at), 'MMM')}</span>
                <span className="text-base font-bold leading-none mt-0.5">{format(new Date(b.start_at), 'd')}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{b.title}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(b.start_at), 'h:mm a')} – {format(new Date(b.end_at), 'h:mm a')}
                  {b.resource_name && ` · ${b.resource_name}`}
                  {b.contact_name && ` · ${b.contact_name}`}
                </p>
              </div>
              <Badge variant="outline" className={`capitalize ${STATUS_COLORS[b.status] || ''}`}>{b.status.replace('_', ' ')}</Badge>
              {b.status === 'pending' && (
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateMutation.mutate({ id: b.id, status: 'confirmed' })}><CheckCircle className="h-3.5 w-3.5 mr-1" />Confirm</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs text-red-600" onClick={() => updateMutation.mutate({ id: b.id, status: 'cancelled' })}><XCircle className="h-3.5 w-3.5" /></Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Haircut - John" />
            </div>
            <div className="space-y-1.5"><Label>Resource</Label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.resourceId} onChange={(event) => setForm((current) => ({ ...current, resourceId: event.target.value }))}><option value="">No specific resource</option>{resources.map((resource: any) => <option key={resource.id} value={resource.id}>{resource.name} ({resource.type})</option>)}</select><p className="text-xs text-muted-foreground">Select a staff member, room, chair, vehicle, or service to prevent double-booking.</p></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start</Label>
                <Input type="datetime-local" value={form.startAt} onChange={(e) => setForm((p) => ({ ...p, startAt: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>End</Label>
                <Input type="datetime-local" value={form.endAt} onChange={(e) => setForm((p) => ({ ...p, endAt: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Party size</Label>
                <Input type="number" min="1" value={form.partySize} onChange={(e) => setForm((p) => ({ ...p, partySize: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Price</Label>
                <Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={() => {
                if (!form.title || !form.startAt || !form.endAt) { toast({ title: 'Title and time range are required', variant: 'destructive' }); return; }
                createMutation.mutate({
                  title: form.title,
                  resourceId: form.resourceId || undefined,
                  startAt: new Date(form.startAt).toISOString(),
                  endAt: new Date(form.endAt).toISOString(),
                  partySize: parseInt(form.partySize) || 1,
                  price: parseFloat(form.price) || 0,
                });
              }} disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating…' : 'Create Booking'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={resourceOpen} onOpenChange={setResourceOpen}><DialogContent className="sm:max-w-sm"><DialogHeader><DialogTitle>Add bookable resource</DialogTitle></DialogHeader><div className="space-y-3"><div><Label>Name</Label><Input value={resourceForm.name} onChange={(event) => setResourceForm((current) => ({ ...current, name: event.target.value }))} placeholder="Consultation Room 1, John the Barber…" /></div><div><Label>Type</Label><Input value={resourceForm.type} onChange={(event) => setResourceForm((current) => ({ ...current, type: event.target.value }))} placeholder="room, staff, chair, vehicle…" /></div><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setResourceOpen(false)}>Cancel</Button><Button disabled={!resourceForm.name || resourceMutation.isPending} onClick={() => resourceMutation.mutate(resourceForm)}>{resourceMutation.isPending ? 'Saving…' : 'Add resource'}</Button></div></div></DialogContent></Dialog>
    </div>
  );
}
