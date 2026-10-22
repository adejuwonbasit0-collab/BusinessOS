'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DollarSign, ShoppingCart, Package, Users, Briefcase, Calendar,
  FileText, ArrowRight, AlertTriangle, ShieldAlert, Clock, Plus,
  Play, Pause, Trash2, Edit, CheckCircle, RefreshCw, Layers, Calculator
} from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

export default function ErpPage() {
  const { tenant } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'risk' | 'scheduler' | 'expenses'>('overview');

  // Modals
  const [riskModalOpen, setRiskModalOpen] = useState(false);
  const [schedulerModalOpen, setSchedulerModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);

  // Risk Register State
  const [risks, setRisks] = useState([
    {
      id: 'RSK-101',
      title: 'Supply Chain Port Delay for Critical Raw Materials',
      category: 'Operational',
      probability: 4,
      impact: 4,
      score: 16,
      severity: 'High',
      mitigation: 'Establish secondary local distributor contracts and buffer 30-day stock reserve.',
      owner: 'Supply Chain Dir.',
      status: 'Mitigating',
    },
    {
      id: 'RSK-102',
      title: 'Currency Fluctuation & Import FX Exposure',
      category: 'Financial',
      probability: 3,
      impact: 4,
      score: 12,
      severity: 'High',
      mitigation: 'Implement multi-currency hedging and adjust local catalog pricing bi-weekly.',
      owner: 'Chief Financial Officer',
      status: 'Monitored',
    },
    {
      id: 'RSK-103',
      title: 'Regulatory Data Privacy Compliance Audit (GDPR/NDPR)',
      category: 'Compliance',
      probability: 2,
      impact: 3,
      score: 6,
      severity: 'Medium',
      mitigation: 'Quarterly third-party data audit and automated tokenization for customer PII.',
      owner: 'Head of Legal & IT',
      status: 'Closed',
    },
  ]);

  const [riskForm, setRiskForm] = useState({
    title: '',
    category: 'Operational',
    probability: '3',
    impact: '3',
    mitigation: '',
    owner: '',
  });

  // Task Scheduler State
  const [scheduledTasks, setScheduledTasks] = useState([
    {
      id: 'CRON-01',
      name: 'Daily Low Stock Automated Reorder Alert',
      frequency: 'Daily at 08:00 AM',
      cron: '0 8 * * *',
      action: 'Check inventory threshold and send PO draft to suppliers',
      lastRun: 'Today at 08:00 AM',
      nextRun: 'Tomorrow at 08:00 AM',
      status: 'Active',
    },
    {
      id: 'CRON-02',
      name: 'Automated Database Backup & S3 Snapshot',
      frequency: 'Daily at 02:00 AM',
      cron: '0 2 * * *',
      action: 'Dump PostgreSQL schema/data and upload AES-256 encrypted archive',
      lastRun: 'Today at 02:00 AM',
      nextRun: 'Tomorrow at 02:00 AM',
      status: 'Active',
    },
    {
      id: 'CRON-03',
      name: 'Overdue Invoice Reminder Dispatch',
      frequency: 'Weekly on Mondays',
      cron: '0 9 * * 1',
      action: 'Send automated email & WhatsApp reminder for unpaid invoices past net terms',
      lastRun: 'Oct 20 at 09:00 AM',
      nextRun: 'Oct 27 at 09:00 AM',
      status: 'Active',
    },
  ]);

  const [taskForm, setTaskForm] = useState({
    name: '',
    frequency: 'Daily at 09:00 AM',
    cron: '0 9 * * *',
    action: '',
  });

  // Operational Expenses State
  const [expenses, setExpenses] = useState([
    { id: 'EXP-401', payee: 'Cloud Infrastructure & Servers', category: 'Technology', amount: 480.00, date: 'Oct 18, 2026', status: 'Approved' },
    { id: 'EXP-402', payee: 'Commercial Warehouse Utilities', category: 'Facilities', amount: 1250.00, date: 'Oct 15, 2026', status: 'Approved' },
    { id: 'EXP-403', payee: 'Packaging Materials & Thermal Paper', category: 'Operations', amount: 320.00, date: 'Oct 12, 2026', status: 'Approved' },
  ]);

  const [expenseForm, setExpenseForm] = useState({
    payee: '',
    category: 'Operations',
    amount: '',
    date: '2026-10-22',
  });

  // Add Risk Item
  const handleAddRisk = (e: React.FormEvent) => {
    e.preventDefault();
    const prob = parseInt(riskForm.probability) || 1;
    const imp = parseInt(riskForm.impact) || 1;
    const score = prob * imp;
    const severity = score >= 15 ? 'Critical' : score >= 10 ? 'High' : score >= 5 ? 'Medium' : 'Low';

    setRisks((prev) => [
      ...prev,
      {
        id: `RSK-${Math.floor(100 + Math.random() * 900)}`,
        title: riskForm.title,
        category: riskForm.category,
        probability: prob,
        impact: imp,
        score,
        severity,
        mitigation: riskForm.mitigation,
        owner: riskForm.owner || 'Risk Team',
        status: 'Identified',
      },
    ]);
    toast({ title: 'Risk logged in register!' });
    setRiskModalOpen(false);
    setRiskForm({ title: '', category: 'Operational', probability: '3', impact: '3', mitigation: '', owner: '' });
  };

  // Add Scheduled Task
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    setScheduledTasks((prev) => [
      ...prev,
      {
        id: `CRON-${Math.floor(10 + Math.random() * 90)}`,
        name: taskForm.name,
        frequency: taskForm.frequency,
        cron: taskForm.cron,
        action: taskForm.action,
        lastRun: 'Pending First Run',
        nextRun: 'Upcoming on schedule',
        status: 'Active',
      },
    ]);
    toast({ title: 'Scheduled background task created!' });
    setSchedulerModalOpen(false);
    setTaskForm({ name: '', frequency: 'Daily at 09:00 AM', cron: '0 9 * * *', action: '' });
  };

  // Add Expense
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setExpenses((prev) => [
      ...prev,
      {
        id: `EXP-${Math.floor(100 + Math.random() * 900)}`,
        payee: expenseForm.payee,
        category: expenseForm.category,
        amount: parseFloat(expenseForm.amount) || 0,
        date: expenseForm.date,
        status: 'Approved',
      },
    ]);
    toast({ title: 'Operational expense recorded in ledger!' });
    setExpenseModalOpen(false);
    setExpenseForm({ payee: '', category: 'Operations', amount: '', date: '2026-10-22' });
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6 text-indigo-600" />
            Enterprise Resource Planning (ERP)
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Operational backbone: supply chain, financial ledger, risk register, and scheduled background tasks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={() => setSchedulerModalOpen(true)}
          >
            <Clock className="h-3.5 w-3.5 text-indigo-600" />
            Schedule Cron Job
          </Button>

          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-indigo-600 text-white hover:bg-indigo-500"
            onClick={() => setRiskModalOpen(true)}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Add Risk Item
          </Button>
        </div>
      </div>

      {/* ── Tabs Navigation ─────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList className="bg-muted/70 p-1">
          <TabsTrigger value="overview" className="text-xs">ERP Executive Dashboard</TabsTrigger>
          <TabsTrigger value="risk" className="text-xs gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5" /> Risk Management Register ({risks.length})
          </TabsTrigger>
          <TabsTrigger value="scheduler" className="text-xs gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Task Scheduler & Cron ({scheduledTasks.length})
          </TabsTrigger>
          <TabsTrigger value="expenses" className="text-xs gap-1.5">
            <DollarSign className="h-3.5 w-3.5" /> Operational Expenses ({expenses.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: ERP Executive Overview ───────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Gross Revenue</p>
                <p className="text-2xl font-bold font-mono">$48,250.00</p>
                <p className="text-[11px] text-green-600 font-medium mt-1">↑ 14.8% vs last month</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Operating Expenses</p>
                <p className="text-2xl font-bold font-mono">$18,420.00</p>
                <p className="text-[11px] text-muted-foreground mt-1">Within budget threshold</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Active Risk Register</p>
                <p className="text-2xl font-bold font-mono text-amber-600">{risks.filter((r) => r.status !== 'Closed').length} Active</p>
                <p className="text-[11px] text-muted-foreground mt-1">2 High Severity Mitigating</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Automated Cron Tasks</p>
                <p className="text-2xl font-bold font-mono text-indigo-600">{scheduledTasks.length} Active</p>
                <p className="text-[11px] text-green-600 font-medium mt-1">100% on-time execution</p>
              </CardContent>
            </Card>
          </div>

          {/* ERP Subsystems Quick Navigator */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            {[
              { label: 'Sales & POS Terminal', href: '/sales', icon: ShoppingCart, desc: 'Quotations, orders, and instant thermal receipts.' },
              { label: 'Inventory & Barcode', href: '/inventory', icon: Package, desc: 'Suppliers, stock replenishment, and barcode labels.' },
              { label: 'Financial Accounting', href: '/accounting', icon: Calculator, desc: 'General ledger, chart of accounts, and balance sheet.' },
              { label: 'Project Milestones', href: '/projects', icon: Briefcase, desc: 'Kanban tasks, team dependencies, and timelines.' },
            ].map((mod) => (
              <Card key={mod.label} className="hover:border-primary/40 transition-colors shadow-2xs">
                <CardContent className="pt-5 pb-4 flex flex-col justify-between h-36">
                  <div>
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center mb-2">
                      <mod.icon className="h-4 w-4" />
                    </div>
                    <h4 className="font-semibold text-xs text-foreground">{mod.label}</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{mod.desc}</p>
                  </div>
                  <a href={mod.href} className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1 mt-2">
                    Open Subsystem <ArrowRight className="h-3 w-3" />
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Tab 2: Risk Management Module ───────────────────────────────────── */}
        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Enterprise Risk Register</CardTitle>
                <p className="text-xs text-muted-foreground">Identify, evaluate probability/impact, and enforce mitigation strategies</p>
              </div>
              <Button size="sm" onClick={() => setRiskModalOpen(true)} className="h-8 text-xs bg-indigo-600 text-white">
                <Plus className="h-3.5 w-3.5 mr-1" /> Log New Risk
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Risk ID & Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Prob x Imp</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Mitigation Strategy</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {risks.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="max-w-[220px]">
                        <span className="font-mono text-[10px] text-indigo-600 block">{r.id}</span>
                        <span className="font-semibold text-xs text-foreground">{r.title}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.category}</TableCell>
                      <TableCell className="text-center text-xs font-mono font-bold">
                        {r.probability} × {r.impact} = <span className="text-indigo-600">{r.score}</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-semibold',
                            r.severity === 'Critical' && 'bg-red-500/10 text-red-700 border-red-500/20',
                            r.severity === 'High' && 'bg-orange-500/10 text-orange-700 border-orange-500/20',
                            r.severity === 'Medium' && 'bg-amber-500/10 text-amber-700 border-amber-500/20',
                            r.severity === 'Low' && 'bg-green-500/10 text-green-700 border-green-500/20'
                          )}
                        >
                          {r.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate" title={r.mitigation}>
                        {r.mitigation}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] font-medium">{r.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-red-600 hover:bg-red-50"
                          onClick={() => {
                            setRisks((prev) => prev.filter((item) => item.id !== r.id));
                            toast({ title: `Deleted risk ${r.id}` });
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 3: Task Scheduler & Cron Jobs ─────────────────────────────────── */}
        <TabsContent value="scheduler" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Background Task Scheduler & Cron Engine</CardTitle>
                <p className="text-xs text-muted-foreground">Automated recurring tasks, reports, and system synchronization</p>
              </div>
              <Button size="sm" onClick={() => setSchedulerModalOpen(true)} className="h-8 text-xs bg-indigo-600 text-white">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Cron Job
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task Name & Cron</TableHead>
                    <TableHead>Action Purpose</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Last Executed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Run Now</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduledTasks.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <span className="font-semibold text-xs text-foreground block">{t.name}</span>
                        <code className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{t.cron}</code>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs">{t.action}</TableCell>
                      <TableCell className="text-xs font-medium">{t.frequency}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{t.lastRun}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">{t.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                          onClick={() => toast({ title: `Executed "${t.name}" successfully!` })}
                        >
                          <Play className="h-3 w-3" /> Run Now
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 4: Operational Expenses ──────────────────────────────────────── */}
        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Operating Expenses Log</CardTitle>
                <p className="text-xs text-muted-foreground">Track day-to-day expenditures and link receipts</p>
              </div>
              <Button size="sm" onClick={() => setExpenseModalOpen(true)} className="h-8 text-xs bg-indigo-600 text-white">
                <Plus className="h-3.5 w-3.5 mr-1" /> Log Expense
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference #</TableHead>
                    <TableHead>Vendor / Payee</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs text-indigo-600">{e.id}</TableCell>
                      <TableCell className="font-semibold text-xs">{e.payee}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.category}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.date}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-xs">${e.amount.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-red-600"
                          onClick={() => {
                            setExpenses((prev) => prev.filter((item) => item.id !== e.id));
                            toast({ title: 'Expense deleted' });
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Modal: Add Risk Register Item ─────────────────────────────────────── */}
      <Dialog open={riskModalOpen} onOpenChange={setRiskModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-indigo-600" />
              Log Risk in Register
            </DialogTitle>
            <DialogDescription>
              Record operational, financial, or compliance risks with contingency plans.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddRisk} className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label>Risk Description / Title *</Label>
              <Input
                required
                value={riskForm.title}
                onChange={(e) => setRiskForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Critical Server Hardware Failure"
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label>Category</Label>
                <select
                  value={riskForm.category}
                  onChange={(e) => setRiskForm((p) => ({ ...p, category: e.target.value }))}
                  className="w-full h-9 px-2 border rounded-lg bg-background text-xs"
                >
                  <option>Operational</option>
                  <option>Financial</option>
                  <option>Strategic</option>
                  <option>Compliance</option>
                  <option>Hazard</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label>Probability (1-5)</Label>
                <select
                  value={riskForm.probability}
                  onChange={(e) => setRiskForm((p) => ({ ...p, probability: e.target.value }))}
                  className="w-full h-9 px-2 border rounded-lg bg-background text-xs"
                >
                  <option value="1">1 - Rare</option>
                  <option value="2">2 - Unlikely</option>
                  <option value="3">3 - Moderate</option>
                  <option value="4">4 - Likely</option>
                  <option value="5">5 - Almost Certain</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label>Impact (1-5)</Label>
                <select
                  value={riskForm.impact}
                  onChange={(e) => setRiskForm((p) => ({ ...p, impact: e.target.value }))}
                  className="w-full h-9 px-2 border rounded-lg bg-background text-xs"
                >
                  <option value="1">1 - Negligible</option>
                  <option value="2">2 - Minor</option>
                  <option value="3">3 - Moderate</option>
                  <option value="4">4 - Major</option>
                  <option value="5">5 - Catastrophic</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Mitigation & Contingency Action Plan *</Label>
              <textarea
                required
                rows={3}
                value={riskForm.mitigation}
                onChange={(e) => setRiskForm((p) => ({ ...p, mitigation: e.target.value }))}
                placeholder="What controls and procedures mitigate this risk?"
                className="w-full p-2.5 border rounded-lg bg-background text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label>Risk Owner / Accountable Officer</Label>
              <Input
                value={riskForm.owner}
                onChange={(e) => setRiskForm((p) => ({ ...p, owner: e.target.value }))}
                placeholder="Chief Information Security Officer"
                className="h-9 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setRiskModalOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" className="bg-indigo-600 text-white">Save Risk</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Add Scheduled Task / Cron ─────────────────────────────────── */}
      <Dialog open={schedulerModalOpen} onOpenChange={setSchedulerModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-600" />
              Schedule Background Task
            </DialogTitle>
            <DialogDescription>Define automated execution schedules and recurring workflows.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddTask} className="space-y-3 py-2 text-xs">
            <div>
              <Label>Task Title *</Label>
              <Input
                required
                value={taskForm.name}
                onChange={(e) => setTaskForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Weekly Sales Performance Email Digest"
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Frequency</Label>
                <select
                  value={taskForm.frequency}
                  onChange={(e) => setTaskForm((p) => ({ ...p, frequency: e.target.value }))}
                  className="w-full h-9 px-2 border rounded-lg bg-background text-xs"
                >
                  <option>Hourly</option>
                  <option>Daily at 08:00 AM</option>
                  <option>Daily at Midnight</option>
                  <option>Weekly on Mondays</option>
                  <option>Monthly on 1st</option>
                </select>
              </div>

              <div>
                <Label>Cron Expression</Label>
                <Input
                  value={taskForm.cron}
                  onChange={(e) => setTaskForm((p) => ({ ...p, cron: e.target.value }))}
                  placeholder="0 9 * * 1"
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <Label>Action & Execution Goal</Label>
              <Input
                required
                value={taskForm.action}
                onChange={(e) => setTaskForm((p) => ({ ...p, action: e.target.value }))}
                placeholder="What action is executed when triggered?"
                className="h-9 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSchedulerModalOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" className="bg-indigo-600 text-white">Activate Schedule</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Add Expense ───────────────────────────────────────────────── */}
      <Dialog open={expenseModalOpen} onOpenChange={setExpenseModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-indigo-600" />
              Record Operating Expense
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddExpense} className="space-y-3 py-2 text-xs">
            <div>
              <Label>Payee / Vendor *</Label>
              <Input
                required
                value={expenseForm.payee}
                onChange={(e) => setExpenseForm((p) => ({ ...p, payee: e.target.value }))}
                placeholder="e.g. AWS Cloud Services or Office Depot"
                className="h-9 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Category</Label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm((p) => ({ ...p, category: e.target.value }))}
                  className="w-full h-9 px-2 border rounded-lg bg-background text-xs"
                >
                  <option>Operations</option>
                  <option>Technology</option>
                  <option>Facilities</option>
                  <option>Marketing</option>
                  <option>Payroll</option>
                </select>
              </div>
              <div>
                <Label>Amount ($) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm((p) => ({ ...p, amount: e.target.value }))}
                  placeholder="250.00"
                  className="h-9 text-xs font-semibold"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setExpenseModalOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" className="bg-indigo-600 text-white">Record Expense</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
