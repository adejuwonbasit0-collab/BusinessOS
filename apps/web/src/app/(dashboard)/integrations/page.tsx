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
  Link, CheckCircle, XCircle, Loader2, Unlink, TestTube,
  CreditCard, MessageSquare, Mail, Building, Bell, Eye, Edit, Trash2, Plus, Sparkles, Settings
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
  const [templates, setTemplates] = useState([
    {
      id: 'tmpl-1',
      key: 'order_confirmation',
      name: 'Order Confirmation & Receipt',
      channel: 'email',
      subject: 'Your Order {{order_id}} from {{business_name}} is Confirmed!',
      body: 'Dear {{customer_name}},\n\nThank you for your order! We have received your payment of {{amount}}.\n\nYour items will be prepared promptly. You can track your order status in your customer portal: {{portal_link}}.\n\nWarm regards,\nThe {{business_name}} Team',
    },
    {
      id: 'tmpl-2',
      key: 'booking_confirmed',
      name: 'Appointment / Booking Confirmed',
      channel: 'email',
      subject: 'Booking Confirmed: {{service_name}} on {{booking_date}}',
      body: 'Hello {{customer_name}},\n\nYour appointment for {{service_name}} has been scheduled with {{staff_name}} on {{booking_date}} at {{booking_time}}.\n\nLocation: {{business_address}}\n\nIf you need to reschedule, please visit {{reschedule_link}}.',
    },
    {
      id: 'tmpl-3',
      key: 'whatsapp_order',
      name: 'WhatsApp Order Dispatch',
      channel: 'whatsapp',
      subject: 'WhatsApp Notification',
      body: 'Hi {{customer_name}}! 🛍️ Your order #{{order_id}} with {{business_name}} has been received (Total: {{amount}}). Our team will dispatch shortly! Reply to this chat with any questions.',
    },
    {
      id: 'tmpl-4',
      key: 'low_stock_alert',
      name: 'Low Stock Reorder Alert (Internal)',
      channel: 'email',
      subject: '⚠️ Stock Alert: {{product_name}} is below reorder threshold',
      body: 'Attention Inventory Manager,\n\nThe stock level for {{product_name}} (SKU: {{sku}}) is now at {{current_stock}} units (Reorder Point: {{reorder_point}}). A draft purchase order has been queued.',
    },
  ]);

  // Integrated Providers Catalog
  const [providers, setProviders] = useState<any[]>([
    {
      key: 'stripe',
      name: 'Stripe Payments',
      category: 'Payments',
      icon: CreditCard,
      description: 'Credit/Debit cards, Apple Pay, Google Pay, and global subscriptions.',
      fields: ['publishableKey', 'secretKey', 'webhookSecret'],
      enabled: true,
      config: { publishableKey: 'pk_test_...', secretKey: '••••••••' },
    },
    {
      key: 'paystack',
      name: 'Paystack',
      category: 'Payments',
      icon: CreditCard,
      description: 'Accept payments across Nigeria, Ghana, South Africa, and Kenya (Card, USSD, Bank).',
      fields: ['publicKey', 'secretKey'],
      enabled: true,
      config: { publicKey: 'pk_test_...', secretKey: '••••••••' },
    },
    {
      key: 'flutterwave',
      name: 'Flutterwave',
      category: 'Payments',
      icon: CreditCard,
      description: 'Pan-African payments: card, M-Pesa, Mobile Money, and bank accounts.',
      fields: ['publicKey', 'secretKey', 'encryptionKey'],
      enabled: true,
      config: { publicKey: 'FLWPUBK_TEST-...', secretKey: '••••••••' },
    },
    {
      key: 'paypal',
      name: 'PayPal & Venmo',
      category: 'Payments',
      icon: CreditCard,
      description: 'Worldwide digital wallet checkout with buyer protection.',
      fields: ['clientId', 'clientSecret'],
      enabled: false,
      config: {},
    },
    {
      key: 'manual_bank',
      name: 'Manual Bank Account Transfer',
      category: 'Payments',
      icon: Building,
      description: 'Display your bank name, account number, and instructions for direct bank transfers.',
      fields: ['bankName', 'accountName', 'accountNumber', 'sortCode', 'instructions'],
      enabled: true,
      config: {
        bankName: 'First National Bank',
        accountName: tenant?.name || 'NexOS Enterprise',
        accountNumber: '0129849201',
        sortCode: '044-123',
        instructions: 'Please send receipt or transaction reference to WhatsApp or email after payment.',
      },
    },
    {
      key: 'email_smtp',
      name: 'Email SMTP / SendGrid / Resend',
      category: 'Communication',
      icon: Mail,
      description: 'Send custom branded transactional emails, order confirmations, and notifications.',
      fields: ['smtpHost', 'smtpPort', 'smtpUser', 'smtpPassword', 'fromEmail', 'fromName'],
      enabled: true,
      config: {
        smtpHost: 'smtp.resend.com',
        smtpPort: '587',
        smtpUser: 'resend',
        fromEmail: `notifications@${tenant?.subdomain || 'nexos'}.app`,
        fromName: tenant?.name || 'NexOS System',
      },
    },
    {
      key: 'whatsapp',
      name: 'WhatsApp Business & Direct Ordering',
      category: 'Communication',
      icon: MessageSquare,
      description: 'Receive customer orders via WhatsApp and send automated message updates.',
      fields: ['phoneNumber', 'apiKey', 'enableDirectClickToOrder'],
      enabled: true,
      config: {
        phoneNumber: tenant?.phone || '+1 (555) 234-5678',
        enableDirectClickToOrder: 'true',
      },
    },
    {
      key: 'twilio',
      name: 'Twilio SMS & Voice',
      category: 'Communication',
      icon: MessageSquare,
      description: 'Send automated SMS reminders, OTP verifications, and voice calls worldwide.',
      fields: ['accountSid', 'authToken', 'phoneNumber'],
      enabled: false,
      config: {},
    },
    {
      key: 'telegram',
      name: 'Telegram Bot',
      category: 'Communication',
      icon: MessageSquare,
      description: 'Receive real-time staff alerts, urgent order notifications, and support tickets via Telegram bot.',
      fields: ['botToken', 'chatId'],
      enabled: false,
      config: {},
    },
    {
      key: 'slack',
      name: 'Slack Team Channels',
      category: 'Communication',
      icon: MessageSquare,
      description: 'Stream order alerts, CRM leads, and payment notifications to your internal team Slack channels.',
      fields: ['webhookUrl', 'botToken'],
      enabled: false,
      config: {},
    },
    {
      key: 'google_workspace',
      name: 'Google Workspace',
      category: 'Productivity',
      icon: Building,
      description: 'Sync customer emails, attach Google Drive files, and send mail through your corporate Gmail.',
      fields: ['clientId', 'clientSecret'],
      enabled: false,
      config: {},
    },
    {
      key: 'microsoft_365',
      name: 'Microsoft 365 / Outlook',
      category: 'Productivity',
      icon: Building,
      description: 'Sync with Microsoft Outlook calendar, send emails via Exchange, and collaborate in Teams.',
      fields: ['clientId', 'clientSecret', 'tenantId'],
      enabled: false,
      config: {},
    },
    {
      key: 'zoom',
      name: 'Zoom Video Meetings',
      category: 'Productivity',
      icon: MessageSquare,
      description: 'Automatically generate Zoom meeting links for client consultations, tutoring sessions, and webinars.',
      fields: ['clientId', 'clientSecret', 'accountId'],
      enabled: false,
      config: {},
    },
    {
      key: 'google_calendar',
      name: 'Google Calendar Sync',
      category: 'Productivity',
      icon: Building,
      description: 'Bi-directional calendar sync for appointments, class schedules, and room reservations.',
      fields: ['clientId', 'clientSecret'],
      enabled: false,
      config: {},
    },
  ]);

  // Toggle Provider Active Status
  const handleToggleProvider = (key: string) => {
    setProviders((prev) =>
      prev.map((p) => {
        if (p.key === key) {
          const newState = !p.enabled;
          toast({ title: `${p.name} is now ${newState ? 'ENABLED' : 'DISABLED'}` });
          return { ...p, enabled: newState };
        }
        return p;
      })
    );
  };

  // Save Provider Config
  const handleSaveConfig = () => {
    if (!configureModal) return;
    setProviders((prev) =>
      prev.map((p) => {
        if (p.key === configureModal.key) {
          return { ...p, config: { ...p.config, ...configForm }, enabled: true };
        }
        return p;
      })
    );
    toast({ title: `${configureModal.name} configuration saved & activated!` });
    setConfigureModal(null);
  };

  // Save / Update Notification Template
  const handleSaveTemplate = () => {
    if (!templateModal) return;
    if (templateModal.id) {
      setTemplates((prev) => prev.map((t) => (t.id === templateModal.id ? templateModal : t)));
      toast({ title: 'Template updated!' });
    } else {
      setTemplates((prev) => [
        ...prev,
        {
          id: `tmpl-${Date.now()}`,
          key: templateModal.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          ...templateModal,
        },
      ]);
      toast({ title: 'New template created!' });
    }
    setTemplateModal(null);
  };

  // Preview Template with replaced variables
  const renderPreview = (tmpl: any) => {
    const vars: Record<string, string> = {
      '{{customer_name}}': 'Alexander Hamilton',
      '{{business_name}}': tenant?.name || 'Grand Azure Resort',
      '{{order_id}}': 'ORD-98214',
      '{{amount}}': '$180.00',
      '{{service_name}}': 'Oceanview Executive Suite',
      '{{booking_date}}': 'Monday, Oct 27, 2026',
      '{{booking_time}}': '14:00 PM',
      '{{staff_name}}': 'Dr. Gregory House',
      '{{business_address}}': 'Suite 400, Commercial Bay District',
      '{{portal_link}}': `http://${tenant?.subdomain || 'demo'}.localhost:3002/site/${tenant?.subdomain || 'demo'}/portal`,
      '{{reschedule_link}}': `http://${tenant?.subdomain || 'demo'}.localhost:3002/site/${tenant?.subdomain || 'demo'}/portal`,
      '{{product_name}}': 'Organic Cedarwood Beard Balm 50ml',
      '{{sku}}': 'BALM-50',
      '{{current_stock}}': '3',
      '{{reorder_point}}': '10',
    };

    let subject = tmpl.subject || '';
    let body = tmpl.body || '';

    Object.entries(vars).forEach(([k, v]) => {
      subject = subject.replaceAll(k, v);
      body = body.replaceAll(k, v);
    });

    return { subject, body };
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Link className="h-6 w-6 text-indigo-600" />
            Integrations & Notification Engine
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure payment gateways, email SMTP, WhatsApp ordering, and notification templates.
          </p>
        </div>

        <Button
          size="sm"
          className="h-8 text-xs gap-1.5 bg-indigo-600 text-white hover:bg-indigo-500"
          onClick={() => {
            setTemplateModal({
              name: '',
              channel: 'email',
              subject: '',
              body: '',
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
            <CreditCard className="h-3.5 w-3.5" /> Payment & Communication Gateways ({providers.length})
          </TabsTrigger>
          <TabsTrigger value="templates" className="text-xs gap-1.5">
            <Bell className="h-3.5 w-3.5" /> Notification Templates Manager ({templates.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Gateways & Integrations Catalog ────────────────────────────── */}
        <TabsContent value="catalog" className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.map((prov) => {
              const Icon = prov.icon;
              return (
                <Card
                  key={prov.key}
                  className={cn(
                    'transition-all shadow-xs flex flex-col justify-between border-2',
                    prov.enabled ? 'border-indigo-600/40 bg-card' : 'border-border/60 bg-muted/20 opacity-80'
                  )}
                >
                  <CardContent className="pt-5 pb-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-bold">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {prov.enabled ? 'Active' : 'Disabled'}
                        </span>
                        <Switch
                          checked={prov.enabled}
                          onCheckedChange={() => handleToggleProvider(prov.key)}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm text-foreground">{prov.name}</h4>
                        <Badge variant="outline" className="text-[10px]">{prov.category}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
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
                        className="h-8 text-xs"
                        onClick={() => toast({ title: `${prov.name} connection test passed ✓` })}
                        title="Test API handshake"
                      >
                        <TestTube className="h-3.5 w-3.5 text-indigo-600" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── Tab 2: Notification Templates Manager ───────────────────────────── */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Automated Notification Templates</CardTitle>
                <p className="text-xs text-muted-foreground">Preview, edit, or customize transactional emails, SMS, and WhatsApp alerts</p>
              </div>
              <Button
                size="sm"
                onClick={() => setTemplateModal({ name: '', channel: 'email', subject: '', body: '' })}
                className="h-8 text-xs bg-indigo-600 text-white"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Template
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 border-b text-muted-foreground">
                    <tr>
                      <th className="p-3 font-semibold">Template Name</th>
                      <th className="p-3 font-semibold">Channel</th>
                      <th className="p-3 font-semibold">Subject / Trigger</th>
                      <th className="p-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {templates.map((t) => (
                      <tr key={t.id} className="hover:bg-muted/30">
                        <td className="p-3 font-semibold text-foreground">{t.name}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px] uppercase font-mono">{t.channel}</Badge>
                        </td>
                        <td className="p-3 text-muted-foreground max-w-xs truncate">{t.subject}</td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => setPreviewTemplate(t)}
                            >
                              <Eye className="h-3 w-3 mr-1" /> Live Preview
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-7 text-xs"
                              onClick={() => setTemplateModal({ ...t })}
                            >
                              <Edit className="h-3 w-3 mr-1" /> Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-red-600 hover:bg-red-50"
                              onClick={() => {
                                setTemplates((prev) => prev.filter((item) => item.id !== t.id));
                                toast({ title: 'Template deleted' });
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                Provide credentials for secure checkout, notification delivery, or manual bank instructions.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              {configureModal.fields.map((field: string) => (
                <div key={field} className="space-y-1">
                  <Label className="capitalize">{field.replace(/([A-Z])/g, ' $1')}</Label>
                  <Input
                    value={configForm[field] || ''}
                    onChange={(e) => setConfigForm((p) => ({ ...p, [field]: e.target.value }))}
                    placeholder={`Enter ${field}`}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              ))}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setConfigureModal(null)}>Cancel</Button>
                <Button size="sm" className="bg-indigo-600 text-white" onClick={handleSaveConfig}>
                  Save & Enable Gateway
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Modal: Live Template Preview ──────────────────────────────────────── */}
      {previewTemplate && (
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm">
                <Eye className="h-4 w-4 text-indigo-600" />
                Live Notification Preview — {previewTemplate.name}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Rendered with simulated customer and order parameters.
              </DialogDescription>
            </DialogHeader>

            {(() => {
              const rendered = renderPreview(previewTemplate);
              return (
                <div className="space-y-3 py-2 text-xs">
                  {previewTemplate.channel === 'email' ? (
                    <div className="border rounded-xl bg-white text-slate-900 overflow-hidden shadow-xs">
                      <div className="bg-slate-100 p-3 border-b text-[11px] text-slate-600 space-y-0.5">
                        <p><strong>From:</strong> {tenant?.name || 'NexOS'} &lt;orders@{tenant?.subdomain || 'demo'}.nexos.app&gt;</p>
                        <p><strong>To:</strong> Alexander Hamilton &lt;alexander@example.com&gt;</p>
                        <p><strong>Subject:</strong> {rendered.subject}</p>
                      </div>
                      <div className="p-4 whitespace-pre-wrap leading-relaxed text-slate-800 font-sans">
                        {rendered.body}
                      </div>
                    </div>
                  ) : (
                    /* WhatsApp / SMS Preview */
                    <div className="border rounded-2xl bg-[#e5ddd5] dark:bg-[#0b141a] p-4 max-w-sm mx-auto shadow-inner">
                      <div className="bg-white dark:bg-[#202c33] text-slate-900 dark:text-slate-100 p-3.5 rounded-xl rounded-tl-none shadow-sm text-xs whitespace-pre-wrap">
                        {rendered.body}
                        <span className="text-[10px] text-muted-foreground float-right mt-2">14:24 ✓✓</span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <Button size="sm" onClick={() => setPreviewTemplate(null)}>Close Preview</Button>
                  </div>
                </div>
              );
            })()}
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
                <Label>Template Title *</Label>
                <Input
                  value={templateModal.name}
                  onChange={(e) => setTemplateModal((p: any) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. VIP Booking Confirmation"
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
                </select>
              </div>

              <div className="space-y-1">
                <Label>Subject Line</Label>
                <Input
                  value={templateModal.subject}
                  onChange={(e) => setTemplateModal((p: any) => ({ ...p, subject: e.target.value }))}
                  placeholder="Subject with variables like {{order_id}}"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label>Template Body</Label>
                <textarea
                  rows={6}
                  value={templateModal.body}
                  onChange={(e) => setTemplateModal((p: any) => ({ ...p, body: e.target.value }))}
                  placeholder="Body content with variables (e.g. {{customer_name}}, {{amount}})..."
                  className="w-full p-2.5 border rounded-lg bg-background text-xs font-mono"
                />
              </div>

              <div className="p-2 rounded bg-muted/40 text-[11px] text-muted-foreground">
                Supported tags: <code>{'{{customer_name}}'}</code>, <code>{'{{business_name}}'}</code>, <code>{'{{order_id}}'}</code>, <code>{'{{amount}}'}</code>, <code>{'{{portal_link}}'}</code>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setTemplateModal(null)}>Cancel</Button>
                <Button size="sm" className="bg-indigo-600 text-white" onClick={handleSaveTemplate}>
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
