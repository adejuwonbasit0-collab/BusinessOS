'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowsApi, aiApi } from '@/lib/aiApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Search, Zap, Play, Pause, Trash2, Copy, MoreHorizontal,
  CheckCircle, XCircle, Loader2, Sparkles, ChevronRight, GripVertical,
  Clock, ArrowDown, Mail, MessageSquare, Phone, Users, FileText,
  CreditCard, Package, Briefcase, Globe, AlertTriangle, Settings,
} from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

// ── Trigger catalogue ─────────────────────────────────────────────────────────
const TRIGGERS = [
  { key: 'contact.created', label: 'New Contact', category: 'CRM', icon: Users, color: 'text-blue-500 bg-blue-500/10' },
  { key: 'contact.updated', label: 'Contact Updated', category: 'CRM', icon: Users, color: 'text-blue-500 bg-blue-500/10' },
  { key: 'deal.created', label: 'New Deal', category: 'CRM', icon: Users, color: 'text-violet-500 bg-violet-500/10' },
  { key: 'deal.won', label: 'Deal Won', category: 'CRM', icon: CheckCircle, color: 'text-green-500 bg-green-500/10' },
  { key: 'deal.lost', label: 'Deal Lost', category: 'CRM', icon: XCircle, color: 'text-red-500 bg-red-500/10' },
  { key: 'invoice.created', label: 'Invoice Created', category: 'Finance', icon: CreditCard, color: 'text-amber-500 bg-amber-500/10' },
  { key: 'invoice.paid', label: 'Invoice Paid', category: 'Finance', icon: CreditCard, color: 'text-green-500 bg-green-500/10' },
  { key: 'invoice.overdue', label: 'Invoice Overdue', category: 'Finance', icon: AlertTriangle, color: 'text-red-500 bg-red-500/10' },
  { key: 'booking.created', label: 'New Booking', category: 'Bookings', icon: Clock, color: 'text-indigo-500 bg-indigo-500/10' },
  { key: 'form.submitted', label: 'Form Submitted', category: 'Forms', icon: FileText, color: 'text-teal-500 bg-teal-500/10' },
  { key: 'webhook.received', label: 'Webhook Received', category: 'Dev', icon: Globe, color: 'text-rose-500 bg-rose-500/10' },
  { key: 'schedule.daily', label: 'Every Day', category: 'Schedule', icon: Clock, color: 'text-muted-foreground bg-muted' },
  { key: 'schedule.weekly', label: 'Every Week', category: 'Schedule', icon: Clock, color: 'text-muted-foreground bg-muted' },
  { key: 'schedule.monthly', label: 'Every Month', category: 'Schedule', icon: Clock, color: 'text-muted-foreground bg-muted' },
];

// ── Step catalogue ────────────────────────────────────────────────────────────
const STEP_TYPES = [
  { key: 'send_email', label: 'Send Email', icon: '📧', category: 'Communication', color: 'text-blue-500 bg-blue-500/10' },
  { key: 'send_sms', label: 'Send SMS', icon: '📱', category: 'Communication', color: 'text-teal-500 bg-teal-500/10' },
  { key: 'send_whatsapp', label: 'Send WhatsApp', icon: '💬', category: 'Communication', color: 'text-green-500 bg-green-500/10' },
  { key: 'notify_user', label: 'Notify User', icon: '🔔', category: 'Communication', color: 'text-amber-500 bg-amber-500/10' },
  { key: 'wait', label: 'Wait / Delay', icon: '⏳', category: 'Logic', color: 'text-muted-foreground bg-muted' },
  { key: 'condition', label: 'If / Condition', icon: '🔀', category: 'Logic', color: 'text-amber-500 bg-amber-500/10' },
  { key: 'set_variable', label: 'Set Variable', icon: '📦', category: 'Logic', color: 'text-muted-foreground bg-muted' },
  { key: 'create_contact', label: 'Create Contact', icon: '👤', category: 'CRM', color: 'text-blue-500 bg-blue-500/10' },
  { key: 'update_contact', label: 'Update Contact', icon: '✏️', category: 'CRM', color: 'text-blue-500 bg-blue-500/10' },
  { key: 'create_deal', label: 'Create Deal', icon: '🤝', category: 'CRM', color: 'text-violet-500 bg-violet-500/10' },
  { key: 'create_task', label: 'Create Task', icon: '✅', category: 'Projects', color: 'text-indigo-500 bg-indigo-500/10' },
  { key: 'create_invoice', label: 'Create Invoice', icon: '📄', category: 'Finance', color: 'text-amber-500 bg-amber-500/10' },
  { key: 'score_lead', label: 'AI Score Lead', icon: '⭐', category: 'AI', color: 'text-yellow-500 bg-yellow-500/10' },
  { key: 'ai_action', label: 'AI Action', icon: '🤖', category: 'AI', color: 'text-violet-500 bg-violet-500/10' },
  { key: 'http_request', label: 'HTTP Request', icon: '🌐', category: 'Dev', color: 'text-rose-500 bg-rose-500/10' },
];

// ── Status colours ────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, string> = {
  active: 'bg-green-500/10 text-green-600 border-green-500/20',
  paused: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  draft: 'bg-muted text-muted-foreground border-border',
  archived: 'bg-muted text-muted-foreground border-border',
};

// ── Workflow Card ─────────────────────────────────────────────────────────────
function WorkflowCard({ workflow, onEdit, onToggle, onDelete, onTest, onDuplicate }: {
  workflow: any;
  onEdit: () => void;
  onToggle: (active: boolean) => void;
  onDelete: () => void;
  onTest: () => void;
  onDuplicate: () => void;
}) {
  const trigger = TRIGGERS.find((t) => t.key === workflow.trigger_type);
  const TriggerIcon = trigger?.icon || Zap;
  const steps: any[] = typeof workflow.steps === 'string' ? JSON.parse(workflow.steps) : (workflow.steps || []);
  const successRate = workflow.run_count > 0 ? Math.round((workflow.success_count / workflow.run_count) * 100) : null;

  return (
    <Card className={cn('transition-all hover:border-primary/30 hover:shadow-sm', workflow.status === 'draft' && 'opacity-70')}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', trigger?.color || 'bg-muted text-muted-foreground')}>
            <TriggerIcon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm">{workflow.name}</h3>
              <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize', STATUS_STYLE[workflow.status])}>{workflow.status}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{workflow.description || trigger?.label}</p>

            {/* Steps preview */}
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              {steps.slice(0, 5).map((step, i) => {
                const s = STEP_TYPES.find((x) => x.key === step.type);
                return (
                  <div key={i} className="flex items-center gap-0.5">
                    <span className={cn('text-[11px] px-2 py-0.5 rounded-md font-medium', s?.color || 'bg-muted text-muted-foreground')}>{s?.icon} {s?.label || step.type}</span>
                    {i < Math.min(steps.length, 5) - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                  </div>
                );
              })}
              {steps.length > 5 && <span className="text-xs text-muted-foreground">+{steps.length - 5}</span>}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold">{workflow.run_count?.toLocaleString() || 0}</p>
              <p className="text-[10px] text-muted-foreground">runs</p>
            </div>
            {successRate !== null && (
              <div className="text-right hidden sm:block">
                <p className={cn('text-xs font-bold', successRate >= 95 ? 'text-green-600' : successRate >= 80 ? 'text-amber-600' : 'text-red-500')}>{successRate}%</p>
                <p className="text-[10px] text-muted-foreground">success</p>
              </div>
            )}
            {workflow.status !== 'draft' && (
              <Switch checked={workflow.status === 'active'} onCheckedChange={onToggle} />
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 mt-3 pt-3 border-t">
          <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={onEdit}><Settings className="h-3 w-3 mr-1" />Edit</Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onTest} title="Test run"><Play className="h-3 w-3" /></Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onDuplicate} title="Duplicate"><Copy className="h-3 w-3" /></Button>
          <Button variant="outline" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={onDelete}><Trash2 className="h-3 w-3" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Step Builder inside the editor ───────────────────────────────────────────
function StepBuilder({ steps, onChange }: { steps: any[]; onChange: (steps: any[]) => void }) {
  const addStep = (type: string) => {
    const s = STEP_TYPES.find((x) => x.key === type)!;
    onChange([...steps, { type, name: s.label, config: {} }]);
  };
  const removeStep = (i: number) => onChange(steps.filter((_, idx) => idx !== i));
  const moveUp = (i: number) => { if (i === 0) return; const next = [...steps]; [next[i-1], next[i]] = [next[i], next[i-1]]; onChange(next); };

  const categorized = STEP_TYPES.reduce((acc: Record<string, typeof STEP_TYPES>, s) => {
    (acc[s.category] ??= []).push(s); return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Existing steps */}
      <div className="space-y-2">
        {steps.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed rounded-xl text-muted-foreground text-sm">
            Add steps below to define what this workflow does
          </div>
        ) : steps.map((step, i) => {
          const s = STEP_TYPES.find((x) => x.key === step.type);
          return (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && <div className="absolute left-5 -mt-4 h-4 w-px bg-border ml-[18px]" />}
              <div className={cn('flex items-center gap-2.5 flex-1 p-3 rounded-xl border', s?.color?.replace('text-', 'border-').replace('/10', '/20') || 'border-border bg-card')}>
                <span className="text-base">{s?.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{step.name || s?.label}</p>
                  <p className="text-xs text-muted-foreground capitalize">{step.type.replace(/_/g, ' ')}</p>
                </div>
                <div className="flex gap-1">
                  {i > 0 && <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => moveUp(i)} title="Move up">↑</Button>}
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeStep(i)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            </div>
          );
        })}
        {steps.length > 0 && <div className="flex justify-center"><ArrowDown className="h-4 w-4 text-muted-foreground" /></div>}
      </div>

      {/* Step picker */}
      <div className="space-y-2 max-h-56 overflow-y-auto border rounded-xl p-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Add a step</p>
        {Object.entries(categorized).map(([cat, catSteps]) => (
          <div key={cat} className="mb-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{cat}</p>
            <div className="grid grid-cols-2 gap-1.5">
              {catSteps.map((s) => (
                <button key={s.key} onClick={() => addStep(s.key)}
                  className={cn('flex items-center gap-1.5 p-2 rounded-lg border text-left text-xs font-medium transition-all hover:shadow-sm', s.color)}>
                  <span>{s.icon}</span><span className="truncate">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AutomationPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editWorkflow, setEditWorkflow] = useState<any>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [activeTab, setActiveTab] = useState('workflows');

  const [form, setForm] = useState({ name: '', description: '', triggerType: '', steps: [] as any[] });

  const { data: workflowsData, isLoading } = useQuery({ queryKey: ['workflows', search], queryFn: () => workflowsApi.list({ search: search || undefined }) });
  const { data: statsData } = useQuery({ queryKey: ['workflow-stats'], queryFn: workflowsApi.stats });

  const createMutation = useMutation({
    mutationFn: workflowsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflows'] }); toast({ title: 'Workflow created' }); setCreateOpen(false); setForm({ name: '', description: '', triggerType: '', steps: [] }); },
    onError: (err: any) => toast({ title: err.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => workflowsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflows'] }); toast({ title: 'Workflow saved' }); setEditWorkflow(null); },
    onError: (err: any) => toast({ title: err.message, variant: 'destructive' }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => workflowsApi.toggle(id, active),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflows'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: workflowsApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflows'] }); toast({ title: 'Workflow deleted' }); },
  });

  const testMutation = useMutation({
    mutationFn: workflowsApi.testRun,
    onSuccess: () => toast({ title: 'Test run completed', description: 'Check the run history for results.' }),
    onError: (err: any) => toast({ title: err.message, variant: 'destructive' }),
  });

  const dupMutation = useMutation({
    mutationFn: workflowsApi.duplicate,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflows'] }); toast({ title: 'Workflow duplicated' }); },
  });

  const aiGenMutation = useMutation({
    mutationFn: (desc: string) => aiApi.generateWorkflow(desc),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['workflows'] });
      toast({ title: 'Workflow created!', description: `"${res.data?.workflow?.name}" saved as draft` });
      setAiPrompt('');
    },
    onError: (err: any) => toast({ title: err.message, variant: 'destructive' }),
  });

  const workflows = (workflowsData as any)?.data?.workflows || [];
  const stats = (statsData as any)?.data?.overview;

  const openEdit = (wf: any) => {
    setEditWorkflow({
      ...wf,
      steps: typeof wf.steps === 'string' ? JSON.parse(wf.steps) : (wf.steps || []),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Automation Center</h1>
          <p className="text-sm text-muted-foreground mt-1">Visual workflow builder — automate any business process</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />New Workflow</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active', value: stats?.active || 0, color: 'text-green-600 bg-green-500/10' },
          { label: 'Total Runs', value: Number(stats?.total_runs || 0).toLocaleString(), color: 'text-blue-600 bg-blue-500/10' },
          { label: 'Success Rate', value: stats?.total_runs > 0 ? `${Math.round((stats.total_success / stats.total_runs) * 100)}%` : '—', color: 'text-teal-600 bg-teal-500/10' },
          { label: 'Recent Errors', value: stats?.total_errors || 0, color: 'text-red-600 bg-red-500/10' },
        ].map((s) => (
          <Card key={s.label}><CardContent className="pt-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{s.label}</p>
            <p className="text-2xl font-bold">{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
            <TabsTrigger value="ai-builder"><Sparkles className="h-3.5 w-3.5 mr-1.5" />AI Builder</TabsTrigger>
          </TabsList>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search workflows…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
        </div>

        {/* ── Workflows list ── */}
        <TabsContent value="workflows" className="mt-4">
          {isLoading ? (
            <div className="grid sm:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-36 skeleton rounded-xl" />)}</div>
          ) : workflows.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed rounded-xl text-muted-foreground">
              <Zap className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No workflows yet</p>
              <p className="text-sm mt-1">Create one manually or use the AI Builder</p>
              <Button size="sm" className="mt-4" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />Create Workflow</Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {workflows.map((wf: any) => (
                <WorkflowCard key={wf.id} workflow={wf}
                  onEdit={() => openEdit(wf)}
                  onToggle={(active) => toggleMutation.mutate({ id: wf.id, active })}
                  onDelete={() => deleteMutation.mutate(wf.id)}
                  onTest={() => testMutation.mutate(wf.id)}
                  onDuplicate={() => dupMutation.mutate(wf.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── AI Builder tab ── */}
        <TabsContent value="ai-builder" className="mt-4">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-blue-500" />Describe Your Automation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="E.g. When a new lead is added to CRM, wait 2 hours, score the lead with AI, then send a personalised welcome email and create a follow-up task for the sales team."
                rows={5} className="resize-none"
              />
              <div className="grid grid-cols-2 gap-2">
                {[
                  'When invoice is paid, send thank you email and create renewal task',
                  'Every Monday, generate a weekly sales report and email the team',
                  'When deal is won, notify Slack, create onboarding tasks, and send welcome email',
                  'When booking is confirmed, send confirmation SMS and calendar invite',
                ].map((ex) => (
                  <button key={ex} onClick={() => setAiPrompt(ex)} className="text-left text-xs p-3 rounded-lg bg-muted hover:bg-accent border transition-colors line-clamp-2">{ex}</button>
                ))}
              </div>
              <Button onClick={() => aiGenMutation.mutate(aiPrompt)} disabled={!aiPrompt.trim() || aiGenMutation.isPending} className="w-full">
                {aiGenMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating workflow…</> : <><Sparkles className="h-4 w-4 mr-2" />Generate Workflow with AI</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Create Workflow Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Workflow</DialogTitle></DialogHeader>
          <div className="space-y-5 py-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Workflow Name</Label>
                <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Lead Follow-up Sequence" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="What does this workflow automate?" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Trigger</Label>
                <Select value={form.triggerType} onValueChange={(v) => setForm((p) => ({ ...p, triggerType: v }))}>
                  <SelectTrigger><SelectValue placeholder="What triggers this workflow?" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TRIGGERS.reduce((acc: any, t) => { (acc[t.category] ??= []).push(t); return acc; }, {})).map(([cat, ts]: [string, any]) => (
                      <div key={cat}>
                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">{cat}</div>
                        {ts.map((t: any) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Steps</Label>
              <StepBuilder steps={form.steps} onChange={(steps) => setForm((p) => ({ ...p, steps }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate({ name: form.name, description: form.description, triggerType: form.triggerType, steps: form.steps })}
                disabled={!form.name || !form.triggerType || createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create Workflow
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Workflow Dialog ── */}
      {editWorkflow && (
        <Dialog open={!!editWorkflow} onOpenChange={() => setEditWorkflow(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit: {editWorkflow.name}</DialogTitle></DialogHeader>
            <div className="space-y-5 py-1">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={editWorkflow.name} onChange={(e) => setEditWorkflow((p: any) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input value={editWorkflow.description || ''} onChange={(e) => setEditWorkflow((p: any) => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={editWorkflow.status} onValueChange={(v) => setEditWorkflow((p: any) => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Steps</Label>
                <StepBuilder steps={editWorkflow.steps} onChange={(steps) => setEditWorkflow((p: any) => ({ ...p, steps }))} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditWorkflow(null)}>Cancel</Button>
                <Button onClick={() => updateMutation.mutate({ id: editWorkflow.id, data: { name: editWorkflow.name, description: editWorkflow.description, status: editWorkflow.status, steps: editWorkflow.steps } })}
                  disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
