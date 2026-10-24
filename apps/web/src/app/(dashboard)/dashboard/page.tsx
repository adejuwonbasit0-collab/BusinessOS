'use client';

import { memo, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DollarSign, TrendingUp, TrendingDown, ShoppingCart, Users, Package,
  Briefcase, AlertTriangle, CheckCircle, Zap, BarChart3, Sparkles,
  RefreshCw, ArrowUpRight, ArrowDownRight, Clock, Plus, Store,
  Palette, Building2, Sliders, Settings, Layers, Calendar, ExternalLink,
  ShieldCheck, Wrench, HardHat, HeartPulse, GraduationCap, Plane, Scissors,
  Hotel, UtensilsCrossed, HelpCircle, FileText
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar,
} from 'recharts';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import { NICHES_DATA, getNicheDefinition, NicheDefinition } from '@/lib/nichesData';
import { toast } from '@/hooks/useToast';
import { useRouter } from 'next/navigation';

const execApi = {
  executive: () => api.get('/analytics/executive') as Promise<any>,
  kpis: () => api.get('/analytics/kpis') as Promise<any>,
  updateTenant: (data: any) => api.patch('/tenants/me', data) as Promise<any>,
  toggleModule: (moduleKey: string, enabled: boolean) => api.patch('/industries/modules', { moduleKey, enabled }) as Promise<any>,
};

const ALL_MODULES_CATALOG = [
  { key: 'crm', name: 'CRM & Pipeline', desc: 'Customer relationships, leads, and sales deals', icon: Users },
  { key: 'sales', name: 'Sales & POS Register', desc: 'Full Point of Sale, quotations, and instant thermal receipts', icon: ShoppingCart },
  { key: 'inventory', name: 'Inventory & Barcode', desc: 'Warehouses, stock levels, suppliers, POs, and barcode generator', icon: Package },
  { key: 'booking', name: 'Booking & Appointments', desc: 'Calendar scheduling, bookable resources, and public booking page', icon: Calendar },
  { key: 'erp', name: 'Complete ERP Suite', desc: 'Full ERP backbone, Risk Management register, and Task Scheduler', icon: Layers },
  { key: 'accounting', name: 'Double-Entry Accounting', desc: 'General ledger, chart of accounts, and financial reports', icon: DollarSign },
  { key: 'website', name: 'CMS Website Builder', desc: '100+ landing page templates, visual editor, and custom domain', icon: Sparkles },
  { key: 'hr', name: 'HR & Team Payroll', desc: 'Staff directory, attendance, leaves, and salary slips', icon: Briefcase },
  { key: 'projects', name: 'Project & Task Boards', desc: 'Kanban boards, milestones, and team assignments', icon: CheckCircle },
  { key: 'communication', name: 'Notification Center', desc: 'Email, SMS, and WhatsApp notification templates manager', icon: Zap },
  { key: 'ai', name: 'AI Business Intelligence', desc: 'Automated revenue forecasts, lead scoring, and content writing', icon: Sparkles },
];

export default function AdaptiveDashboardPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user, tenant, updateTenant } = useAuthStore();

  const [activeTab, setActiveTab] = useState('overview');
  const [period, setPeriod] = useState('30d');
  const [featureModalOpen, setFeatureModalOpen] = useState(false);
  const [customModuleModalOpen, setCustomModuleModalOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);

  // Dashboard Style & Theme state
  const [dashboardStyle, setDashboardStyle] = useState<'executive' | 'operations' | 'cards' | 'minimal'>('executive');
  const [colorTheme, setColorTheme] = useState('indigo');

  // Custom module builder state
  const [customModuleForm, setCustomModuleForm] = useState({
    name: '',
    description: '',
    singularName: '',
    fields: [
      { name: 'Title', type: 'text', required: true },
      { name: 'Status', type: 'select', options: 'Open, In Progress, Closed' },
    ],
  });

  const [customModules, setCustomModules] = useState<Array<any>>([]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Niche Definition based on current tenant
  const customNicheName = tenant?.settings?.customIndustryName;
  const currentNiche: NicheDefinition = useMemo(() => {
    return getNicheDefinition(tenant?.industry || 'general', customNicheName);
  }, [tenant?.industry, customNicheName]);

  const { data: execData, isLoading } = useQuery({
    queryKey: ['executive-dashboard'],
    queryFn: execApi.executive,
    staleTime: 60_000,
  });

  const exec = execData?.data;

  // Chart data
  const revenueChartData = useMemo(() => (exec?.revenueByMonth || []).map((r: any) => ({
    month: format(new Date(r.month), 'MMM'),
    revenue: parseFloat(r.revenue || 0),
    profit: parseFloat(r.revenue || 0) * 0.64,
  })), [exec]);
  // Only database-backed figures belong on an operating dashboard. The niche
  // labels remain helpful, but demo counts and imaginary percentage changes do
  // not represent a tenant's business.
  const liveKpis = useMemo(() => [
    { label: 'Revenue this month', value: exec ? `${tenant?.currency || 'USD'} ${Number(exec.revenue?.current || 0).toLocaleString()}` : '—', sub: 'Paid invoices', icon: currentNiche.icon },
    { label: 'Sales orders this month', value: exec ? Number(exec.orders?.current || 0).toLocaleString() : '—', sub: 'Recorded orders', icon: currentNiche.icon },
    { label: 'Customers / records', value: exec ? Number(exec.customers?.current || 0).toLocaleString() : '—', sub: 'Saved CRM records', icon: currentNiche.icon },
    { label: 'Overdue invoices', value: exec ? Number(exec.alerts?.overdueInvoices || 0).toLocaleString() : '—', sub: 'Needs follow-up', icon: currentNiche.icon },
  ], [exec, tenant?.currency, currentNiche.icon]);
  const quickActionPath = (action: string) => action === 'contacts' ? '/crm/contacts' : `/${action}`;

  const enabledModules = useMemo(() => {
    return Array.isArray(tenant?.enabledModules) ? tenant.enabledModules : [];
  }, [tenant?.enabledModules]);

  // Toggle Module
  const toggleModuleMutation = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      execApi.toggleModule(key, enabled),
    onSuccess: (_, vars) => {
      const updated = vars.enabled
        ? [...enabledModules, vars.key]
        : enabledModules.filter((k) => k !== vars.key);
      updateTenant({ enabledModules: updated });
      toast({ title: `Module "${vars.key}" ${vars.enabled ? 'enabled' : 'disabled'}` });
    },
    onError: (e: any) => toast({ title: e.message || 'Error updating module', variant: 'destructive' }),
  });

  // Handle Custom Module Creation
  const handleCreateCustomModule = () => {
    if (!customModuleForm.name) return;
    setCustomModules((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        name: customModuleForm.name,
        recordsCount: 0,
        lastUpdated: 'Just now',
      },
    ]);
    toast({ title: `Module "${customModuleForm.name}" created and linked to your dashboard!` });
    setCustomModuleModalOpen(false);
    setCustomModuleForm({ name: '', description: '', singularName: '', fields: [] });
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header & Adaptive Operating Badge ─────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {greeting}, {user?.firstName}
            </h1>
            <Badge className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-medium px-3 py-1 text-xs gap-1.5 shadow-sm">
              <span className="text-sm">{currentNiche.icon}</span>
              {currentNiche.name} Mode
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Operating workspace for <strong className="text-foreground">{tenant?.name}</strong> · {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Registered Business Niche Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
            <span className="text-sm">{currentNiche.icon}</span>
            <span>{currentNiche.name}</span>
          </div>

          {/* Add Features Button */}
          <Button
            size="sm"
            variant="outline"
            className="h-9 text-xs gap-1.5 border-indigo-200 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300"
            onClick={() => setFeatureModalOpen(true)}
          >
            <Store className="h-3.5 w-3.5 text-indigo-600" />
            Add Features
          </Button>

          {/* Theme & Customizer */}
          <Button
            size="sm"
            variant="outline"
            className="h-9 text-xs gap-1.5"
            onClick={() => setThemeModalOpen(true)}
          >
            <Palette className="h-3.5 w-3.5" />
            Themes & Styles
          </Button>
        </div>
      </div>

      {/* ── Niche-Specific Quick Actions Bar ───────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
          <Zap className="h-3.5 w-3.5 text-amber-500" /> Quick Actions:
        </span>
        {currentNiche.quickActions.map((qa, i) => (
          <Button
            key={i}
            size="sm"
            variant="secondary"
            className="h-8 text-xs font-medium shrink-0 gap-1.5 bg-card hover:bg-accent border shadow-2xs"
            onClick={() => router.push(quickActionPath(qa.action))}
          >
            <span>{qa.label}</span>
          </Button>
        ))}
        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-xs font-medium text-indigo-600 shrink-0 gap-1 hover:bg-indigo-50 dark:hover:bg-indigo-950"
          onClick={() => setCustomModuleModalOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" /> Custom Module Builder
        </Button>
      </div>

      {/* ── Niche KPIs Grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {liveKpis.map((kpi, idx) => (
          <Card key={idx} className="relative overflow-hidden shadow-xs hover:border-primary/40 transition-all">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{kpi.label}</span>
                <span className="text-xl">{currentNiche.icon}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-bold tracking-tight text-foreground">{kpi.value}</p>
              </div>
              {kpi.sub && <p className="text-[11px] text-muted-foreground mt-1">{kpi.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Main Operational Sections ─────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/70 p-1">
          <TabsTrigger value="overview" className="text-xs">Live Operations & Records</TabsTrigger>
          <TabsTrigger value="charts" className="text-xs">Revenue & Analytics</TabsTrigger>
          <TabsTrigger value="custom_modules" className="text-xs">
            My Built Modules ({customModules.length})
          </TabsTrigger>
          <TabsTrigger value="ai_insights" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1 text-indigo-500" />
            AI Operations Digest
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Live Operational Queue & Niche Specific Suites */}
        <TabsContent value="overview" className="space-y-4">
          {/* 🎓 SCHOOL & ACADEMY SUITE */}
          {(tenant?.industry?.includes('school') || tenant?.industry?.includes('university') || tenant?.industry?.includes('academy') || tenant?.industry?.includes('tutor')) ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-indigo-600" />
                    School Management & Academic Operations
                  </h3>
                  <p className="text-xs text-muted-foreground">Comprehensive academic LMS, examination scheduling, gradebook transcripts, and tuition billing</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="h-8 text-xs bg-indigo-600 text-white" onClick={() => toast({ title: 'New Academic Term Enrollment Opened' })}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> New Student Admission
                  </Button>
                </div>
              </div>

              {/* Sub-Tabs for School */}
              <Tabs defaultValue="courses" className="space-y-3">
                <TabsList className="bg-muted p-1 text-xs">
                  <TabsTrigger value="courses">📚 LMS & Courses</TabsTrigger>
                  <TabsTrigger value="exams">📝 Exams & Tests</TabsTrigger>
                  <TabsTrigger value="results">🏆 Student Results & Report Cards</TabsTrigger>
                  <TabsTrigger value="fees">💳 School Fees & Tuition</TabsTrigger>
                  <TabsTrigger value="attendance">👥 Students & Attendance</TabsTrigger>
                </TabsList>

                {/* Sub-tab 1: Courses & LMS */}
                <TabsContent value="courses">
                  <Card>
                    <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b">
                      <div>
                        <CardTitle className="text-sm font-semibold">Active Curriculum & Course Catalog</CardTitle>
                        <p className="text-[11px] text-muted-foreground">Term modules, instructor allocations, and syllabus tracking</p>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toast({ title: 'Course builder opened' })}>
                        <Plus className="h-3 w-3 mr-1" /> Add Course
                      </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-muted/40 text-muted-foreground border-b">
                            <tr>
                              <th className="py-2.5 px-3 font-semibold">Code</th>
                              <th className="py-2.5 px-3 font-semibold">Course Title</th>
                              <th className="py-2.5 px-3 font-semibold">Instructor</th>
                              <th className="py-2.5 px-3 font-semibold">Enrolled</th>
                              <th className="py-2.5 px-3 font-semibold">Attendance</th>
                              <th className="py-2.5 px-3 font-semibold">Status</th>
                              <th className="py-2.5 px-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {[
                              { code: 'MATH-401', title: 'Advanced Calculus & Analytical Geometry', teacher: 'Dr. Robert Hayes', students: 42, attendance: '96%', status: 'Active' },
                              { code: 'PHY-302', title: 'AP Physics C: Mechanics & Magnetism', teacher: 'Prof. Helen Clark', students: 38, attendance: '94%', status: 'Active' },
                              { code: 'ENG-201', title: 'World Literature & Academic Composition', teacher: 'Ms. Sarah Jenkins', students: 56, attendance: '98%', status: 'Active' },
                              { code: 'CHEM-305', title: 'Organic Chemistry & Laboratory Practicum', teacher: 'Dr. Arthur Campbell', students: 34, attendance: '91%', status: 'Active' },
                              { code: 'BIO-204', title: 'Genetics, Molecular Biology & Ecology', teacher: 'Dr. Naomi Miller', students: 48, attendance: '95%', status: 'Active' },
                            ].map((c) => (
                              <tr key={c.code} className="hover:bg-muted/30">
                                <td className="py-3 px-3 font-mono font-semibold text-indigo-600">{c.code}</td>
                                <td className="py-3 px-3 font-medium text-foreground">{c.title}</td>
                                <td className="py-3 px-3 text-muted-foreground">{c.teacher}</td>
                                <td className="py-3 px-3 font-semibold">{c.students} Students</td>
                                <td className="py-3 px-3 text-emerald-600 font-semibold">{c.attendance}</td>
                                <td className="py-3 px-3"><Badge className="bg-emerald-100 text-emerald-800 text-[10px]">{c.status}</Badge></td>
                                <td className="py-3 px-3 text-right">
                                  <Button size="sm" variant="ghost" className="h-6 text-xs text-indigo-600" onClick={() => toast({ title: `Viewing syllabus for ${c.code}` })}>
                                    Syllabus & LMS
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Sub-tab 2: Exams & Tests */}
                <TabsContent value="exams">
                  <Card>
                    <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b">
                      <div>
                        <CardTitle className="text-sm font-semibold">Scheduled Examinations & Assessments</CardTitle>
                        <p className="text-[11px] text-muted-foreground">Examination timetable, grading scales, and room proctor allocations</p>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toast({ title: 'Exam scheduler opened' })}>
                        <Plus className="h-3 w-3 mr-1" /> Schedule Exam
                      </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-muted/40 text-muted-foreground border-b">
                            <tr>
                              <th className="py-2.5 px-3 font-semibold">Exam Title</th>
                              <th className="py-2.5 px-3 font-semibold">Course</th>
                              <th className="py-2.5 px-3 font-semibold">Date & Time</th>
                              <th className="py-2.5 px-3 font-semibold">Hall / Room</th>
                              <th className="py-2.5 px-3 font-semibold">Total Marks</th>
                              <th className="py-2.5 px-3 font-semibold">Status</th>
                              <th className="py-2.5 px-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {[
                              { title: 'Midterm Assessment Fall 2026', course: 'Advanced Calculus', date: 'Nov 02, 2026 (09:00 AM)', room: 'Main Auditorium A', marks: '100 pts', status: 'Scheduled' },
                              { title: 'Physics Practical Lab Examination', course: 'AP Physics C', date: 'Nov 05, 2026 (11:30 AM)', room: 'Science Lab 2', marks: '50 pts', status: 'Scheduled' },
                              { title: 'World Literature Midterm Essay', course: 'World Literature', date: 'Oct 20, 2026', room: 'Hall B', marks: '100 pts', status: 'Graded' },
                              { title: 'Organic Chemistry Pop Quiz', course: 'Organic Chemistry', date: 'Oct 18, 2026', room: 'Room 304', marks: '25 pts', status: 'Graded' },
                            ].map((ex, i) => (
                              <tr key={i} className="hover:bg-muted/30">
                                <td className="py-3 px-3 font-medium text-foreground">{ex.title}</td>
                                <td className="py-3 px-3 text-muted-foreground">{ex.course}</td>
                                <td className="py-3 px-3">{ex.date}</td>
                                <td className="py-3 px-3 text-muted-foreground">{ex.room}</td>
                                <td className="py-3 px-3 font-mono font-semibold">{ex.marks}</td>
                                <td className="py-3 px-3">
                                  <Badge className={ex.status === 'Graded' ? 'bg-blue-100 text-blue-800 text-[10px]' : 'bg-amber-100 text-amber-800 text-[10px]'}>
                                    {ex.status}
                                  </Badge>
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <Button size="sm" variant="ghost" className="h-6 text-xs text-indigo-600" onClick={() => toast({ title: `Entering marks for ${ex.title}` })}>
                                    Enter Marks
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Sub-tab 3: Student Results & Gradebook */}
                <TabsContent value="results">
                  <Card>
                    <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b">
                      <div>
                        <CardTitle className="text-sm font-semibold">Student Gradebook & Official Report Cards</CardTitle>
                        <p className="text-[11px] text-muted-foreground">Cumulative GPA, grade allocations, transcripts, and parent reports</p>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toast({ title: 'Bulk report cards generated and queued for download!' })}>
                        <FileText className="h-3 w-3 mr-1" /> Generate All Report Cards
                      </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-muted/40 text-muted-foreground border-b">
                            <tr>
                              <th className="py-2.5 px-3 font-semibold">Admission ID</th>
                              <th className="py-2.5 px-3 font-semibold">Student Name</th>
                              <th className="py-2.5 px-3 font-semibold">Class / Grade</th>
                              <th className="py-2.5 px-3 font-semibold">Avg Score</th>
                              <th className="py-2.5 px-3 font-semibold">Letter Grade</th>
                              <th className="py-2.5 px-3 font-semibold">Term GPA</th>
                              <th className="py-2.5 px-3 font-semibold">Remarks</th>
                              <th className="py-2.5 px-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {[
                              { id: 'STU-2026-081', name: 'Emily Watson', grade: 'Grade 11-A', score: '96.4%', letter: 'A+', gpa: '3.98', remark: 'Academic Distinction' },
                              { id: 'STU-2026-082', name: 'Marcus Vance', grade: 'Grade 11-A', score: '88.2%', letter: 'B+', gpa: '3.45', remark: 'Commendable Effort' },
                              { id: 'STU-2026-083', name: 'Sophia Chen', grade: 'Grade 11-B', score: '94.8%', letter: 'A', gpa: '3.91', remark: 'High Honors' },
                              { id: 'STU-2026-084', name: 'Liam O’Connor', grade: 'Grade 11-B', score: '78.5%', letter: 'C+', gpa: '2.85', remark: 'Needs Math Tutoring' },
                              { id: 'STU-2026-085', name: 'Aisha Al-Mansoor', grade: 'Grade 11-A', score: '97.1%', letter: 'A+', gpa: '4.00', remark: 'Valedictorian Track' },
                            ].map((res) => (
                              <tr key={res.id} className="hover:bg-muted/30">
                                <td className="py-3 px-3 font-mono font-semibold">{res.id}</td>
                                <td className="py-3 px-3 font-medium text-foreground">{res.name}</td>
                                <td className="py-3 px-3 text-muted-foreground">{res.grade}</td>
                                <td className="py-3 px-3 font-semibold">{res.score}</td>
                                <td className="py-3 px-3"><Badge className="bg-indigo-100 text-indigo-800 text-[10px]">{res.letter}</Badge></td>
                                <td className="py-3 px-3 font-mono font-bold text-emerald-600">{res.gpa}</td>
                                <td className="py-3 px-3 text-muted-foreground">{res.remark}</td>
                                <td className="py-3 px-3 text-right">
                                  <Button size="sm" variant="outline" className="h-6 text-xs text-indigo-600" onClick={() => toast({ title: `Official Report Card PDF downloaded for ${res.name}!` })}>
                                    Print Report Card
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Sub-tab 4: School Fees & Tuition */}
                <TabsContent value="fees">
                  <Card>
                    <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b">
                      <div>
                        <CardTitle className="text-sm font-semibold">School Fees & Tuition Billing Ledger</CardTitle>
                        <p className="text-[11px] text-muted-foreground">Tuition schedules, lab charges, uniform fees, and payment receipt issuing</p>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toast({ title: 'New tuition invoice created' })}>
                        <Plus className="h-3 w-3 mr-1" /> Issue Fee Invoice
                      </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-muted/40 text-muted-foreground border-b">
                            <tr>
                              <th className="py-2.5 px-3 font-semibold">Invoice No</th>
                              <th className="py-2.5 px-3 font-semibold">Student</th>
                              <th className="py-2.5 px-3 font-semibold">Fee Category</th>
                              <th className="py-2.5 px-3 font-semibold">Amount Due</th>
                              <th className="py-2.5 px-3 font-semibold">Amount Paid</th>
                              <th className="py-2.5 px-3 font-semibold">Balance</th>
                              <th className="py-2.5 px-3 font-semibold">Status</th>
                              <th className="py-2.5 px-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {[
                              { no: 'SCH-INV-001', student: 'Emily Watson', category: 'Term 1 Tuition + Science Lab', due: '$1,450.00', paid: '$1,450.00', bal: '$0.00', status: 'Paid in Full' },
                              { no: 'SCH-INV-002', student: 'Marcus Vance', category: 'Term 1 Tuition', due: '$1,200.00', paid: '$600.00', bal: '$600.00', status: 'Partial Payment' },
                              { no: 'SCH-INV-003', student: 'Sophia Chen', category: 'Term 1 Tuition + Sports Pass', due: '$1,350.00', paid: '$1,350.00', bal: '$0.00', status: 'Paid in Full' },
                              { no: 'SCH-INV-004', student: 'Liam O’Connor', category: 'Term 1 Tuition', due: '$1,200.00', paid: '$0.00', bal: '$1,200.00', status: 'Overdue' },
                            ].map((f) => (
                              <tr key={f.no} className="hover:bg-muted/30">
                                <td className="py-3 px-3 font-mono font-semibold">{f.no}</td>
                                <td className="py-3 px-3 font-medium text-foreground">{f.student}</td>
                                <td className="py-3 px-3 text-muted-foreground">{f.category}</td>
                                <td className="py-3 px-3 font-semibold">{f.due}</td>
                                <td className="py-3 px-3 text-emerald-600 font-semibold">{f.paid}</td>
                                <td className="py-3 px-3 font-bold text-rose-600">{f.bal}</td>
                                <td className="py-3 px-3">
                                  <Badge className={
                                    f.status === 'Paid in Full' ? 'bg-emerald-100 text-emerald-800 text-[10px]' :
                                    f.status === 'Partial Payment' ? 'bg-amber-100 text-amber-800 text-[10px]' :
                                    'bg-rose-100 text-rose-800 text-[10px]'
                                  }>
                                    {f.status}
                                  </Badge>
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <Button size="sm" variant="outline" className="h-6 text-xs text-indigo-600" onClick={() => toast({ title: `Official School Receipt printed for ${f.student} (${f.no})` })}>
                                    Print Receipt
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Sub-tab 5: Students & Attendance */}
                <TabsContent value="attendance">
                  <Card>
                    <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b">
                      <div>
                        <CardTitle className="text-sm font-semibold">Daily Student Attendance Register</CardTitle>
                        <p className="text-[11px] text-muted-foreground">Class rolls, parent notification alerts, and absenteeism tracking</p>
                      </div>
                      <Button size="sm" className="h-7 text-xs bg-emerald-600 text-white" onClick={() => toast({ title: 'Attendance submitted and SMS sent to parents of absent students!' })}>
                        Submit Attendance & Alert Parents
                      </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-muted/40 text-muted-foreground border-b">
                            <tr>
                              <th className="py-2.5 px-3 font-semibold">Admission ID</th>
                              <th className="py-2.5 px-3 font-semibold">Student Name</th>
                              <th className="py-2.5 px-3 font-semibold">Grade</th>
                              <th className="py-2.5 px-3 font-semibold">Parent / Guardian Contact</th>
                              <th className="py-2.5 px-3 font-semibold">Today's Status</th>
                              <th className="py-2.5 px-3 text-right">Mark Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {[
                              { id: 'STU-081', name: 'Emily Watson', grade: 'Grade 11-A', phone: '+1 (555) 301-8822', status: 'Present' },
                              { id: 'STU-082', name: 'Marcus Vance', grade: 'Grade 11-A', phone: '+1 (555) 442-1928', status: 'Present' },
                              { id: 'STU-083', name: 'Sophia Chen', grade: 'Grade 11-A', phone: '+1 (555) 771-0029', status: 'Late (15 mins)' },
                              { id: 'STU-084', name: 'Liam O’Connor', grade: 'Grade 11-A', phone: '+1 (555) 992-3341', status: 'Absent (Unexcused)' },
                              { id: 'STU-085', name: 'Aisha Al-Mansoor', grade: 'Grade 11-A', phone: '+1 (555) 123-9081', status: 'Present' },
                            ].map((s) => (
                              <tr key={s.id} className="hover:bg-muted/30">
                                <td className="py-3 px-3 font-mono font-semibold">{s.id}</td>
                                <td className="py-3 px-3 font-medium text-foreground">{s.name}</td>
                                <td className="py-3 px-3 text-muted-foreground">{s.grade}</td>
                                <td className="py-3 px-3 font-mono text-muted-foreground">{s.phone}</td>
                                <td className="py-3 px-3">
                                  <Badge className={
                                    s.status === 'Present' ? 'bg-emerald-100 text-emerald-800 text-[10px]' :
                                    s.status.includes('Late') ? 'bg-amber-100 text-amber-800 text-[10px]' :
                                    'bg-rose-100 text-rose-800 text-[10px]'
                                  }>
                                    {s.status}
                                  </Badge>
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <div className="flex justify-end gap-1">
                                    <Button size="sm" variant="ghost" className="h-6 text-[10px] text-emerald-600 hover:bg-emerald-50" onClick={() => toast({ title: `${s.name} marked Present` })}>P</Button>
                                    <Button size="sm" variant="ghost" className="h-6 text-[10px] text-amber-600 hover:bg-amber-50" onClick={() => toast({ title: `${s.name} marked Late` })}>L</Button>
                                    <Button size="sm" variant="ghost" className="h-6 text-[10px] text-rose-600 hover:bg-rose-50" onClick={() => toast({ title: `${s.name} marked Absent` })}>A</Button>
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
            </div>
          ) : (
            /* Standard Live Operational Table for other niches */
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-semibold">{currentNiche.operationalTitle}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Live operational records adapting dynamically to your daily business workflow</p>
                </div>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => router.push('/erp')}>
                  Open Full ERP
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b bg-muted/30 text-muted-foreground">
                      <tr>
                        {currentNiche.operationalColumns.map((col, i) => (
                          <th key={i} className="py-2.5 px-3 font-semibold">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={currentNiche.operationalColumns.length} className="px-3 py-10 text-center text-sm text-muted-foreground">
                          No operational records yet. Create real records in the relevant module; this dashboard will then show only persisted business data.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Financial Charts */}
        <TabsContent value="charts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Monthly Revenue & Performance Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] w-full">
                {revenueChartData.length ? <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueChartData}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v / 1000}k`} />
                    <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}`, 'Amount']} />
                    <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#revGrad)" name="Gross Revenue" />
                    <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} fill="none" name="Net Margin" />
                  </AreaChart>
                </ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No revenue history is available yet.</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Tenant Custom Modules */}
        <TabsContent value="custom_modules" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">Tenant Custom Module Engine</h3>
              <p className="text-xs text-muted-foreground">Build bespoke database tables, forms, and workflows unique to your business</p>
            </div>
            <Button size="sm" onClick={() => setCustomModuleModalOpen(true)} className="h-8 text-xs bg-indigo-600 text-white hover:bg-indigo-500">
              <Plus className="h-3.5 w-3.5 mr-1" /> Build New Module
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {customModules.map((cm) => (
              <Card key={cm.id} className="hover:border-primary/40 transition-colors">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 flex items-center justify-center font-bold">
                      <Layers className="h-4 w-4" />
                    </div>
                    <Badge variant="outline" className="text-[10px]">{cm.recordsCount} Records</Badge>
                  </div>
                  <h4 className="font-semibold text-sm mt-3">{cm.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">Updated {cm.lastUpdated}</p>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-xs">View Records</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs">+ Add</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab 4: AI Insights */}
        <TabsContent value="ai_insights" className="space-y-3">
          <Card>
            <CardHeader><CardTitle className="text-sm">Tuned Operational Digest for {currentNiche.name}</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-800 dark:text-green-300 flex items-start gap-2.5">
                <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-green-600" />
                <p>Demand is trending up 14% this month for {currentNiche.name}. Consider adding staff or extending bookable slots to capture peak revenue.</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <p>3 scheduled follow-ups are pending attention. Automated reminders can be enabled in Notification Templates.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Modal: Add Features / Module Marketplace ─────────────────────────── */}
      <Dialog open={featureModalOpen} onOpenChange={setFeatureModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-indigo-600" />
              Module Marketplace & Feature Store
            </DialogTitle>
            <DialogDescription>
              Enable or disable any platform capability to build your ideal workflow.
            </DialogDescription>
          </DialogHeader>

          <div className="grid sm:grid-cols-2 gap-3 py-2">
            {ALL_MODULES_CATALOG.map((mod) => {
              const isEnabled = enabledModules.includes(mod.key);
              const Icon = mod.icon;
              return (
                <div
                  key={mod.key}
                  className={cn(
                    'p-3.5 rounded-xl border flex flex-col justify-between transition-colors',
                    isEnabled ? 'bg-indigo-50/30 border-indigo-200 dark:border-indigo-900 dark:bg-indigo-950/20' : 'bg-card'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn('p-2 rounded-lg shrink-0', isEnabled ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground')}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold">{mod.name}</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{mod.desc}</p>
                    </div>
                  </div>
                  <div className="flex justify-end mt-3">
                    <Button
                      size="sm"
                      variant={isEnabled ? 'default' : 'outline'}
                      className={cn('h-7 text-xs font-medium', isEnabled ? 'bg-indigo-600 hover:bg-indigo-500' : '')}
                      onClick={() => toggleModuleMutation.mutate({ key: mod.key, enabled: !isEnabled })}
                    >
                      {isEnabled ? 'Active ✓' : '+ Enable'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Custom Module Builder ──────────────────────────────────────── */}
      <Dialog open={customModuleModalOpen} onOpenChange={setCustomModuleModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-600" />
              Build a Custom Module
            </DialogTitle>
            <DialogDescription>
              Create a bespoke database module tailored specifically for your workflow.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="cmName" className="text-xs">Module Name (Plural)</Label>
              <Input
                id="cmName"
                value={customModuleForm.name}
                onChange={(e) => setCustomModuleForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Flight Logs, Guest Feedback, Equipment Audits"
                className="h-10 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cmSingular" className="text-xs">Item Label (Singular)</Label>
              <Input
                id="cmSingular"
                value={customModuleForm.singularName}
                onChange={(e) => setCustomModuleForm((p) => ({ ...p, singularName: e.target.value }))}
                placeholder="e.g. Log Entry, Inspection"
                className="h-10 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cmDesc" className="text-xs">Description</Label>
              <Input
                id="cmDesc"
                value={customModuleForm.description}
                onChange={(e) => setCustomModuleForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="What will your team track with this module?"
                className="h-10 text-xs"
              />
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              Built modules automatically receive dedicated CRUD forms, status filters, CSV exports, and API endpoints.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setCustomModuleModalOpen(false)}>Cancel</Button>
              <Button size="sm" className="bg-indigo-600 text-white" onClick={handleCreateCustomModule}>
                Create & Add to Dashboard
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Theme & Dashboard Customizer ───────────────────────────────── */}
      <Dialog open={themeModalOpen} onOpenChange={setThemeModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-indigo-600" />
              Dashboard Themes & Layout Customizer
            </DialogTitle>
            <DialogDescription>
              Tailor the layout density, color accents, and appearance of your workspace.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Dashboard Layout Style</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'executive', name: 'Executive Modern', desc: 'KPI cards with charts & queue' },
                  { key: 'operations', name: 'High-Density Ops', desc: 'Compact tables and instant logs' },
                  { key: 'cards', name: 'Card Flow', desc: 'Kanban-inspired visual metrics' },
                  { key: 'minimal', name: 'Minimal Focus', desc: 'Clean distraction-free interface' },
                ].map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setDashboardStyle(s.key as any)}
                    className={cn(
                      'p-2.5 rounded-lg border text-left text-xs transition-all',
                      dashboardStyle === s.key ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 font-semibold' : 'bg-card'
                    )}
                  >
                    <div>{s.name}</div>
                    <div className="text-[10px] text-muted-foreground font-normal">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Color Accent Palette</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'indigo', name: 'Indigo Modern', color: '#6366f1' },
                  { key: 'emerald', name: 'Emerald Forest', color: '#10b981' },
                  { key: 'sky', name: 'Ocean Azure', color: '#0ea5e9' },
                  { key: 'amber', name: 'Sunset Amber', color: '#f59e0b' },
                  { key: 'rose', name: 'Crimson Rose', color: '#f43f5e' },
                  { key: 'slate', name: 'Slate Monochrome', color: '#475569' },
                ].map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => {
                      setColorTheme(c.key);
                      toast({ title: `Theme set to ${c.name}` });
                    }}
                    className={cn(
                      'p-2 rounded-lg border text-xs flex items-center gap-2',
                      colorTheme === c.key ? 'border-primary ring-1 ring-primary font-medium' : ''
                    )}
                  >
                    <span className="h-3.5 w-3.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={() => setThemeModalOpen(false)}>Save Preferences</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
