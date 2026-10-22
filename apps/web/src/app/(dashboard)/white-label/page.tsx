'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { whiteLabelApi } from '@/lib/phase3Api';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Palette, Globe, Mail, Shield, Users, Loader2, Crown, Lock } from 'lucide-react';
import { toast } from '@/hooks/useToast';

export default function WhiteLabelPage() {
  const qc = useQueryClient();
  const { tenant } = useAuthStore();
  const hasFeature = tenant?.featureWhiteLabel;

  const { data: configData } = useQuery({
    queryKey: ['white-label-config'], queryFn: whiteLabelApi.getConfig, enabled: !!hasFeature,
  });
  const { data: resellersData } = useQuery({
    queryKey: ['resellers'], queryFn: whiteLabelApi.listResellers, enabled: !!hasFeature,
  });

  const [form, setForm] = useState({
    brandName: '', primaryColor: '#4f8ef7', secondaryColor: '#8b5cf6',
    brandLogoUrl: '', supportEmail: '', supportPhone: '',
    termsUrl: '', privacyUrl: '', hidePoweredBy: false,
  });

  const [resellerForm, setResellerForm] = useState({
    businessName: '', ownerEmail: '', ownerFirstName: '', ownerLastName: '', plan: 'starter',
  });
  const [resellerOpen, setResellerOpen] = useState(false);

  useEffect(() => {
    const c = (configData as any)?.data?.config;
    if (c) {
      setForm({
        brandName: c.brand_name || '',
        primaryColor: c.primary_color || '#4f8ef7',
        secondaryColor: c.secondary_color || '#8b5cf6',
        brandLogoUrl: c.brand_logo_url || '',
        supportEmail: c.support_email || '',
        supportPhone: c.support_phone || '',
        termsUrl: c.terms_url || '',
        privacyUrl: c.privacy_url || '',
        hidePoweredBy: c.hide_powered_by || false,
      });
    }
  }, [configData]);

  const saveMutation = useMutation({
    mutationFn: whiteLabelApi.save,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['white-label-config'] }); toast({ title: 'White label settings saved' }); },
    onError: (e: any) => toast({ title: e.message, variant: 'destructive' }),
  });

  const createResellerMutation = useMutation({
    mutationFn: whiteLabelApi.createReseller,
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['resellers'] });
      toast({ title: `Reseller "${resellerForm.businessName}" created`, description: `Temp password: ${(res as any)?.data?.owner?.tempPassword}` });
      setResellerOpen(false);
      setResellerForm({ businessName: '', ownerEmail: '', ownerFirstName: '', ownerLastName: '', plan: 'starter' });
    },
    onError: (e: any) => toast({ title: e.message, variant: 'destructive' }),
  });

  const resellers = (resellersData as any)?.data?.resellers || [];

  if (!hasFeature) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Palette className="h-6 w-6" />White Label</h1>
          <p className="text-sm text-muted-foreground mt-1">Rebrand NexOS as your own product</p>
        </div>
        <Card className="max-w-lg">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4">
              <Crown className="h-7 w-7" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Enterprise Feature</h3>
            <p className="text-sm text-muted-foreground mb-6">
              White label is available on the Enterprise plan. Rebrand NexOS with your own logo, colors, and domain — and resell it to your clients.
            </p>
            <div className="space-y-2 text-sm text-left mb-6 max-w-xs mx-auto">
              {['Custom logo & colors', 'Your own domain', 'Hide "Powered by NexOS"', 'Create reseller accounts', 'Custom email branding', 'SMTP configuration'].map((f) => (
                <div key={f} className="flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-green-500 shrink-0" />{f}</div>
              ))}
            </div>
            <Button>Upgrade to Enterprise</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Palette className="h-6 w-6 text-violet-500" />White Label</h1>
          <p className="text-sm text-muted-foreground mt-1">Rebrand NexOS for your agency, franchise, or reseller business</p>
        </div>
        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1"><Crown className="h-3 w-3" />Enterprise</Badge>
      </div>

      <Tabs defaultValue="branding">
        <TabsList>
          <TabsTrigger value="branding"><Palette className="h-3.5 w-3.5 mr-1.5" />Branding</TabsTrigger>
          <TabsTrigger value="domain"><Globe className="h-3.5 w-3.5 mr-1.5" />Domain & Links</TabsTrigger>
          <TabsTrigger value="email"><Mail className="h-3.5 w-3.5 mr-1.5" />Email</TabsTrigger>
          <TabsTrigger value="resellers"><Users className="h-3.5 w-3.5 mr-1.5" />Resellers ({resellers.length})</TabsTrigger>
        </TabsList>

        {/* ── Branding ── */}
        <TabsContent value="branding" className="mt-4 max-w-xl space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Brand Identity</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Brand Name</Label>
                <Input value={form.brandName} onChange={(e) => setForm(p => ({ ...p, brandName: e.target.value }))} placeholder={tenant?.name} />
                <p className="text-xs text-muted-foreground">Replaces "NexOS" throughout the platform</p>
              </div>
              <div className="space-y-1.5">
                <Label>Logo URL</Label>
                <Input value={form.brandLogoUrl} onChange={(e) => setForm(p => ({ ...p, brandLogoUrl: e.target.value }))} placeholder="https://yourcompany.com/logo.png" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    <input type="color" value={form.primaryColor} onChange={(e) => setForm(p => ({ ...p, primaryColor: e.target.value }))} className="w-10 h-9 rounded-lg border cursor-pointer" />
                    <Input value={form.primaryColor} onChange={(e) => setForm(p => ({ ...p, primaryColor: e.target.value }))} className="flex-1 font-mono" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Accent Color</Label>
                  <div className="flex gap-2">
                    <input type="color" value={form.secondaryColor} onChange={(e) => setForm(p => ({ ...p, secondaryColor: e.target.value }))} className="w-10 h-9 rounded-lg border cursor-pointer" />
                    <Input value={form.secondaryColor} onChange={(e) => setForm(p => ({ ...p, secondaryColor: e.target.value }))} className="flex-1 font-mono" />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between py-3 border-t">
                <div>
                  <p className="text-sm font-medium">Hide "Powered by NexOS"</p>
                  <p className="text-xs text-muted-foreground">Remove NexOS branding from footer and emails</p>
                </div>
                <Switch checked={form.hidePoweredBy} onCheckedChange={(v) => setForm(p => ({ ...p, hidePoweredBy: v }))} />
              </div>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="w-full">
                {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save Branding
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Domain & Links ── */}
        <TabsContent value="domain" className="mt-4 max-w-xl space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Custom Domain & Legal Links</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Support Email</Label>
                <Input type="email" value={form.supportEmail} onChange={(e) => setForm(p => ({ ...p, supportEmail: e.target.value }))} placeholder="support@yourcompany.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Support Phone</Label>
                <Input value={form.supportPhone} onChange={(e) => setForm(p => ({ ...p, supportPhone: e.target.value }))} placeholder="+1 (800) 000-0000" />
              </div>
              <div className="space-y-1.5">
                <Label>Terms of Service URL</Label>
                <Input value={form.termsUrl} onChange={(e) => setForm(p => ({ ...p, termsUrl: e.target.value }))} placeholder="https://yourcompany.com/terms" />
              </div>
              <div className="space-y-1.5">
                <Label>Privacy Policy URL</Label>
                <Input value={form.privacyUrl} onChange={(e) => setForm(p => ({ ...p, privacyUrl: e.target.value }))} placeholder="https://yourcompany.com/privacy" />
              </div>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="w-full">
                {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Email ── */}
        <TabsContent value="email" className="mt-4 max-w-xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Custom Email / SMTP</CardTitle>
              <CardDescription>Send emails from your own domain instead of noreply@nexos.app</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'SMTP Host', key: 'smtpHost', placeholder: 'smtp.sendgrid.net' },
                { label: 'SMTP Port', key: 'smtpPort', placeholder: '587' },
                { label: 'SMTP Username', key: 'smtpUser', placeholder: 'apikey' },
                { label: 'SMTP Password', key: 'smtpPass', placeholder: '••••••••', type: 'password' },
                { label: 'From Email', key: 'fromEmail', placeholder: 'hello@yourcompany.com' },
                { label: 'From Name', key: 'fromName', placeholder: 'Your Company' },
              ].map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label>{f.label}</Label>
                  <Input type={f.type || 'text'} placeholder={f.placeholder} />
                </div>
              ))}
              <Button className="w-full">Save & Test SMTP</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Resellers ── */}
        <TabsContent value="resellers" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{resellers.length} reseller{resellers.length !== 1 ? 's' : ''} created</p>
            <Button size="sm" onClick={() => setResellerOpen(true)}><Users className="h-4 w-4 mr-2" />Create Reseller</Button>
          </div>

          {resellers.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-xl text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="font-medium text-sm">No resellers yet</p>
              <p className="text-xs mt-1">Create reseller accounts to let agencies manage their own branded workspaces</p>
            </div>
          ) : (
            <div className="rounded-xl border bg-card divide-y">
              {resellers.map((r: any) => (
                <div key={r.id} className="flex items-center gap-3 p-4">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {r.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{r.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{r.subdomain}.nexos.app</p>
                  </div>
                  <Badge variant="outline" className="capitalize">{r.status}</Badge>
                </div>
              ))}
            </div>
          )}

          {/* Create Reseller inline form */}
          {resellerOpen && (
            <Card className="border-primary/30">
              <CardHeader><CardTitle className="text-base">New Reseller Account</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Business Name</Label>
                  <Input value={resellerForm.businessName} onChange={(e) => setResellerForm(p => ({ ...p, businessName: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Owner First Name</Label><Input value={resellerForm.ownerFirstName} onChange={(e) => setResellerForm(p => ({ ...p, ownerFirstName: e.target.value }))} /></div>
                  <div className="space-y-1.5"><Label>Owner Last Name</Label><Input value={resellerForm.ownerLastName} onChange={(e) => setResellerForm(p => ({ ...p, ownerLastName: e.target.value }))} /></div>
                </div>
                <div className="space-y-1.5"><Label>Owner Email</Label><Input type="email" value={resellerForm.ownerEmail} onChange={(e) => setResellerForm(p => ({ ...p, ownerEmail: e.target.value }))} /></div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setResellerOpen(false)}>Cancel</Button>
                  <Button size="sm" onClick={() => createResellerMutation.mutate(resellerForm)}
                    disabled={!resellerForm.businessName || !resellerForm.ownerEmail || createResellerMutation.isPending}>
                    {createResellerMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create Reseller
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
