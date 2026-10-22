'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesApi } from '@/lib/organizationApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Plus, Users, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/useToast';

export default function RolesPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', permissionKeys: [] as string[] });

  const { data: rolesData, isLoading } = useQuery({ queryKey: ['roles'], queryFn: rolesApi.list });
  const { data: catalogData } = useQuery({ queryKey: ['permissions-catalog'], queryFn: rolesApi.permissionsCatalog });

  const createMutation = useMutation({
    mutationFn: rolesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      toast({ title: 'Role created' });
      setCreateOpen(false);
      setForm({ name: '', description: '', permissionKeys: [] });
    },
    onError: (err: any) => toast({ title: err.message || 'Failed to create role', variant: 'destructive' }),
  });

  const roles = (rolesData as any)?.data?.roles || [];
  const grouped = (catalogData as any)?.data?.grouped || {};

  const togglePermission = (key: string) => {
    setForm((prev) => ({
      ...prev,
      permissionKeys: prev.permissionKeys.includes(key) ? prev.permissionKeys.filter((k) => k !== key) : [...prev.permissionKeys, key],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div><h1 className="text-2xl font-bold tracking-tight">Roles & Permissions</h1><p className="text-sm text-muted-foreground mt-1">Custom roles and access control</p></div>
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />Create Role</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 skeleton rounded-xl" />)
        ) : roles.length === 0 ? (
          <div className="col-span-full text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
            <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" /><p className="font-medium">No custom roles yet</p>
          </div>
        ) : roles.map((role: any) => (
          <Card key={role.id} className="hover:border-primary/30 transition-colors">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center"><Shield className="h-4 w-4" /></div>
                {role.is_system && <Badge variant="outline" className="text-[10px]">System</Badge>}
              </div>
              <h3 className="font-semibold">{role.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{role.description}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3 w-3" />{role.userCount} users</span>
                <span className="text-xs text-muted-foreground">{role.permissions?.length || 0} permissions</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Custom Role</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5"><Label>Role Name</Label><Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Branch Supervisor" /></div>
            <div className="space-y-1.5"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What can this role do?" /></div>

            <div>
              <Label className="mb-2 block">Permissions</Label>
              <div className="space-y-3 max-h-72 overflow-y-auto border rounded-lg p-3">
                {Object.entries(grouped).map(([module, perms]: [string, any]) => (
                  <div key={module}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 capitalize">{module}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {perms.map((perm: any) => (
                        <label key={perm.key} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox checked={form.permissionKeys.includes(perm.key)} onCheckedChange={() => togglePermission(perm.key)} />
                          <span className="capitalize">{perm.action}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate(form)} disabled={!form.name || createMutation.isPending}>Create Role</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
