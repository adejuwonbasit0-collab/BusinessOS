'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Palette, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { brandingApi } from '@/lib/brandingApi';
import { useBranding } from '@/components/providers/TenantBrandingProvider';
import { toast } from '@/hooks/useToast';

const THEMES = [
  ['indigo', 'Indigo Studio', '#4f46e5', '#8b5cf6'], ['ocean', 'Ocean Blue', '#0369a1', '#06b6d4'],
  ['forest', 'Forest', '#166534', '#22c55e'], ['rose', 'Rose', '#be123c', '#fb7185'],
  ['sunset', 'Sunset', '#c2410c', '#f59e0b'], ['violet', 'Violet', '#6d28d9', '#a855f7'],
  ['slate', 'Slate', '#334155', '#64748b'], ['midnight', 'Midnight', '#172554', '#2563eb'],
  ['teal', 'Teal', '#0f766e', '#14b8a6'], ['ruby', 'Ruby', '#991b1b', '#ef4444'],
] as const;

export default function ThemesPage() {
  const { branding } = useBranding();
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: (theme: typeof THEMES[number]) => brandingApi.update({ dashboardTheme: theme[0], primaryColor: theme[2], secondaryColor: theme[3] }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenant-branding'] }); qc.invalidateQueries({ queryKey: ['branding-settings'] }); toast({ title: 'Workspace theme applied' }); },
    onError: (e: any) => toast({ title: e.message || 'Could not save theme', variant: 'destructive' }),
  });
  return <div className="space-y-6"><div><h1 className="flex items-center gap-2 text-2xl font-bold"><Palette className="h-6 w-6 text-violet-600" />Themes & Styles</h1><p className="mt-1 text-sm text-muted-foreground">Choose a workspace-wide colour style. It applies to the dashboard, navigation and tenant login.</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{THEMES.map((theme) => { const active = branding?.dashboardTheme === theme[0]; return <Card key={theme[0]} className={active ? 'border-2 border-primary' : ''}><CardContent className="pt-5"><div className="h-24 rounded-lg p-3 text-white" style={{ background: `linear-gradient(135deg, ${theme[2]}, ${theme[3]})` }}><div className="h-2 w-24 rounded bg-white/70" /><div className="mt-3 grid grid-cols-3 gap-2"><div className="h-9 rounded bg-white/20" /><div className="h-9 rounded bg-white/20" /><div className="h-9 rounded bg-white/20" /></div></div><div className="mt-4 flex items-center justify-between"><div><p className="font-semibold">{theme[1]}</p><p className="text-xs text-muted-foreground">Dashboard and login accent</p></div><Button size="sm" variant={active ? 'default' : 'outline'} disabled={save.isPending} onClick={() => save.mutate(theme)}>{active ? <><Check className="mr-1 h-3.5 w-3.5" />Active</> : 'Apply'}</Button></div></CardContent></Card>; })}</div></div>;
}
