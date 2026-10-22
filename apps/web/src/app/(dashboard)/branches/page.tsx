'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { branchesApi } from '@/lib/organizationApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Plus, MapPin, Phone, Users, Star } from 'lucide-react';
import { toast } from '@/hooks/useToast';

export default function BranchesPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', type: 'branch', phone: '', email: '' });

  const { data, isLoading } = useQuery({ queryKey: ['branches'], queryFn: branchesApi.list });

  const createMutation = useMutation({
    mutationFn: branchesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      toast({ title: 'Branch created' });
      setCreateOpen(false);
      setForm({ name: '', code: '', type: 'branch', phone: '', email: '' });
    },
    onError: (err: any) => toast({ title: err.message || 'Failed to create branch', variant: 'destructive' }),
  });

  const branches = (data as any)?.data?.branches || [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Branches & Locations</h1>
          <p className="text-sm text-muted-foreground mt-1">{branches.length} locations across your organization</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Branch</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 skeleton rounded-xl" />)
        ) : branches.length === 0 ? (
          <div className="col-span-full text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="font-medium">No branches yet</p>
            <Button size="sm" className="mt-3" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />Add your first branch</Button>
          </div>
        ) : branches.map((branch: any) => (
          <Card key={branch.id} className="hover:border-primary/30 transition-colors">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white">
                  <Building2 className="h-5 w-5" />
                </div>
                {branch.is_default && <Badge variant="outline" className="text-[10px] gap-1"><Star className="h-2.5 w-2.5" />Default</Badge>}
              </div>
              <h3 className="font-semibold">{branch.name}</h3>
              <p className="text-xs text-muted-foreground capitalize">{branch.type} {branch.code && `· ${branch.code}`}</p>
              <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                {branch.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{branch.phone}</div>}
                {branch.manager_name && <div className="flex items-center gap-1.5"><Users className="h-3 w-3" />{branch.manager_name}</div>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add New Branch</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5"><Label>Branch Name</Label><Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Downtown Office" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Code</Label><Input value={form.code} onChange={(e) => setForm(p => ({ ...p, code: e.target.value }))} placeholder="NYC-01" /></div>
              <div className="space-y-1.5"><Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="headquarters">Headquarters</SelectItem>
                    <SelectItem value="branch">Branch</SelectItem>
                    <SelectItem value="warehouse">Warehouse</SelectItem>
                    <SelectItem value="outlet">Outlet</SelectItem>
                    <SelectItem value="site">Site</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate(form)} disabled={!form.name || createMutation.isPending}>Create Branch</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
