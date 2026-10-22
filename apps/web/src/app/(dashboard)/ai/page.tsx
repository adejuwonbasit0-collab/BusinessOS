'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { aiApi } from '@/lib/aiApi';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sparkles, Send, Loader2, Building2, Zap, FileText,
  BarChart3, Users, Globe, ChevronRight, CheckCircle, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/useToast';

interface Message { role: 'user' | 'assistant'; content: string; timestamp: Date }

const SUGGESTED_PROMPTS = [
  'What are the key metrics I should track for my business?',
  'How can I improve my customer retention rate?',
  'Generate a weekly operations review checklist',
  'What workflows should I automate first?',
  'Help me write a follow-up email sequence for new leads',
  'What KPIs matter most for a growing team?',
];

export default function AIPage() {
  const { tenant } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello! I'm your NexOS AI Business Assistant. I know your workspace — **${tenant?.name}** — and I'm here to help you:\n\n• Generate reports and business insights\n• Create workflows, SOPs, and policies\n• Analyze your business data\n• Answer any business question\n\nWhat would you like help with today?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('chat');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: (msgs: { role: string; content: string }[]) => aiApi.chat(msgs),
    onSuccess: (res) => {
      const reply = (res as any).data?.reply;
      setMessages((prev) => [...prev, { role: 'assistant', content: reply, timestamp: new Date() }]);
    },
    onError: (err: any) => {
      toast({ title: err.message || 'AI request failed', variant: 'destructive' });
      setMessages((prev) => prev.slice(0, -1));
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: (desc: string) => aiApi.analyze(desc),
    onSuccess: (res) => setAnalysisResult((res as any).data?.analysis),
    onError: (err: any) => toast({ title: err.message || 'Analysis failed', variant: 'destructive' }),
  });

  const applyMutation = useMutation({
    mutationFn: (analysis: any) => aiApi.applyAnalysis(analysis),
    onSuccess: () => {
      toast({ title: 'Industry configuration applied!', description: 'Your workspace has been adapted to your business type.' });
      setAnalysisResult(null);
      setBusinessDescription('');
    },
    onError: (err: any) => toast({ title: err.message || 'Failed to apply', variant: 'destructive' }),
  });

  const handleSend = () => {
    if (!input.trim()) return;
    const userMessage: Message = { role: 'user', content: input, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    const apiMessages = [...messages, userMessage].map((m) => ({ role: m.role, content: m.content }));
    chatMutation.mutate(apiMessages);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const formatMessage = (content: string) => {
    return content.split('\n').map((line, i) => {
      if (line.startsWith('• ') || line.startsWith('- ')) {
        return <li key={i} className="ml-4 list-disc">{line.slice(2).replace(/\*\*(.+?)\*\*/g, '$1')}</li>;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-semibold mt-2">{line.slice(2, -2)}</p>;
      }
      const parts = line.split(/(\*\*[^*]+\*\*)/);
      return (
        <p key={i} className={line === '' ? 'mt-2' : ''}>
          {parts.map((part, j) =>
            part.startsWith('**') && part.endsWith('**')
              ? <strong key={j}>{part.slice(2, -2)}</strong>
              : part
          )}
        </p>
      );
    });
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col space-y-0">
      <div className="flex items-center justify-between px-1 pb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Sparkles className="h-6 w-6 text-blue-500" />AI Assistant</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Powered by Claude — your intelligent business partner</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="shrink-0">
          <TabsTrigger value="chat"><Sparkles className="h-3.5 w-3.5 mr-1.5" />Chat</TabsTrigger>
          <TabsTrigger value="analyze"><Building2 className="h-3.5 w-3.5 mr-1.5" />Industry Analyzer</TabsTrigger>
          <TabsTrigger value="generate"><FileText className="h-3.5 w-3.5 mr-1.5" />Generate Content</TabsTrigger>
        </TabsList>

        {/* ── Chat Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 mt-4">
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
            {messages.map((msg, i) => (
              <div key={i} className={cn('flex gap-3', msg.role === 'user' && 'flex-row-reverse')}>
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0',
                  msg.role === 'assistant' ? 'bg-gradient-to-br from-blue-500 to-violet-600' : 'bg-gradient-to-br from-green-500 to-teal-600')}>
                  {msg.role === 'assistant' ? '✦' : 'Y'}
                </div>
                <div className={cn('max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                  msg.role === 'assistant' ? 'bg-card border rounded-tl-sm' : 'bg-primary text-primary-foreground rounded-tr-sm')}>
                  <div className="space-y-0.5">{formatMessage(msg.content)}</div>
                </div>
              </div>
            ))}
            {chatMutation.isPending && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs shrink-0">✦</div>
                <div className="bg-card border rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1">{[0,1,2].map((i) => <div key={i} className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />)}</div>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          <div className="shrink-0 space-y-3 pt-3 border-t">
            {messages.length <= 2 && (
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.slice(0, 3).map((p) => (
                  <button key={p} onClick={() => { setInput(p); }} className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-accent transition-colors text-left">{p}</button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Textarea
                value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="Ask anything about your business… (Enter to send, Shift+Enter for new line)"
                className="resize-none min-h-[52px] max-h-32" rows={2}
              />
              <Button onClick={handleSend} disabled={!input.trim() || chatMutation.isPending} size="icon" className="h-[52px] w-[52px] shrink-0">
                {chatMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* ── Industry Analyzer Tab ────────────────────────────────────── */}
        <TabsContent value="analyze" className="mt-4 flex-1 overflow-y-auto">
          <div className="max-w-2xl space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Describe Your Business</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={businessDescription}
                  onChange={(e) => setBusinessDescription(e.target.value)}
                  placeholder="E.g. We rent drones and provide aerial inspection services for construction sites and real estate agents. We have 5 staff and serve clients across 3 cities."
                  className="resize-none" rows={4}
                />
                <Button onClick={() => analyzeMutation.mutate(businessDescription)} disabled={!businessDescription.trim() || analyzeMutation.isPending} className="w-full">
                  {analyzeMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing your business…</> : <><Sparkles className="h-4 w-4 mr-2" />Analyze & Configure</>}
                </Button>
              </CardContent>
            </Card>

            {analysisResult && (
              <div className="space-y-4">
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="pt-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold">{analysisResult.businessType}</h3>
                        <p className="text-xs text-muted-foreground capitalize">Industry: {analysisResult.industry}</p>
                      </div>
                      <Badge className="bg-primary/15 text-primary border-primary/20"><CheckCircle className="h-3 w-3 mr-1" />Ready to apply</Badge>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Recommended Modules ({analysisResult.recommendedModules?.length})</p>
                        <div className="flex flex-wrap gap-1.5">
                          {analysisResult.recommendedModules?.map((m: string) => <Badge key={m} variant="secondary" className="capitalize">{m}</Badge>)}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Generated Workflows ({analysisResult.suggestedWorkflows?.length})</p>
                        {analysisResult.suggestedWorkflows?.map((wf: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-sm py-1">
                            <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            <span>{wf.name}</span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Terminology Overrides</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {Object.entries(analysisResult.terminologyOverrides || {}).map(([k, v]: [string, any]) => (
                            <div key={k} className="text-xs flex items-center gap-1.5"><span className="text-muted-foreground capitalize">{k}</span><ChevronRight className="h-3 w-3 text-muted-foreground" /><span className="font-medium">{v}</span></div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <Button onClick={() => applyMutation.mutate(analysisResult)} disabled={applyMutation.isPending} className="w-full mt-4">
                      {applyMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                      Apply This Configuration
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Generate Content Tab ─────────────────────────────────────── */}
        <TabsContent value="generate" className="mt-4 flex-1 overflow-y-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: FileText, label: 'Business Report', desc: 'AI-generated P&L and operations analysis', color: 'bg-blue-500/10 text-blue-500', action: () => aiApi.generateReport('Monthly Business Overview', '30d').then((r: any) => { toast({ title: 'Report generated!', description: r.data?.report?.title }); }) },
              { icon: BarChart3, label: 'SOPs', desc: 'Standard operating procedures for your team', color: 'bg-violet-500/10 text-violet-500', action: () => aiApi.generateSOPs().then(() => toast({ title: 'SOPs generated!' })) },
              { icon: FileText, label: 'Policies', desc: 'HR and operations policies for your business', color: 'bg-teal-500/10 text-teal-500', action: () => aiApi.generatePolicies().then(() => toast({ title: 'Policies generated!' })) },
              { icon: Globe, label: 'Website Copy', desc: 'Compelling homepage content for your website', color: 'bg-amber-500/10 text-amber-500', action: () => aiApi.generateWebsiteContent().then(() => toast({ title: 'Website content generated!' })) },
              { icon: Zap, label: 'Dashboard Layout', desc: 'AI-suggested KPI widgets for your industry', color: 'bg-rose-500/10 text-rose-500', action: () => aiApi.generateDashboard().then(() => toast({ title: 'Dashboard layout generated!' })) },
              { icon: Users, label: 'Lead Scoring Model', desc: 'Configure AI-powered lead scoring', color: 'bg-indigo-500/10 text-indigo-500', action: () => setActiveTab('chat') },
            ].map((item) => (
              <GenerateCard key={item.label} {...item} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GenerateCard({ icon: Icon, label, desc, color, action }: { icon: any; label: string; desc: string; color: string; action: () => void }) {
  const [loading, setLoading] = useState(false);
  const handleClick = async () => {
    setLoading(true);
    try { await action(); } finally { setLoading(false); }
  };
  return (
    <Card className="hover:border-primary/30 cursor-pointer transition-all" onClick={handleClick}>
      <CardContent className="pt-5">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', color)}>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
        </div>
        <h3 className="font-semibold text-sm">{label}</h3>
        <p className="text-xs text-muted-foreground mt-1">{desc}</p>
      </CardContent>
    </Card>
  );
}
