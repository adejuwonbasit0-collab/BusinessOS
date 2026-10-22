'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Cable, CreditCard, Mail, MessageSquare, Cloud, CheckCircle2, 
  ExternalLink, Key, ShieldCheck, RefreshCw, Eye, EyeOff
} from 'lucide-react';

interface PlatformIntegration {
  id: string;
  name: string;
  category: 'payment' | 'email' | 'whatsapp' | 'storage';
  description: string;
  enabled: boolean;
  fields: { key: string; label: string; value: string; isSecret?: boolean }[];
  testedAt?: string;
  status: 'connected' | 'unconfigured' | 'testing';
}

export default function PlatformIntegrationsPage() {
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const [integrations, setIntegrations] = useState<PlatformIntegration[]>([
    {
      id: 'stripe-global',
      name: 'Stripe SaaS Subscriptions & Connect',
      category: 'payment',
      description: 'Powers platform tier billings, automated invoicing, and tenant marketplace payouts.',
      enabled: true,
      status: 'connected',
      testedAt: 'Today at 10:14 AM',
      fields: [
        { key: 'secret_key', label: 'Stripe Secret Key', value: 'sk_live_51Pxxxx9988220011aAbBcC', isSecret: true },
        { key: 'webhook_secret', label: 'Webhook Signing Secret', value: 'whsec_99118822773344', isSecret: true },
        { key: 'publishable_key', label: 'Publishable Key', value: 'pk_live_51Pxxxx9988220011Pub', isSecret: false },
      ],
    },
    {
      id: 'paystack-global',
      name: 'Paystack African Billing Gateway',
      category: 'payment',
      description: 'Enables NGN / GHS / KES card and bank account billing for African tenants.',
      enabled: true,
      status: 'connected',
      testedAt: 'Yesterday at 4:20 PM',
      fields: [
        { key: 'secret_key', label: 'Secret Key', value: 'sk_live_229988aabbccddee', isSecret: true },
        { key: 'public_key', label: 'Public Key', value: 'pk_live_229988aabbccddee', isSecret: false },
      ],
    },
    {
      id: 'flutterwave-global',
      name: 'Flutterwave Multi-Currency Payments',
      category: 'payment',
      description: 'Supports mobile money, USSD, and pan-African currencies across 30+ countries.',
      enabled: false,
      status: 'unconfigured',
      fields: [
        { key: 'secret_key', label: 'Secret Key', value: '', isSecret: true },
        { key: 'public_key', label: 'Public Key', value: '', isSecret: false },
      ],
    },
    {
      id: 'resend-email',
      name: 'Resend Transactional Email API',
      category: 'email',
      description: 'High-deliverability transactional emails for user invites, billing receipts, and password resets.',
      enabled: true,
      status: 'connected',
      testedAt: 'Oct 21, 2026',
      fields: [
        { key: 'api_key', label: 'Resend API Key', value: 're_123456789_abcdefg', isSecret: true },
        { key: 'from_email', label: 'Default From Email', value: 'notifications@nexos.app', isSecret: false },
        { key: 'from_name', label: 'Sender Name', value: 'NexOS Platform', isSecret: false },
      ],
    },
    {
      id: 'smtp-relay',
      name: 'Custom SMTP Server Relay',
      category: 'email',
      description: 'Direct fallback mail relay for enterprise custom domain mailings.',
      enabled: false,
      status: 'unconfigured',
      fields: [
        { key: 'host', label: 'SMTP Host', value: 'smtp.mailgun.org', isSecret: false },
        { key: 'port', label: 'Port', value: '587', isSecret: false },
        { key: 'username', label: 'SMTP Username', value: '', isSecret: false },
        { key: 'password', label: 'SMTP Password', value: '', isSecret: true },
      ],
    },
    {
      id: 'meta-whatsapp',
      name: 'Meta WhatsApp Cloud Business API',
      category: 'whatsapp',
      description: 'Official Meta Graph API connection for automated booking reminders, order alerts, and CRM chats.',
      enabled: true,
      status: 'connected',
      testedAt: 'Today at 08:30 AM',
      fields: [
        { key: 'token', label: 'Permanent System User Token', value: 'EAAG991188...META_SEC_TOKEN', isSecret: true },
        { key: 'phone_id', label: 'WhatsApp Phone Number ID', value: '1098273645129', isSecret: false },
        { key: 'waba_id', label: 'WhatsApp Business Account ID', value: '7829104857291', isSecret: false },
        { key: 'verify_token', label: 'Webhook Verify Token', value: 'nexos_meta_webhook_secret_2026', isSecret: true },
      ],
    },
    {
      id: 'aws-s3-storage',
      name: 'AWS S3 / Cloudflare R2 Asset Bucket',
      category: 'storage',
      description: 'Multi-tenant file hosting for logos, documents, uploaded invoices, and website assets.',
      enabled: true,
      status: 'connected',
      testedAt: 'Oct 22, 2026',
      fields: [
        { key: 'bucket', label: 'S3 Bucket Name', value: 'nexos-production-media', isSecret: false },
        { key: 'region', label: 'AWS Region', value: 'us-east-1', isSecret: false },
        { key: 'access_key', label: 'Access Key ID', value: 'AKIAIOSFODNN7EXAMPLE', isSecret: false },
        { key: 'secret_key', label: 'Secret Access Key', value: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', isSecret: true },
        { key: 'cdn_url', label: 'Public CDN URL', value: 'https://cdn.nexos.app', isSecret: false },
      ],
    },
  ]);

  const toggleIntegration = (id: string) => {
    setIntegrations(integrations.map(integ => {
      if (integ.id === id) {
        const nextEnabled = !integ.enabled;
        return { ...integ, enabled: nextEnabled };
      }
      return integ;
    }));
  };

  const handleFieldChange = (integId: string, fieldKey: string, newValue: string) => {
    setIntegrations(integrations.map(integ => {
      if (integ.id === integId) {
        return {
          ...integ,
          fields: integ.fields.map(f => f.key === fieldKey ? { ...f, value: newValue } : f)
        };
      }
      return integ;
    }));
  };

  const toggleSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const testConnection = (id: string) => {
    setIntegrations(integrations.map(integ => integ.id === id ? { ...integ, status: 'testing' } : integ));
    setTimeout(() => {
      setIntegrations(integrations.map(integ => {
        if (integ.id === id) {
          return {
            ...integ,
            status: 'connected',
            testedAt: 'Just now'
          };
        }
        return integ;
      }));
      setSuccessToast(`Connection test passed successfully for ${integrations.find(i => i.id === id)?.name}!`);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Cable className="h-6 w-6 text-primary" />
            Platform Global Integrations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Super admin platform-level credentials for payment gateways, email relays, WhatsApp Cloud API, and cloud storage
          </p>
        </div>
      </div>

      {successToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-700 hover:text-emerald-900 font-bold ml-4">✕</button>
        </div>
      )}

      {/* Integration Cards */}
      <div className="grid grid-cols-1 gap-6">
        {integrations.map((integ) => {
          const isPayment = integ.category === 'payment';
          const isEmail = integ.category === 'email';
          const isWa = integ.category === 'whatsapp';
          const isStorage = integ.category === 'storage';

          const IconComponent = isPayment ? CreditCard : isEmail ? Mail : isWa ? MessageSquare : Cloud;

          return (
            <Card key={integ.id} className={integ.enabled ? 'border-primary/40' : 'opacity-85'}>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl shrink-0 ${
                      isPayment ? 'bg-indigo-100 text-indigo-700' :
                      isEmail ? 'bg-amber-100 text-amber-700' :
                      isWa ? 'bg-emerald-100 text-emerald-700' :
                      'bg-cyan-100 text-cyan-700'
                    }`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{integ.name}</CardTitle>
                        <Badge variant="outline" className="capitalize text-[10px]">
                          {integ.category}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs mt-0.5">{integ.description}</CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    {integ.status === 'connected' && (
                      <span className="text-xs text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleIntegration(integ.id)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        integ.enabled ? 'bg-primary' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          integ.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t">
                  {integ.fields.map((field) => {
                    const secretKey = `${integ.id}-${field.key}`;
                    const isVisible = showSecrets[secretKey];
                    return (
                      <div key={field.key} className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                          <span>{field.label}</span>
                          {field.isSecret && (
                            <button
                              type="button"
                              onClick={() => toggleSecret(secretKey)}
                              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                            >
                              {isVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              {isVisible ? 'Hide' : 'Reveal'}
                            </button>
                          )}
                        </label>
                        <Input
                          type={field.isSecret && !isVisible ? 'password' : 'text'}
                          value={field.value}
                          onChange={(e) => handleFieldChange(integ.id, field.key, e.target.value)}
                          placeholder={`Enter ${field.label.toLowerCase()}...`}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t text-xs text-muted-foreground">
                  <span>{integ.testedAt ? `Last verified: ${integ.testedAt}` : 'Not tested yet'}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={integ.status === 'testing' || !integ.enabled}
                      onClick={() => testConnection(integ.id)}
                    >
                      <RefreshCw className={`h-3 w-3 mr-1 ${integ.status === 'testing' ? 'animate-spin' : ''}`} />
                      {integ.status === 'testing' ? 'Testing...' : 'Test Connection'}
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setSuccessToast(`Settings saved for ${integ.name}`)}
                    >
                      Save Configuration
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
