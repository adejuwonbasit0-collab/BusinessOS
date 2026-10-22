'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { brandingApi, TenantBranding } from '@/lib/brandingApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/useToast';
import { Upload, Palette, Globe, Building2, Save, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const { tenant, updateTenant } = useAuthStore();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['branding-settings'], queryFn: brandingApi.get });
  const branding: TenantBranding | null = (data as any)?.branding ?? null;

  const [form, setForm] = useState<Partial<TenantBranding>>({});
  const [dirty, setDirty] = useState(false);

  // Sync form when branding loads
  const b = branding;
  if (b && !dirty && Object.keys(form).length === 0) {
    setForm({ ...b });
  }

  const update = <K extends keyof TenantBranding>(key: K, value: TenantBranding[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, any>) => brandingApi.update(payload),
    onSuccess: (res: any) => {
      const updated = res?.branding;
      if (updated) {
        setForm({ ...updated });
        updateTenant({ name: updated.businessName, primaryColor: updated.primaryColor });
      }
      setDirty(false);
      qc.invalidateQueries({ queryKey: ['branding-settings'] });
      qc.invalidateQueries({ queryKey: ['tenant-branding'] });
      toast({ title: 'Settings saved' });
    },
    onError: (e: any) => toast({ title: e.message || 'Failed to save', variant: 'destructive' }),
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, kind }: { file: File; kind: 'logo' | 'favicon' }) =>
      brandingApi.uploadAsset(file, kind),
    onSuccess: (res: any) => {
      const updated = res?.branding;
      if (updated) {
        setForm({ ...updated });
        updateTenant({ name: updated.businessName });
      }
      setDirty(false);
      qc.invalidateQueries({ queryKey: ['branding-settings'] });
      qc.invalidateQueries({ queryKey: ['tenant-branding'] });
      toast({ title: 'Asset uploaded' });
    },
    onError: (e: any) => toast({ title: e.message || 'Upload failed', variant: 'destructive' }),
  });

  const handleSave = () => {
    if (!form) return;
    saveMutation.mutate({
      name: form.businessName,
      legalName: form.legalName,
      tradingName: form.tradingName,
      description: form.description,
      businessEmail: form.supportEmail,
      contactEmail: form.supportEmail,
      phone: form.supportPhone,
      address: form.address,
      country: form.country,
      currency: form.currency,
      timezone: form.timezone,
      locale: form.locale,
      registrationNumber: form.registrationNumber,
      primaryColor: form.primaryColor,
      secondaryColor: form.secondaryColor,
      brandFont: form.fontFamily,
      dateFormat: form.dateFormat,
      numberFormat: form.numberFormat,
      socialLinks: form.socialLinks,
    });
  };

  const handleFileChange = (kind: 'logo' | 'favicon') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate({ file, kind });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold">Settings</h1></div>
        <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-32 skeleton rounded-xl" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your workspace identity and configuration</p>
        </div>
        <Button onClick={handleSave} disabled={!dirty || saveMutation.isPending} className="bg-indigo-600 text-white hover:bg-indigo-500">
          {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      {/* Business Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> Business Identity</CardTitle>
          <CardDescription>Your business name and description appear across the dashboard, invoices, and public site</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Business Name</Label>
              <Input value={form.businessName || ''} onChange={(e) => update('businessName', e.target.value)} placeholder="Prosperous Royal Hotel" />
            </div>
            <div className="space-y-1.5">
              <Label>Legal Name</Label>
              <Input value={form.legalName || ''} onChange={(e) => update('legalName', e.target.value)} placeholder="As registered" />
            </div>
            <div className="space-y-1.5">
              <Label>Trading Name</Label>
              <Input value={form.tradingName || ''} onChange={(e) => update('tradingName', e.target.value)} placeholder="Name you trade under" />
            </div>
            <div className="space-y-1.5">
              <Label>Registration Number</Label>
              <Input value={form.registrationNumber || ''} onChange={(e) => update('registrationNumber', e.target.value)} placeholder="RC 123456" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description || ''} onChange={(e) => update('description', e.target.value)} rows={3} placeholder="What your business does" />
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Palette className="h-4 w-4" /> Branding</CardTitle>
          <CardDescription>Logo, favicon, and brand colours used across the platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start gap-6">
            <div className="space-y-2">
              <Label>Logo</Label>
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="Logo" className="h-16 w-16 rounded-lg object-contain border border-slate-200" />
              ) : (
                <div className="h-16 w-16 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                  <Upload className="h-5 w-5" />
                </div>
              )}
              <label className="cursor-pointer">
                <span className="text-xs text-indigo-600 hover:text-indigo-500 font-medium">Upload logo</span>
                <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" className="hidden" onChange={handleFileChange('logo')} />
              </label>
            </div>
            <div className="space-y-2">
              <Label>Favicon</Label>
              {form.faviconUrl ? (
                <img src={form.faviconUrl} alt="Favicon" className="h-8 w-8 rounded object-contain border border-slate-200" />
              ) : (
                <div className="h-8 w-8 rounded border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                  <Upload className="h-3 w-3" />
                </div>
              )}
              <label className="cursor-pointer">
                <span className="text-xs text-indigo-600 hover:text-indigo-500 font-medium">Upload favicon</span>
                <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" className="hidden" onChange={handleFileChange('favicon')} />
              </label>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Primary Colour</Label>
              <div className="flex gap-2">
                <input type="color" value={form.primaryColor || '#4f8ef7'} onChange={(e) => update('primaryColor', e.target.value)} className="h-10 w-14 rounded border border-slate-300 cursor-pointer" />
                <Input value={form.primaryColor || ''} onChange={(e) => update('primaryColor', e.target.value)} placeholder="#4f8ef7" className="flex-1" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Secondary Colour</Label>
              <div className="flex gap-2">
                <input type="color" value={form.secondaryColor || '#7c3aed'} onChange={(e) => update('secondaryColor', e.target.value)} className="h-10 w-14 rounded border border-slate-300 cursor-pointer" />
                <Input value={form.secondaryColor || ''} onChange={(e) => update('secondaryColor', e.target.value)} placeholder="#7c3aed" className="flex-1" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact & Regional */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4" /> Contact & Regional</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Support Email</Label>
              <Input value={form.supportEmail || ''} onChange={(e) => update('supportEmail', e.target.value)} placeholder="support@yourbusiness.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Support Phone</Label>
              <Input value={form.supportPhone || ''} onChange={(e) => update('supportPhone', e.target.value)} placeholder="+234 800 000 0000" />
            </div>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Input value={form.country || ''} onChange={(e) => update('country', e.target.value)} placeholder="Nigeria" />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Input value={form.currency || ''} onChange={(e) => update('currency', e.target.value)} placeholder="NGN" />
            </div>
            <div className="space-y-1.5">
              <Label>Timezone</Label>
              <Input value={form.timezone || ''} onChange={(e) => update('timezone', e.target.value)} placeholder="Africa/Lagos" />
            </div>
            <div className="space-y-1.5">
              <Label>Locale</Label>
              <Input value={form.locale || ''} onChange={(e) => update('locale', e.target.value)} placeholder="en-NG" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan */}
      <Card>
        <CardHeader><CardTitle className="text-base">Plan & Subscription</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="font-semibold">{tenant?.planName || 'Starter'}</p>
            <p className="text-sm text-muted-foreground">{tenant?.status === 'trial' ? 'Free trial' : 'Active subscription'}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="capitalize">{tenant?.status}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
