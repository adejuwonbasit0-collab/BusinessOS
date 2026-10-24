'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { integrationsApi } from '@/lib/phase3Api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Link as LinkIcon, CheckCircle, XCircle, AlertCircle, Loader2, TestTube,
  CreditCard, MessageSquare, Mail, Building, Bell, Eye, Edit, Trash2, Plus, Settings, Send
} from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

export default function IntegrationsPage() {
  const qc = useQueryClient();
  const { tenant } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'catalog' | 'templates'>('catalog');

  // Configure integration modal
  const [configureModal, setConfigureModal] = useState<any | null>(null);
  const [configForm, setConfigForm] = useState<Record<string, any>>({});

  // Notification templates state
  const [templateModal, setTemplateModal] = useState<any | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);
  const [previewData, setPreviewData] = useState<{ renderedSubject: string; renderedBody: string } | null>(null);
  const [testRecipient, setTestRecipient] = useState('');
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: catalog = [], isLoading: isLoadingCatalog } = useQuery({
    queryKey: ['integrations-catalog'],
    queryFn: async () => {
      const res = await integrationsApi.catalog();
      return res.data?.catalog || [];
    },
  });

  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: async () => {
      const res = await integrationsApi.listTemplates();
      return res.data?.templates || [];
    },
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const connectMutation = useMutation({
    mutationFn: ({ provider, config, is_active }: { provider: string; config: any; is_active?: boolean }) =>
      integrationsApi.connect(provider, config, is_active),
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ['integrations-catalog'] });
      toast({ title: (res as any).message || 'Configuration updated successfully' });
      setConfigureModal(null);
    },
    onError: (err: any) => {
      toast({
        title: 'Error saving integration',
        description: err.response?.data?.error || err.message,
        variant: 'destructive',
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: (provider: string) => integrationsApi.test(provider),
    onSuccess: (res, provider) => {
      qc.invalidateQueries({ queryKey: ['integrations-catalog'] });
      toast({
        title: 'Connection Verified ✓',
        description: (res as any).message || `${provider} authenticated successfully`,
      });
      setTestingProvider(null);
    },
    onError: (err: any) => {
      qc.invalidateQueries({ queryKey: ['integrations-catalog'] });
      toast({
        title: 'Connection Failed ✗',
        description: err.response?.data?.error || err.message,
        variant: 'destructive',
      });
      setTestingProvider(null);
    },
  });

  const saveTemplateMutation = useMutation({
    mutationFn: (data: any) => integrationsApi.saveTemplate(data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['notification-templates'] });
      toast({ title: (res as any).message || 'Notification template saved' });
      setTemplateModal(null);
    },
    onError: (err: any) => {
      toast({
        title: 'Failed to save template',
        description: err.response?.data?.error || err.message,
        variant: 'destructive',
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => integrationsApi.deleteTemplate(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['notification-templates'] });
      toast({ title: (res as any).message || 'Template removed' });
    },
    onError: (err: any) => {
      toast({
        title: 'Failed to delete template',
        description: err.response?.data?.error || err.message,
        variant: 'destructive',
      });
    },
  });

  const testSendMutation = useMutation({
    mutationFn: ({ id, recipient }: { id: string; recipient: string }) =>
      integrationsApi.testSendTemplate(id, recipient),
    onSuccess: (res) => {
      toast({ title: 'Test Dispatched', description: (res as any).message });
    },
    onError: (err: any) => {
      toast({
        title: 'Dispatch failed',
        description: err.response?.data?.error || err.message,
        variant: 'destructive',
      });
    },
  });

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleToggleProvider = (prov: any) => {
    const isCurrentlyActive = prov.status === 'active';
    connectMutation.mutate({
      provider: prov.key,
      config: prov.config || {},
      is_active: !isCurrentlyActive,
    });
  };

  const handleTestHandshake = (prov: any) => {
    setTestingProvider(prov.key);
    testMutation.mutate(prov.key);
  };

  const handleSaveConfig = () => {
    if (!configureModal) return;
    connectMutation.mutate({
      provider: configureModal.key,
      config: configForm,
      is_active: true,
    });
  };

  const handleOpenPreview = async (tmpl: any) => {
    setPreviewTemplate(tmpl);
    setTestRecipient('');
    try {
      const res = await integrationsApi.previewTemplate(tmpl.id);
      setPreviewData(res.data || null);
    } catch {
      setPreviewData({
        renderedSubject: tmpl.subject || '',
        renderedBody: tmpl.body || '',
      });
    }
  };

  const handleSaveTemplateForm = () => {
    if (!templateModal) return;
    saveTemplateMutation.mutate({
      id: templateModal.id,
      key: templateModal.key || templateModal.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      name: templateModal.name,
      channel: templateModal.channel || 'email',
      subject: templateModal.subject || '',
      body: templateModal.body || '',
      variables: templateModal.variables || [],
      is_active: templateModal.is_active !== false,
    });
  };

  // Helper icons for categories
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Payments': return CreditCard;
      case 'Email': return Mail;
      case 'Communication': return MessageSquare;
      default: return Building;
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <LinkIcon className="h-6 w-6 text-indigo-600" />
            Integrations & Multi-Channel Notification Engine
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure live payment gateways, SMTP/email relays, WhatsApp Cloud API, and automated customer alerts.
          </p>
        </div>

        <Button
          size="sm"
          className="h-8 text-xs gap-1.5 bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm"
          onClick={() => {
            setTemplateModal({
              name: '',
              channel: 'email',
              subject: '',
              body: '',
              variables: [],
              is_active: true,
            });
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          Create Notification Template
        </Button>
      </div>

      {/* ── Main Navigation Tabs ──────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList className="bg-muted/70 p-1">
          <TabsTrigger value="catalog" className="text-xs gap-1.5">
            <CreditCard className="h-3.5 w-3.5" /> Providers & Payment Gateways ({catalog.length})
          </TabsTrigger>
          <TabsTrigger value="templates" className="text-xs gap-1.5">
            <Bell className="h-3.5 w-3.5" /> Notification Templates ({templates.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Gateways & Integrations Catalog ────────────────────────────── */}
        <TabsContent value="catalog" className="space-y-4">
          {isLoadingCatalog ? (
            <div className="flex justify-center items-center py-24 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2 text-indigo-600" />
              Loading integration catalog...
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalog.map((prov: any) => {
                const CategoryIcon = getCategoryIcon(prov.category);
                const isActive = prov.status === 'active';
                const isError = prov.status === 'error';
                const isTesting = testingProvider === prov.key;

                return (
                  <Card
                    key={prov.key}
                    className={cn(
                      'transition-all shadow-xs flex flex-col justify-between border-2',
                      isActive ? 'border-indigo-600/50 bg-card shadow-sm' : isError ? 'border-red-400/50 bg-card' : 'border-border/60 bg-muted/20 opacity-85'
                    )}
                  >
                    <CardContent className="pt-5 pb-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-bold text-lg">
                          {prov.icon || <CategoryIcon className="h-5 w-5" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'text-[11px] font-medium',
                            isActive ? 'text-emerald-600 font-semibold' : isError ? 'text-red-500 font-semibold' : 'text-muted-foreground'
                          )}>
                            {isActive ? 'Active' : isError ? 'Error / Unverified' : 'Disabled'}
                          </span>
                          <Switch
                            checked={isActive}
                            disabled={connectMutation.isPending}
                            onCheckedChange={() => handleToggleProvider(prov)}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm text-foreground">{prov.name}</h4>
                          <Badge variant="outline" className="text-[10px]">{prov.category}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                          {prov.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 text-xs font-medium"
                          onClick={() => {
                            setConfigureModal(prov);
                            setConfigForm(prov.config || {});
                          }}
                        >
                          <Edit className="h-3 w-3 mr-1" /> Configure Credentials
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs px-2.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                          disabled={isTesting}
                          onClick={() => handleTestHandshake(prov)}
                          title="Run real live connection test"
                        >
                          {isTesting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <TestTube className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Tab 2: Notification Templates Manager ───────────────────────────── */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Persisted Notification Templates</CardTitle>
                <p className="text-xs text-muted-foreground">Manage templates for transactional emails, student reports, fee reminders, WhatsApp & invoices</p>
              </div>
              <Button
                size="sm"
                onClick={() => setTemplateModal({ name: '', channel: 'email', subject: '', body: '', is_active: true })}
                className="h-8 text-xs bg-indigo-600 text-white"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Template
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingTemplates ? (
                <div className="flex justify-center items-center py-16 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2 text-indigo-600" />
                  Loading templates...
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 border-b text-muted-foreground">
                      <tr>
                        <th className="p-3 font-semibold">Template Name & Key</th>
                        <th className="p-3 font-semibold">Channel</th>
                        <th className="p-3 font-semibold">Subject / Trigger</th>
                        <th className="p-3 font-semibold">Type</th>
                        <th className="p-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {templates.map((t: any) => (
                        <tr key={t.id} className="hover:bg-muted/30">
                          <td className="p-3">
                            <div className="font-semibold text-foreground">{t.name}</div>
                            <code className="text-[10px] text-muted-foreground">{t.key}</code>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-[10px] uppercase font-mono">{t.channel}</Badge>
                          </td>
                          <td className="p-3 text-muted-foreground max-w-xs truncate">{t.subject || '—'}</td>
                          <td className="p-3">
                            {t.is_system_default ? (
                              <Badge variant="secondary" className="text-[10px]">Default</Badge>
                            ) : (
                              <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 text-[10px]">Customized</Badge>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => handleOpenPreview(t)}
                              >
                                <Eye className="h-3 w-3 mr-1" /> Preview
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-7 text-xs"
                                onClick={() => setTemplateModal({ ...t })}
                              >
                                <Edit className="h-3 w-3 mr-1" /> Edit
                              </Button>
                              {!t.is_system_default && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-red-600 hover:bg-red-50"
                                  disabled={deleteTemplateMutation.isPending}
                                  onClick={() => deleteTemplateMutation.mutate(t.id)}
                                  title="Reset to system default"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Modal: Configure Integration Credentials ─────────────────────────── */}
      {configureModal && (
        <Dialog open={!!configureModal} onOpenChange={() => setConfigureModal(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-indigo-600" />
                Configure {configureModal.name}
              </DialogTitle>
              <DialogDescription>
                Credentials are encrypted and stored securely in PostgreSQL.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              {(configureModal.configFields || []).map((field: string) => {
                const label = field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
                const isSecret = field.includes('secret') || field.includes('token') || field.includes('password') || field.includes('key');

                return (
                  <div key={field} className="space-y-1">
                    <Label className="font-medium text-foreground">{label}</Label>
                    {field === 'instructions' ? (
                      <textarea
                        rows={3}
                        value={configForm[field] || ''}
                        onChange={(e) => setConfigForm((p) => ({ ...p, [field]: e.target.value }))}
                        placeholder="Instructions displayed on invoices & checkout..."
                        className="w-full p-2 border rounded-lg bg-background text-xs"
                      />
                    ) : (
                      <Input
                        type={isSecret ? 'password' : 'text'}
                        value={configForm[field] || ''}
                        onChange={(e) => setConfigForm((p) => ({ ...p, [field]: e.target.value }))}
                        placeholder={`Enter ${label.toLowerCase()}`}
                        className="h-9 text-xs font-mono"
                      />
                    )}
                  </div>
                );
              })}

              <div className="flex justify-between items-center pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  disabled={testingProvider === configureModal.key}
                  onClick={() => handleTestHandshake(configureModal)}
                >
                  <TestTube className="h-3.5 w-3.5 mr-1" /> Test Verification
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setConfigureModal(null)}>Cancel</Button>
                  <Button
                    size="sm"
                    className="bg-indigo-600 text-white hover:bg-indigo-500"
                    disabled={connectMutation.isPending}
                    onClick={handleSaveConfig}
                  >
                    {connectMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    Save & Enable
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Modal: Live Template Preview & Real Dispatch ──────────────────────── */}
      {previewTemplate && (
        <Dialog open={!!previewTemplate} onOpenChange={() => { setPreviewTemplate(null); setPreviewData(null); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm">
                <Eye className="h-4 w-4 text-indigo-600" />
                Live Notification Preview — {previewTemplate.name}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Rendered with simulated context and variables. You can also send an actual test message.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              {previewTemplate.channel === 'email' ? (
                <div className="border rounded-xl bg-white text-slate-900 overflow-hidden shadow-xs">
                  <div className="bg-slate-100 p-3 border-b text-[11px] text-slate-600 space-y-0.5">
                    <p><strong>From:</strong> {tenant?.name || 'NexOS Enterprise'} &lt;notifications@nexos.app&gt;</p>
                    <p><strong>Subject:</strong> {previewData?.renderedSubject || previewTemplate.subject}</p>
                  </div>
                  <div className="p-4 whitespace-pre-wrap leading-relaxed text-slate-800 font-sans">
                    {previewData?.renderedBody || previewTemplate.body}
                  </div>
                </div>
              ) : (
                /* WhatsApp / SMS Preview */
                <div className="border rounded-2xl bg-[#e5ddd5] dark:bg-[#0b141a] p-4 max-w-sm mx-auto shadow-inner">
                  <div className="bg-white dark:bg-[#202c33] text-slate-900 dark:text-slate-100 p-3.5 rounded-xl rounded-tl-none shadow-sm text-xs whitespace-pre-wrap">
                    {previewData?.renderedBody || previewTemplate.body}
                    <span className="text-[10px] text-muted-foreground float-right mt-2">12:30 ✓✓</span>
                  </div>
                </div>
              )}

              {/* Real Test Dispatch box */}
              <div className="pt-2 border-t space-y-2">
                <Label className="text-xs font-semibold">Send Test Dispatch</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder={previewTemplate.channel === 'email' ? 'your-email@example.com' : '+1234567890'}
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-indigo-600 text-white"
                    disabled={!testRecipient || testSendMutation.isPending}
                    onClick={() => testSendMutation.mutate({ id: previewTemplate.id, recipient: testRecipient })}
                  >
                    {testSendMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                    Send Test
                  </Button>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button size="sm" variant="outline" onClick={() => { setPreviewTemplate(null); setPreviewData(null); }}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Modal: Edit / Add Template ────────────────────────────────────────── */}
      {templateModal && (
        <Dialog open={!!templateModal} onOpenChange={() => setTemplateModal(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-indigo-600" />
                {templateModal.id ? 'Edit Notification Template' : 'New Notification Template'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <Label>Template Name *</Label>
                <Input
                  value={templateModal.name}
                  onChange={(e) => setTemplateModal((p: any) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Student Exam Results Published"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label>Channel</Label>
                <select
                  value={templateModal.channel}
                  onChange={(e) => setTemplateModal((p: any) => ({ ...p, channel: e.target.value }))}
                  className="w-full h-9 px-2 border rounded-lg bg-background text-xs"
                >
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                  <option value="push">In-App / Push</option>
                </select>
              </div>

              {templateModal.channel === 'email' && (
                <div className="space-y-1">
                  <Label>Subject Line</Label>
                  <Input
                    value={templateModal.subject || ''}
                    onChange={(e) => setTemplateModal((p: any) => ({ ...p, subject: e.target.value }))}
                    placeholder="Subject with variables like {{invoice_number}}"
                    className="h-9 text-xs"
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label>Template Body *</Label>
                <textarea
                  rows={6}
                  value={templateModal.body || ''}
                  onChange={(e) => setTemplateModal((p: any) => ({ ...p, body: e.target.value }))}
                  placeholder="Body content with variables (e.g. {{customer_name}}, {{total_amount}})..."
                  className="w-full p-2.5 border rounded-lg bg-background text-xs font-mono"
                />
              </div>

              <div className="p-2 rounded bg-muted/40 text-[11px] text-muted-foreground leading-relaxed">
                Available variables: <code>{'{{customer_name}}'}</code>, <code>{'{{student_name}}'}</code>, <code>{'{{invoice_number}}'}</code>, <code>{'{{amount_due}}'}</code>, <code>{'{{organization_name}}'}</code>, <code>{'{{login_url}}'}</code>, <code>{'{{payment_link}}'}</code>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setTemplateModal(null)}>Cancel</Button>
                <Button
                  size="sm"
                  className="bg-indigo-600 text-white"
                  disabled={saveTemplateMutation.isPending || !templateModal.name || !templateModal.body}
                  onClick={handleSaveTemplateForm}
                >
                  {saveTemplateMutation.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                  Save Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
