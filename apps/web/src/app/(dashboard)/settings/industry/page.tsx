'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { industryApi } from '@/lib/industryApi';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Sparkles, CheckCircle, Settings2 } from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

export default function IndustrySettingsPage() {
  const qc = useQueryClient();
  const { tenant, updateTenant } = useAuthStore();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const { data: presetsData, isLoading } = useQuery({ queryKey: ['industry-presets'], queryFn: industryApi.listPresets });
  const { data: modulesData } = useQuery({ queryKey: ['module-registry'], queryFn: industryApi.listModules });
  const { data: currentData } = useQuery({ queryKey: ['current-industry'], queryFn: industryApi.getCurrent });

  const selectMutation = useMutation({
    mutationFn: (key: string) => industryApi.select(key),
    onSuccess: (res) => {
      updateTenant({ industry: (res as any).data.tenant.industry, enabledModules: (res as any).data.tenant.enabled_modules });
      qc.invalidateQueries({ queryKey: ['current-industry'] });
      toast({ title: 'Industry applied', description: `Your workspace is now configured for ${(res as any).data.preset.name}` });
    },
    onError: (err: any) => toast({ title: err.message || 'Failed to apply industry', variant: 'destructive' }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ moduleKey, enabled }: { moduleKey: string; enabled: boolean }) => industryApi.toggleModule(moduleKey, enabled),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['current-industry'] }); toast({ title: 'Module updated' }); },
    onError: (err: any) => toast({ title: err.message || 'Failed to update module', variant: 'destructive' }),
  });

  const presets = (presetsData as any)?.data?.presets || [];
  const modules = (modulesData as any)?.data?.modules || [];
  const current = (currentData as any)?.data;
  const enabledModules: string[] = current?.enabledModules || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Sparkles className="h-6 w-6 text-blue-500" />Industry & Modules</h1>
        <p className="text-sm text-muted-foreground mt-1">Adapt NexOS to your business type — modules activate automatically based on industry.</p>
      </div>

      {/* Current state */}
      {current?.preset && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-5 flex items-center gap-3">
            <span className="text-3xl">{current.preset.icon}</span>
            <div>
              <p className="font-semibold">Currently configured for: {current.preset.name}</p>
              <p className="text-xs text-muted-foreground">{enabledModules.length} modules active</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Industry presets grid */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Choose Your Industry</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-32 skeleton rounded-xl" />)
          ) : presets.map((preset: any) => {
            const isActive = current?.industry === preset.key;
            return (
              <Card
                key={preset.key}
                className={cn('cursor-pointer transition-all hover:border-primary/40', isActive && 'border-primary ring-1 ring-primary/30')}
                onClick={() => setSelectedKey(preset.key)}
              >
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-3xl">{preset.icon}</span>
                    {isActive && <Badge className="bg-primary/15 text-primary border-primary/20 gap-1"><CheckCircle className="h-3 w-3" />Active</Badge>}
                  </div>
                  <h3 className="font-semibold text-sm">{preset.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{preset.description}</p>
                  <p className="text-[11px] text-muted-foreground mt-2">{preset.default_modules?.length || 0} modules</p>
                  {!isActive && (
                    <Button
                      size="sm" variant="outline" className="w-full mt-3 h-7 text-xs"
                      onClick={(e) => { e.stopPropagation(); selectMutation.mutate(preset.key); }}
                      disabled={selectMutation.isPending}
                    >
                      Apply this industry
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Manual module toggles */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2"><Settings2 className="h-4 w-4" />Fine-tune Modules</h2>
        <Card>
          <CardContent className="pt-5 divide-y">
            {modules.map((mod: any) => {
              const isEnabled = enabledModules.includes(mod.key);
              return (
                <div key={mod.key} className="flex items-center justify-between py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{mod.name}</p>
                      {mod.is_core && <Badge variant="outline" className="text-[10px]">Core</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>
                  </div>
                  <Switch
                    checked={isEnabled}
                    disabled={mod.is_core}
                    onCheckedChange={(checked) => toggleMutation.mutate({ moduleKey: mod.key, enabled: checked })}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
