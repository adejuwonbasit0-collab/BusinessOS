'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Code, Globe, Webhook, Key, Play, Copy, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

const devApi = {
  listApiKeys: () => api.get('/auth/api-keys') as Promise<any>,
  createApiKey: (data: any) => api.post('/auth/api-keys', data) as Promise<any>,
  revokeApiKey: (id: string) => api.delete(`/auth/api-keys/${id}`) as Promise<any>,
};

const API_ENDPOINTS = [
  { group: 'Auth', endpoints: [
    { method: 'POST', path: '/api/v1/auth/login', desc: 'Login and get JWT token' },
    { method: 'POST', path: '/api/v1/auth/refresh', desc: 'Refresh access token' },
    { method: 'POST', path: '/api/v1/auth/logout', desc: 'Logout and invalidate token' },
  ]},
  { group: 'CRM', endpoints: [
    { method: 'GET',  path: '/api/v1/contacts', desc: 'List all contacts' },
    { method: 'POST', path: '/api/v1/contacts', desc: 'Create a new contact' },
    { method: 'PATCH',path: '/api/v1/contacts/:id', desc: 'Update a contact' },
    { method: 'GET',  path: '/api/v1/contacts/stats', desc: 'CRM stats and pipeline overview' },
  ]},
  { group: 'Finance', endpoints: [
    { method: 'GET',  path: '/api/v1/invoices', desc: 'List invoices' },
    { method: 'POST', path: '/api/v1/invoices', desc: 'Create invoice' },
    { method: 'POST', path: '/api/v1/invoices/:id/send', desc: 'Send invoice by email' },
    { method: 'POST', path: '/api/v1/invoices/:id/mark-paid', desc: 'Mark invoice as paid' },
  ]},
  { group: 'Analytics', endpoints: [
    { method: 'GET', path: '/api/v1/analytics/executive', desc: 'Executive dashboard data' },
    { method: 'GET', path: '/api/v1/analytics/kpis', desc: 'Key performance indicators' },
    { method: 'GET', path: '/api/v1/analytics/revenue', desc: 'Revenue by period' },
    { method: 'GET', path: '/api/v1/analytics/sales', desc: 'Sales analytics breakdown' },
  ]},
  { group: 'Automation', endpoints: [
    { method: 'GET',  path: '/api/v1/workflows', desc: 'List automation workflows' },
    { method: 'POST', path: '/api/v1/workflows', desc: 'Create a workflow' },
    { method: 'POST', path: '/api/v1/workflows/:id/toggle', desc: 'Activate or pause a workflow' },
    { method: 'POST', path: '/api/v1/workflows/:id/test-run', desc: 'Run a test execution' },
  ]},
  { group: 'AI', endpoints: [
    { method: 'POST', path: '/api/v1/ai/analyze', desc: 'Analyze business description' },
    { method: 'POST', path: '/api/v1/ai/chat', desc: 'AI business assistant chat' },
    { method: 'POST', path: '/api/v1/ai/generate-workflow', desc: 'Generate workflow from description' },
    { method: 'POST', path: '/api/v1/ai/generate-report', desc: 'Generate AI business report' },
  ]},
];

const METHOD_COLORS: Record<string, string> = {
  GET:    'bg-blue-500/10 text-blue-600',
  POST:   'bg-green-500/10 text-green-600',
  PATCH:  'bg-amber-500/10 text-amber-600',
  PUT:    'bg-amber-500/10 text-amber-600',
  DELETE: 'bg-red-500/10 text-red-600',
};

const SDK_SNIPPETS = {
  typescript: `import NexOS from '@nexos/sdk';

const client = new NexOS({
  apiKey: process.env.NEXOS_API_KEY!,
  tenantId: process.env.NEXOS_TENANT_ID!,
});

// List contacts
const contacts = await client.crm.contacts.list({
  type: 'customer',
  limit: 25,
});

// Create invoice
const invoice = await client.finance.invoices.create({
  contactId: 'contact_123',
  items: [{ name: 'Consulting', quantity: 10, unitPrice: 150 }],
  dueDate: '2026-02-28',
});

// Trigger a workflow
await client.automation.trigger('contact.created', {
  contactId: contacts[0].id,
});`,

  python: `import nexos

client = nexos.Client(
    api_key=os.environ["NEXOS_API_KEY"],
    tenant_id=os.environ["NEXOS_TENANT_ID"],
)

# List contacts
contacts = client.crm.contacts.list(type="customer", limit=25)

# Create invoice
invoice = client.finance.invoices.create(
    contact_id="contact_123",
    items=[{"name": "Consulting", "quantity": 10, "unit_price": 150}],
    due_date="2026-02-28",
)

# Chat with AI assistant
reply = client.ai.chat([
    {"role": "user", "content": "What are my top 5 leads this month?"}
])`,

  curl: `# Authenticate
curl -X POST https://api.nexos.app/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@example.com","password":"yourpassword"}'

# List contacts (with API key)
curl https://api.nexos.app/api/v1/contacts \\
  -H "X-API-Key: nx_live_your_api_key_here"

# Create invoice
curl -X POST https://api.nexos.app/api/v1/invoices \\
  -H "X-API-Key: nx_live_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "contactId": "contact_123",
    "items": [{"name": "Service", "quantity": 1, "unitPrice": 500}]
  }'`,
};

export default function DevToolkitPage() {
  const [activeSnippet, setActiveSnippet] = useState<'typescript' | 'python' | 'curl'>('typescript');
  const [testUrl, setTestUrl] = useState('');
  const [testMethod, setTestMethod] = useState('POST');
  const [testBody, setTestBody] = useState('{\n  "event": "contact.created",\n  "data": { "contactId": "test_123" }\n}');
  const [testResult, setTestResult] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const copyCode = (code: string, label: string) => {
    navigator.clipboard.writeText(code);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const testWebhook = async () => {
    try {
      const res = await fetch(testUrl, {
        method: testMethod,
        headers: { 'Content-Type': 'application/json' },
        body: testMethod !== 'GET' ? testBody : undefined,
      });
      const data = await res.json().catch(() => ({ status: res.status }));
      setTestResult({ status: res.status, ok: res.ok, data });
    } catch (err: any) {
      setTestResult({ error: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Code className="h-6 w-6 text-rose-500" />Developer Toolkit
        </h1>
        <p className="text-sm text-muted-foreground mt-1">API explorer, webhook tester, and SDK reference</p>
      </div>

      <Tabs defaultValue="explorer">
        <TabsList>
          <TabsTrigger value="explorer"><Globe className="h-3.5 w-3.5 mr-1.5" />API Explorer</TabsTrigger>
          <TabsTrigger value="sdk"><Code className="h-3.5 w-3.5 mr-1.5" />SDK</TabsTrigger>
          <TabsTrigger value="webhooks"><Webhook className="h-3.5 w-3.5 mr-1.5" />Webhook Tester</TabsTrigger>
          <TabsTrigger value="keys"><Key className="h-3.5 w-3.5 mr-1.5" />API Keys</TabsTrigger>
        </TabsList>

        {/* ── API Explorer ── */}
        <TabsContent value="explorer" className="mt-4 space-y-4">
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="p-4 border-b bg-muted/20">
              <p className="text-sm font-semibold">Base URL: <span className="font-mono text-primary">https://api.nexos.app</span></p>
              <p className="text-xs text-muted-foreground mt-1">Authenticate with <code className="bg-muted px-1.5 py-0.5 rounded">X-API-Key</code> header or JWT Bearer token</p>
            </div>
            {API_ENDPOINTS.map((group) => (
              <div key={group.group}>
                <div className="px-4 py-2 bg-muted/10 border-b border-t">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.group}</p>
                </div>
                {group.endpoints.map((ep) => (
                  <div key={ep.path} className="flex items-center gap-3 px-4 py-3 border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <Badge variant="outline" className={cn('text-[10px] font-bold w-12 justify-center shrink-0', METHOD_COLORS[ep.method])}>
                      {ep.method}
                    </Badge>
                    <code className="text-xs font-mono text-foreground flex-1 min-w-0 truncate">{ep.path}</code>
                    <span className="text-xs text-muted-foreground hidden sm:block">{ep.desc}</span>
                    <Button size="sm" variant="ghost" className="h-7 text-xs shrink-0"
                      onClick={() => copyCode(`${ep.method} ${ep.path}`, ep.path)}>
                      {copied === ep.path ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ── SDK ── */}
        <TabsContent value="sdk" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Official SDKs</CardTitle>
              <CardDescription>Install the NexOS SDK for your language</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { lang: 'TypeScript / Node.js', cmd: 'npm install @nexos/sdk', badge: 'Stable' },
                { lang: 'Python', cmd: 'pip install nexos-sdk', badge: 'Beta' },
                { lang: 'PHP', cmd: 'composer require nexos/sdk', badge: 'Coming Soon' },
                { lang: 'Go', cmd: 'go get github.com/nexos-app/nexos-go', badge: 'Coming Soon' },
              ].map((item) => (
                <div key={item.lang} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
                  <div>
                    <p className="text-sm font-medium">{item.lang}</p>
                    <code className="text-xs text-muted-foreground font-mono">{item.cmd}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{item.badge}</Badge>
                    {item.badge !== 'Coming Soon' && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs"
                        onClick={() => copyCode(item.cmd, item.lang)}>
                        {copied === item.lang ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Code Examples</CardTitle>
              <div className="flex gap-2 mt-2">
                {(['typescript', 'python', 'curl'] as const).map((lang) => (
                  <Button key={lang} size="sm" variant={activeSnippet === lang ? 'default' : 'outline'}
                    className="h-7 text-xs capitalize" onClick={() => setActiveSnippet(lang)}>
                    {lang}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="bg-muted/50 border rounded-xl p-4 overflow-x-auto text-xs font-mono leading-relaxed max-h-80 overflow-y-auto">
                  {SDK_SNIPPETS[activeSnippet]}
                </pre>
                <Button size="sm" variant="ghost" className="absolute top-2 right-2 h-7 text-xs"
                  onClick={() => copyCode(SDK_SNIPPETS[activeSnippet], 'snippet')}>
                  {copied === 'snippet' ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Webhook Tester ── */}
        <TabsContent value="webhooks" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Send Test Request</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Select value={testMethod} onValueChange={setTestMethod}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input value={testUrl} onChange={(e) => setTestUrl(e.target.value)} placeholder="https://your-endpoint.com/webhook" className="flex-1" />
                </div>
                {testMethod !== 'GET' && (
                  <div className="space-y-1.5">
                    <Label>Request Body (JSON)</Label>
                    <Textarea value={testBody} onChange={(e) => setTestBody(e.target.value)} rows={6} className="font-mono text-xs resize-none" />
                  </div>
                )}
                <Button onClick={testWebhook} disabled={!testUrl.trim()} className="w-full">
                  <Play className="h-4 w-4 mr-2" />Send Request
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Response</CardTitle></CardHeader>
              <CardContent>
                {testResult ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className={testResult.ok ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'}>
                        {testResult.status || 'Error'}
                      </Badge>
                      {testResult.error && <span className="text-xs text-red-600">{testResult.error}</span>}
                    </div>
                    <pre className="bg-muted/50 border rounded-xl p-3 text-xs font-mono overflow-auto max-h-64">
                      {JSON.stringify(testResult.data || testResult, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                    Send a request to see the response here
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── API Keys ── */}
        <TabsContent value="keys" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">API Keys</CardTitle>
              <CardDescription>Use API keys to authenticate programmatic access to NexOS</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-700 dark:text-amber-400">
                Keep your API keys secret. Never expose them in client-side code, public repos, or browser URLs.
              </div>
              <Button size="sm"><Key className="h-4 w-4 mr-2" />Generate New API Key</Button>
              <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded-xl">
                <Key className="h-6 w-6 mx-auto mb-2 opacity-30" />
                API keys will appear here once created
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
