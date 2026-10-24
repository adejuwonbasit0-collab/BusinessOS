'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Cable, CreditCard, Mail, MessageSquare, Cloud, CheckCircle2, AlertCircle,
  ExternalLink, Key, ShieldCheck, RefreshCw, Eye, EyeOff, Loader2
} from 'lucide-react';
import { api } from '@/lib/api';

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
  const [integrations, setIntegrations] = useState<PlatformIntegration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchIntegrations = async () => {
    try {
      const res: any = await api.get('/admin/integrations');
      if (res?.data?.integrations) {
        setIntegrations(res.data.integrations);
      }
    } catch (err: any) {
      setToastMessage({ text: err.message || 'Failed to load platform integrations', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const toggleIntegration = async (id: string) => {
    const integ = integrations.find(i => i.id === id);
    if (!integ) return;
    const nextEnabled = !integ.enabled;

    setIntegrations(prev => prev.map(item => item.id === id ? { ...item, enabled: nextEnabled } : item));

    const values: Record<string, string> = {};
    for (const f of integ.fields) {
      values[f.key] = f.value;
    }

    try {
      await api.post('/admin/integrations', {
        id,
        enabled: nextEnabled,
        values,
      });
      setToastMessage({ text: `${integ.name} is now ${nextEnabled ? 'enabled' : 'disabled'}`, type: 'success' });
    } catch (err: any) {
      // Revert on failure
      setIntegrations(prev => prev.map(item => item.id === id ? { ...item, enabled: !nextEnabled } : item));
      setToastMessage({ text: err.message || 'Failed to update integration state', type: 'error' });
    }
  };

  const handleFieldChange = (integId: string, fieldKey: string, newValue: string) => {
    setIntegrations(prev => prev.map(integ => {
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

  const saveConfiguration = async (id: string) => {
    const integ = integrations.find(i => i.id === id);
    if (!integ) return;

    setSavingId(id);
    const values: Record<string, string> = {};
    for (const f of integ.fields) {
      values[f.key] = f.value;
    }

    try {
      await api.post('/admin/integrations', {
        id,
        enabled: integ.enabled,
        values,
      });
      setToastMessage({ text: `Configuration persisted for ${integ.name}`, type: 'success' });
      fetchIntegrations();
    } catch (err: any) {
      setToastMessage({ text: err.message || 'Failed to save configuration', type: 'error' });
    } finally {
      setSavingId(null);
    }
  };

  const testConnection = async (id: string) => {
    const integ = integrations.find(i => i.id === id);
    if (!integ) return;

    setIntegrations(prev => prev.map(item => item.id === id ? { ...item, status: 'testing' } : item));

    const values: Record<string, string> = {};
    for (const f of integ.fields) {
      values[f.key] = f.value;
    }

    try {
      const res: any = await api.post(`/admin/integrations/${id}/test`, { values });
      setToastMessage({ text: res.message || `Verification passed for ${integ.name}!`, type: 'success' });
      setIntegrations(prev => prev.map(item => item.id === id ? { ...item, status: 'connected', testedAt: 'Just now' } : item));
    } catch (err: any) {
      setToastMessage({ text: err.message || `Verification failed for ${integ.name}`, type: 'error' });
      setIntegrations(prev => prev.map(item => item.id === id ? { ...item, status: 'unconfigured' } : item));
    }
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

      {toastMessage && (
        <div className={`p-4 border rounded-lg flex items-center justify-between text-sm ${
          toastMessage.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-red-50 border-red-200 text-red-900'
        }`}>
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="font-bold ml-4 opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center py-24 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2 text-primary" />
          Loading platform integrations...
        </div>
      ) : (
        /* Integration Cards */
        <div className="grid grid-cols-1 gap-6">
          {integrations.map((integ) => {
            const isPayment = integ.category === 'payment';
            const isEmail = integ.category === 'email';
            const isWa = integ.category === 'whatsapp';
            const isStorage = integ.category === 'storage';

            const IconComponent = isPayment ? CreditCard : isEmail ? Mail : isWa ? MessageSquare : Cloud;
            const isSaving = savingId === integ.id;

            return (
              <Card key={integ.id} className={integ.enabled ? 'border-primary/40 shadow-sm' : 'opacity-85'}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl shrink-0 ${
                        isPayment ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' :
                        isEmail ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                        isWa ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                        'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300'
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
                        <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleIntegration(integ.id)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          integ.enabled ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
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
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
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
                        disabled={isSaving}
                        onClick={() => saveConfiguration(integ.id)}
                      >
                        {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                        Save Configuration
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
