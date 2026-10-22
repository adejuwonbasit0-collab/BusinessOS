'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { portalsApi } from '@/lib/phase3Api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Globe, Plus, ExternalLink, Sparkles, Eye, Settings, Check,
  Search, Palette, Layers, ArrowRight, Laptop, Tablet, Smartphone, Copy,
  ArrowUp, ArrowDown, Trash2, Edit3, CheckCircle2, Sliders, Layout,
  GraduationCap, Hotel, HeartPulse, Scissors, UtensilsCrossed, Plane,
  Briefcase, ShoppingCart, Building2, HelpCircle
} from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { useAuthStore } from '@/store/authStore';
import { TEMPLATES_DATA, WebsiteTemplate } from '@/lib/templatesData';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface CmsBlock {
  id: string;
  type: 'hero' | 'about' | 'services' | 'booking' | 'team' | 'testimonials' | 'faq' | 'careers' | 'contact';
  title: string;
  subtitle: string;
  content?: string;
  ctaText?: string;
  items?: Array<{ name: string; desc: string; price?: string }>;
  enabled: boolean;
}

export default function WebsitePage() {
  const qc = useQueryClient();
  const router = useRouter();
  const { tenant } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'my_sites' | 'templates'>('my_sites');
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // ── 1. Smart Question-Driven Website Setup Wizard State ─────────────────────
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardAnswers, setWizardAnswers] = useState({
    siteType: 'education', // 'education', 'hospitality', 'healthcare', 'personal_care', 'food_beverage', 'professional', 'retail', 'corporate'
    primaryGoal: 'bookings', // 'bookings', 'leads', 'showcase', 'ecommerce', 'info'
    includedSections: ['hero', 'about', 'services', 'booking', 'testimonials', 'contact'],
    themeStyle: 'modern', // 'modern', 'luxury', 'academic', 'medical', 'creative', 'dark'
    siteName: `${tenant?.name || 'My Business'} Official Site`,
    linkAsPublic: true,
    customDomain: '',
  });

  // ── 2. Visual CMS Block Builder State ───────────────────────────────────────
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderSite, setBuilderSite] = useState<any | null>(null);
  const [builderDevice, setBuilderDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [cmsBlocks, setCmsBlocks] = useState<CmsBlock[]>([
    {
      id: 'blk-1',
      type: 'hero',
      title: 'Excellence in Education & Future Leadership',
      subtitle: 'Inspiring young minds through world-class academic curriculum, robotics labs, and athletic programs.',
      ctaText: 'Apply for Term Admission',
      enabled: true,
    },
    {
      id: 'blk-2',
      type: 'services',
      title: 'Our Academic Programs & Curriculum',
      subtitle: 'Structured learning environments from Kindergarten to Pre-University.',
      items: [
        { name: 'STEM & Robotics Academy', desc: 'Hands-on coding, 3D printing, and physics experimentation.' },
        { name: 'AP & Honours Curriculum', desc: 'College board certified advanced placement courses.' },
        { name: 'Visual & Performing Arts', desc: 'Fine arts, orchestra, theatre, and musical composition.' },
      ],
      enabled: true,
    },
    {
      id: 'blk-3',
      type: 'booking',
      title: 'Schedule a Guided Campus Tour',
      subtitle: 'Book an interactive walkthrough of our classrooms, science labs, and sports arenas.',
      ctaText: 'Reserve Your Visit Slot',
      enabled: true,
    },
    {
      id: 'blk-4',
      type: 'team',
      title: 'Meet Our Faculty & Leadership',
      subtitle: 'Experienced educators dedicated to student mentorship.',
      items: [
        { name: 'Dr. Arthur Evans', desc: 'Principal & Head of Sciences' },
        { name: 'Prof. Clara Vance', desc: 'Director of Humanities & Arts' },
        { name: 'Coach Marcus Bell', desc: 'Athletics & Physical Wellness' },
      ],
      enabled: true,
    },
    {
      id: 'blk-5',
      type: 'contact',
      title: 'Contact Admissions Office',
      subtitle: 'Reach out to our counselors or visit our administrative reception.',
      ctaText: 'Send Inquiry Message',
      enabled: true,
    },
  ]);

  // Selected template for full preview
  const [previewTemplate, setPreviewTemplate] = useState<WebsiteTemplate | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Websites List Query
  const { data, isLoading } = useQuery({
    queryKey: ['websites'],
    queryFn: () => api.get('/portals?type=website') as Promise<any>,
  });

  const websites = (data as any)?.data?.portals || [
    {
      id: 'site-default',
      name: `${tenant?.name || 'My Business'} Official Portal`,
      type: 'website',
      description: 'Official public web presence with services, bookings, and contact inquiries.',
      is_published: true,
      custom_domain: tenant?.customDomain || null,
      updated_at: '2026-10-22T21:00:00Z',
    },
  ];

  // ── Finish Setup Wizard & Generate Website ──────────────────────────────────
  const handleCompleteWizard = () => {
    // Generate tailored blocks based on answers
    let defaultTitle = 'Welcome to Our Official Platform';
    let defaultSub = 'Browse our services, schedule appointments, and connect with our team.';
    let ctaLabel = 'Get in Touch';

    if (wizardAnswers.siteType === 'education') {
      defaultTitle = 'Empowering Academic Minds for Tomorrow';
      defaultSub = 'World-class curriculum, state-of-the-art facilities, and dedicated educators.';
      ctaLabel = 'Apply for Admission';
    } else if (wizardAnswers.siteType === 'hospitality') {
      defaultTitle = 'Experience Luxury, Tranquility & Fine Hospitality';
      defaultSub = 'Bespoke suites, ocean-view dining, and tailored concierge treatments.';
      ctaLabel = 'Book Your Suite';
    } else if (wizardAnswers.siteType === 'healthcare') {
      defaultTitle = 'Compassionate, Patient-Centered Clinical Care';
      defaultSub = 'Board-certified physicians, modern diagnostic labs, and 24/7 emergency readiness.';
      ctaLabel = 'Schedule Doctor Appointment';
    } else if (wizardAnswers.siteType === 'personal_care') {
      defaultTitle = 'Precision Grooming, Styling & Luxury Wellness';
      defaultSub = 'Master barbers, bespoke haircutting, hot towel shaves, and beard sculpting.';
      ctaLabel = 'Book Chair Appointment';
    } else if (wizardAnswers.siteType === 'retail') {
      defaultTitle = 'Curated Lifestyle, Tech & Premium Goods';
      defaultSub = 'Browse our latest arrivals with fast doorstep dispatch and WhatsApp checkout.';
      ctaLabel = 'Shop Collection';
    }

    const generatedBlocks: CmsBlock[] = [
      {
        id: `blk-${Date.now()}-1`,
        type: 'hero',
        title: defaultTitle,
        subtitle: defaultSub,
        ctaText: ctaLabel,
        enabled: true,
      },
      {
        id: `blk-${Date.now()}-2`,
        type: 'services',
        title: 'Featured Offerings & Services',
        subtitle: 'Tailored solutions designed around your needs.',
        items: [
          { name: 'Standard Service Package', desc: 'Comprehensive core offering with complete guidance.' },
          { name: 'Premium Full-Service Suite', desc: 'Priority consultation, dedicated manager, and expedited delivery.' },
          { name: 'Custom Enterprise Plan', desc: 'Bespoke integration customized to your exact requirements.' },
        ],
        enabled: wizardAnswers.includedSections.includes('services'),
      },
      {
        id: `blk-${Date.now()}-3`,
        type: 'booking',
        title: 'Online Reservations & Appointments',
        subtitle: 'Pick a convenient date and reserve your spot directly.',
        ctaText: 'Reserve Slot Now',
        enabled: wizardAnswers.includedSections.includes('booking'),
      },
      {
        id: `blk-${Date.now()}-4`,
        type: 'contact',
        title: 'Get in Touch with Our Team',
        subtitle: 'We reply to inquiries within 1 business hour.',
        ctaText: 'Submit Inquiry',
        enabled: wizardAnswers.includedSections.includes('contact'),
      },
    ];

    setCmsBlocks(generatedBlocks);
    setWizardOpen(false);
    setWizardStep(1);

    toast({
      title: 'Website generated successfully!',
      description: wizardAnswers.linkAsPublic
        ? `Linked as your public site at ${tenant?.subdomain || 'tenant'}.localhost:3002`
        : 'Saved as draft website. You can edit blocks before publishing.',
    });
  };

  // Block Manipulation in Visual CMS
  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= cmsBlocks.length) return;
    const updated = [...cmsBlocks];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setCmsBlocks(updated);
  };

  const deleteBlock = (id: string) => {
    setCmsBlocks(cmsBlocks.filter((b) => b.id !== id));
  };

  const addBlock = (type: CmsBlock['type']) => {
    const newBlock: CmsBlock = {
      id: `blk-${Date.now()}`,
      type,
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Section`,
      subtitle: 'Add a helpful description or headline for this block.',
      enabled: true,
    };
    setCmsBlocks([...cmsBlocks, newBlock]);
    toast({ title: `Added ${newBlock.title} to page!` });
  };

  // Filter templates
  const filteredTemplates = TEMPLATES_DATA.filter((t) => {
    const matchesCat = templateCategoryFilter === 'all' || t.category === templateCategoryFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      t.name.toLowerCase().includes(q) ||
      t.categoryName.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6 text-indigo-600" />
            Website & Visual CMS Builder
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Design, build, and publish custom public websites, landing pages, and customer portals
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/site/${tenant?.subdomain || 'demo'}`, '_blank')}
            className="text-xs gap-1.5"
          >
            <ExternalLink className="h-3.5 w-3.5" /> View Live Public Page
          </Button>

          <Button
            size="sm"
            className="bg-indigo-600 text-white hover:bg-indigo-700 text-xs gap-1.5"
            onClick={() => setWizardOpen(true)}
          >
            <Sparkles className="h-3.5 w-3.5" /> Launch Website Setup Wizard
          </Button>
        </div>
      </div>

      {/* ── Main Tabs: My Sites vs 106+ Templates ─────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-6">
        <TabsList className="bg-muted p-1">
          <TabsTrigger value="my_sites" className="text-xs">My Published Websites</TabsTrigger>
          <TabsTrigger value="templates" className="text-xs">
            106+ Industry Templates Catalog
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: My Sites ─────────────────────────────────────────────────── */}
        <TabsContent value="my_sites" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {websites.map((site: any) => (
              <Card key={site.id} className="overflow-hidden hover:border-indigo-400 transition-all">
                <div className="p-5 bg-gradient-to-br from-indigo-900 to-slate-900 text-white relative flex flex-col justify-between min-h-[140px]">
                  <div className="flex justify-between items-start">
                    <Badge className="bg-indigo-500/80 text-white text-[10px] border-0">
                      {site.is_published ? 'Published & Active' : 'Draft'}
                    </Badge>
                    <Globe className="h-4 w-4 opacity-75" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base leading-snug">{site.name}</h3>
                    <p className="text-xs text-white/70 font-mono mt-1">
                      {tenant?.subdomain ? `${tenant.subdomain}.localhost:3002` : 'Primary Domain'}
                    </p>
                  </div>
                </div>

                <CardContent className="p-4 space-y-3">
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {site.description || 'Full interactive public portal with services, booking, and WhatsApp orders.'}
                  </p>

                  <div className="pt-2 border-t flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-xs font-semibold text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                      onClick={() => {
                        setBuilderSite(site);
                        setBuilderOpen(true);
                      }}
                    >
                      <Layout className="h-3.5 w-3.5 mr-1" /> Visual CMS Editor
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => window.open(`/site/${tenant?.subdomain || 'demo'}`, '_blank')}
                      title="Open Live Public Page"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Tab 2: 106+ Templates Catalog ───────────────────────────────────── */}
        <TabsContent value="templates" className="space-y-6">
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Search 106+ templates by industry, name, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 text-xs"
              />
            </div>
            <Select value={templateCategoryFilter} onValueChange={setTemplateCategoryFilter}>
              <SelectTrigger className="h-10 w-[200px] text-xs">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                <SelectItem value="hospitality">Hotels & Resorts</SelectItem>
                <SelectItem value="education">Schools & Universities</SelectItem>
                <SelectItem value="healthcare">Hospitals & Clinics</SelectItem>
                <SelectItem value="personal_care">Barbers & Salons</SelectItem>
                <SelectItem value="food_beverage">Restaurants & Dining</SelectItem>
                <SelectItem value="aviation">Airports & Aviation</SelectItem>
                <SelectItem value="professional">Freelancers & Law</SelectItem>
                <SelectItem value="retail">E-Commerce & Retail</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((tmpl) => (
              <Card key={tmpl.id} className="overflow-hidden hover:border-indigo-400 transition-all flex flex-col">
                <div className={`p-6 bg-gradient-to-br ${tmpl.theme.heroGradient} text-white min-h-[150px] flex flex-col justify-between`}>
                  <Badge className="bg-white/20 text-white text-[10px] w-fit border-0">{tmpl.categoryName}</Badge>
                  <div>
                    <h4 className="font-bold text-sm leading-tight">{tmpl.hero.title}</h4>
                    <p className="text-[11px] text-white/80 line-clamp-1 mt-1">{tmpl.hero.subtitle}</p>
                  </div>
                </div>

                <CardContent className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-xs">{tmpl.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tmpl.description}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-xs"
                      onClick={() => setPreviewTemplate(tmpl)}
                    >
                      <Eye className="h-3 w-3 mr-1" /> Preview
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-xs bg-indigo-600 text-white hover:bg-indigo-700"
                      onClick={() => {
                        toast({ title: `Applied "${tmpl.name}" to your workspace!` });
                        setActiveTab('my_sites');
                      }}
                    >
                      Apply Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── MODAL 1: Smart Question-Driven Website Setup Wizard ───────────────── */}
      {wizardOpen && (
        <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-600" />
                Website Creation Wizard (Step {wizardStep} of 5)
              </DialogTitle>
              <DialogDescription>
                Answer a few quick questions to generate a tailored website for your business.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              {/* Question 1: What type of website? */}
              {wizardStep === 1 && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">1. What kind of website do you want to create?</Label>
                  <p className="text-xs text-muted-foreground">Select your industry so we can generate appropriate sections and copy.</p>
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    {[
                      { key: 'education', label: 'School / Academic Portal', icon: GraduationCap },
                      { key: 'hospitality', label: 'Hotel & Resort Lodging', icon: Hotel },
                      { key: 'healthcare', label: 'Medical Clinic / Hospital', icon: HeartPulse },
                      { key: 'personal_care', label: 'Barbershop & Hair Salon', icon: Scissors },
                      { key: 'food_beverage', label: 'Restaurant & Dining Menu', icon: UtensilsCrossed },
                      { key: 'professional', label: 'Freelancer / Law Firm Folio', icon: Briefcase },
                      { key: 'retail', label: 'Online Store & E-Commerce', icon: ShoppingCart },
                      { key: 'corporate', label: 'Corporate Company Showcase', icon: Building2 },
                    ].map((opt) => {
                      const Icon = opt.icon;
                      const isSel = wizardAnswers.siteType === opt.key;
                      return (
                        <div
                          key={opt.key}
                          onClick={() => setWizardAnswers((p) => ({ ...p, siteType: opt.key }))}
                          className={cn(
                            'p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all',
                            isSel ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 font-semibold' : 'hover:bg-muted'
                          )}
                        >
                          <Icon className="h-4 w-4 text-indigo-600 shrink-0" />
                          <span className="text-xs">{opt.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Question 2: What is your primary objective? */}
              {wizardStep === 2 && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">2. What is the primary goal of your website?</Label>
                  <div className="space-y-2 pt-1">
                    {[
                      { key: 'bookings', title: 'Accept Bookings & Appointments Online', desc: 'Allows customers to pick dates, times, and reserve staff chairs or suites.' },
                      { key: 'leads', title: 'Capture Client Inquiries & Leads', desc: 'Contact forms that deposit messages directly into your CRM inbox.' },
                      { key: 'info', title: 'Publish Information, Syllabus & Programs', desc: 'Display course catalogs, faculty lists, or corporate capabilities.' },
                      { key: 'ecommerce', title: 'Sell Products with Cart & WhatsApp Orders', desc: 'Accept online payments or receive formatted order chats on WhatsApp.' },
                      { key: 'showcase', title: 'Showcase Brand Portfolio & Case Studies', desc: 'Display past client deliverables, before/after results, and reviews.' },
                    ].map((g) => (
                      <div
                        key={g.key}
                        onClick={() => setWizardAnswers((p) => ({ ...p, primaryGoal: g.key }))}
                        className={cn(
                          'p-3 rounded-xl border cursor-pointer transition-all',
                          wizardAnswers.primaryGoal === g.key ? 'border-indigo-600 bg-indigo-50/60 font-semibold' : 'hover:bg-muted'
                        )}
                      >
                        <h4 className="text-xs text-foreground">{g.title}</h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{g.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Question 3: Which pages/sections do you want? */}
              {wizardStep === 3 && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">3. Which sections should be included?</Label>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    {[
                      { key: 'hero', label: 'Hero Banner with CTA' },
                      { key: 'about', label: 'About Us & Company Story' },
                      { key: 'services', label: 'Services & Programs Grid' },
                      { key: 'booking', label: 'Interactive Booking Widget' },
                      { key: 'team', label: 'Team / Faculty Showcase' },
                      { key: 'testimonials', label: 'Client Reviews & Ratings' },
                      { key: 'faq', label: 'FAQ Accordion' },
                      { key: 'contact', label: 'Contact Form & Office Map' },
                    ].map((sec) => {
                      const isChecked = wizardAnswers.includedSections.includes(sec.key);
                      return (
                        <div
                          key={sec.key}
                          onClick={() => {
                            const next = isChecked
                              ? wizardAnswers.includedSections.filter((s) => s !== sec.key)
                              : [...wizardAnswers.includedSections, sec.key];
                            setWizardAnswers((p) => ({ ...p, includedSections: next }));
                          }}
                          className={cn(
                            'p-2.5 rounded-lg border flex items-center justify-between cursor-pointer',
                            isChecked ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold' : 'text-muted-foreground'
                          )}
                        >
                          <span>{sec.label}</span>
                          {isChecked && <Check className="h-3.5 w-3.5 text-indigo-600" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Question 4: Theme Style & Visual Atmosphere */}
              {wizardStep === 4 && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">4. Choose a visual style and color tone:</Label>
                  <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs">
                    {[
                      { key: 'modern', title: 'Clean Modern', desc: 'Crisp slate and royal indigo accents' },
                      { key: 'luxury', title: 'Warm Luxury', desc: 'Champagne gold, charcoal, and marble' },
                      { key: 'academic', title: 'Collegiate Navy', desc: 'Traditional trust, deep blue, and gold' },
                      { key: 'medical', title: 'Clinical Fresh', desc: 'Emerald green, sky cyan, and clean white' },
                      { key: 'creative', title: 'Vibrant Creative', desc: 'Bold gradient purples, coral, and neon' },
                      { key: 'dark', title: 'Obsidian Dark', desc: 'Sleek dark mode with high contrast' },
                    ].map((th) => (
                      <div
                        key={th.key}
                        onClick={() => setWizardAnswers((p) => ({ ...p, themeStyle: th.key }))}
                        className={cn(
                          'p-3 rounded-xl border cursor-pointer',
                          wizardAnswers.themeStyle === th.key ? 'border-indigo-600 bg-indigo-50 font-semibold' : 'hover:bg-muted'
                        )}
                      >
                        <h4 className="text-xs">{th.title}</h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{th.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Question 5: Publishing & Domain Settings */}
              {wizardStep === 5 && (
                <div className="space-y-4">
                  <Label className="text-sm font-semibold">5. Public Website & Domain Linkage</Label>
                  <div className="space-y-3 pt-1 text-xs">
                    <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-indigo-950">Link as Official Public Page</span>
                        <input
                          type="checkbox"
                          checked={wizardAnswers.linkAsPublic}
                          onChange={(e) => setWizardAnswers((p) => ({ ...p, linkAsPublic: e.target.checked }))}
                          className="h-4 w-4 text-indigo-600 rounded"
                        />
                      </div>
                      <p className="text-[11px] text-indigo-700/80">
                        When enabled, visitors visiting <code className="bg-white px-1 py-0.5 rounded font-mono">{tenant?.subdomain || 'tenant'}.localhost:3002</code> will see this website.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Custom Domain (Optional)</Label>
                      <Input
                        placeholder="www.mycustomdomain.com"
                        value={wizardAnswers.customDomain}
                        onChange={(e) => setWizardAnswers((p) => ({ ...p, customDomain: e.target.value }))}
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Wizard Navigation Footer */}
            <div className="flex justify-between items-center pt-3 border-t">
              <Button
                variant="ghost"
                size="sm"
                disabled={wizardStep === 1}
                onClick={() => setWizardStep((p) => p - 1)}
              >
                Back
              </Button>

              {wizardStep < 5 ? (
                <Button size="sm" className="bg-indigo-600 text-white" onClick={() => setWizardStep((p) => p + 1)}>
                  Next Step <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              ) : (
                <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={handleCompleteWizard}>
                  <CheckCircle2 className="h-4 w-4 mr-1.5" /> Generate & Launch Website
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── MODAL 2: Full WordPress-Style Visual CMS Block Builder ─────────────── */}
      {builderOpen && (
        <Dialog open={builderOpen} onOpenChange={setBuilderOpen}>
          <DialogContent className="max-w-6xl max-h-[94vh] overflow-hidden flex flex-col p-0">
            {/* CMS Builder Topbar */}
            <div className="px-6 py-3.5 border-b bg-card flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm">Visual CMS Block Builder</span>
                <Badge variant="outline" className="text-[10px]">{cmsBlocks.length} Blocks on Page</Badge>
              </div>

              {/* Viewport Device Controls */}
              <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                <Button
                  size="sm"
                  variant={builderDevice === 'desktop' ? 'secondary' : 'ghost'}
                  className="h-7 px-2 text-xs"
                  onClick={() => setBuilderDevice('desktop')}
                >
                  <Laptop className="h-3.5 w-3.5 mr-1" /> Desktop
                </Button>
                <Button
                  size="sm"
                  variant={builderDevice === 'tablet' ? 'secondary' : 'ghost'}
                  className="h-7 px-2 text-xs"
                  onClick={() => setBuilderDevice('tablet')}
                >
                  <Tablet className="h-3.5 w-3.5 mr-1" /> Tablet
                </Button>
                <Button
                  size="sm"
                  variant={builderDevice === 'mobile' ? 'secondary' : 'ghost'}
                  className="h-7 px-2 text-xs"
                  onClick={() => setBuilderDevice('mobile')}
                >
                  <Smartphone className="h-3.5 w-3.5 mr-1" /> Mobile
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8"
                  onClick={() => window.open(`/site/${tenant?.subdomain || 'demo'}`, '_blank')}
                >
                  <Eye className="h-3.5 w-3.5 mr-1" /> Live Preview
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs h-8"
                  onClick={() => {
                    toast({ title: 'Page blocks saved and published live!' });
                    setBuilderOpen(false);
                  }}
                >
                  Save & Publish Page
                </Button>
              </div>
            </div>

            {/* CMS Builder Workspace: Palette + Canvas */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Sidebar: Block Palette */}
              <div className="w-64 border-r bg-muted/20 p-4 space-y-4 overflow-y-auto shrink-0">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Add New Block</h4>
                <div className="space-y-1.5">
                  {[
                    { type: 'hero', label: 'Hero Header Banner', icon: Layout },
                    { type: 'services', label: 'Services & Programs Grid', icon: Layers },
                    { type: 'booking', label: 'Online Booking Slot', icon: Sliders },
                    { type: 'team', label: 'Team & Staff Roster', icon: Building2 },
                    { type: 'testimonials', label: 'Client Testimonial Quote', icon: Sparkles },
                    { type: 'contact', label: 'Contact Form & Map', icon: Globe },
                  ].map((blk) => {
                    const Icon = blk.icon;
                    return (
                      <button
                        key={blk.type}
                        onClick={() => addBlock(blk.type as any)}
                        className="w-full p-2.5 rounded-lg border bg-card text-left text-xs font-medium hover:border-indigo-500 hover:bg-indigo-50/40 flex items-center gap-2 transition-all"
                      >
                        <Icon className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                        <span className="truncate">{blk.label}</span>
                        <Plus className="h-3 w-3 ml-auto text-muted-foreground" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Main Visual Canvas */}
              <div className="flex-1 bg-slate-900/5 p-6 overflow-y-auto flex justify-center">
                <div
                  className={cn(
                    'bg-card rounded-xl shadow-xl border overflow-hidden transition-all duration-300 flex flex-col',
                    builderDevice === 'desktop' && 'w-full max-w-4xl',
                    builderDevice === 'tablet' && 'w-[680px]',
                    builderDevice === 'mobile' && 'w-[375px]'
                  )}
                >
                  {/* Canvas Blocks */}
                  <div className="divide-y divide-border">
                    {cmsBlocks.map((block, index) => (
                      <div key={block.id} className="p-6 relative group hover:bg-muted/10 transition-colors">
                        {/* Block Reorder & Action Bar */}
                        <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-card/95 border rounded-lg p-1 shadow-sm">
                          <button
                            onClick={() => moveBlock(index, 'up')}
                            disabled={index === 0}
                            className="p-1 hover:bg-muted rounded text-muted-foreground disabled:opacity-30"
                            title="Move Block Up"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => moveBlock(index, 'down')}
                            disabled={index === cmsBlocks.length - 1}
                            className="p-1 hover:bg-muted rounded text-muted-foreground disabled:opacity-30"
                            title="Move Block Down"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deleteBlock(block.id)}
                            className="p-1 hover:bg-destructive/10 rounded text-destructive"
                            title="Delete Block"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Block Content Render */}
                        {block.type === 'hero' ? (
                          <div className="p-8 rounded-xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white space-y-3">
                            <Input
                              value={block.title}
                              onChange={(e) => {
                                const updated = [...cmsBlocks];
                                updated[index].title = e.target.value;
                                setCmsBlocks(updated);
                              }}
                              className="text-xl font-bold bg-transparent border-dashed border-white/30 text-white h-auto p-1"
                            />
                            <Textarea
                              rows={2}
                              value={block.subtitle}
                              onChange={(e) => {
                                const updated = [...cmsBlocks];
                                updated[index].subtitle = e.target.value;
                                setCmsBlocks(updated);
                              }}
                              className="text-xs bg-transparent border-dashed border-white/30 text-white/90 p-1"
                            />
                            <button className="px-4 py-2 rounded-lg bg-indigo-500 text-white font-semibold text-xs shadow-md">
                              {block.ctaText || 'Get Started'}
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] uppercase font-mono">{block.type}</Badge>
                              <Input
                                value={block.title}
                                onChange={(e) => {
                                  const updated = [...cmsBlocks];
                                  updated[index].title = e.target.value;
                                  setCmsBlocks(updated);
                                }}
                                className="font-bold text-sm h-8"
                              />
                            </div>
                            <Input
                              value={block.subtitle}
                              onChange={(e) => {
                                const updated = [...cmsBlocks];
                                updated[index].subtitle = e.target.value;
                                setCmsBlocks(updated);
                              }}
                              className="text-xs text-muted-foreground h-7"
                            />

                            {block.items && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                                {block.items.map((item, i) => (
                                  <div key={i} className="p-3 rounded-lg border bg-muted/20 text-xs">
                                    <p className="font-semibold text-foreground">{item.name}</p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── MODAL 3: High-Fidelity Realistic Template Preview ─────────────────── */}
      {previewTemplate && (
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col p-0">
            <div className="flex items-center justify-between px-6 py-3.5 border-b bg-muted/40 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold">{previewTemplate.name}</span>
                <Badge variant="outline" className="text-[10px]">{previewTemplate.categoryName}</Badge>
              </div>

              {/* Viewport Toggles */}
              <div className="flex items-center gap-1 bg-background border rounded-lg p-0.5">
                <Button
                  size="sm"
                  variant={previewDevice === 'desktop' ? 'secondary' : 'ghost'}
                  className="h-7 px-2"
                  onClick={() => setPreviewDevice('desktop')}
                >
                  <Laptop className="h-3.5 w-3.5 mr-1" /> Desktop
                </Button>
                <Button
                  size="sm"
                  variant={previewDevice === 'tablet' ? 'secondary' : 'ghost'}
                  className="h-7 px-2"
                  onClick={() => setPreviewDevice('tablet')}
                >
                  <Tablet className="h-3.5 w-3.5 mr-1" /> Tablet
                </Button>
                <Button
                  size="sm"
                  variant={previewDevice === 'mobile' ? 'secondary' : 'ghost'}
                  className="h-7 px-2"
                  onClick={() => setPreviewDevice('mobile')}
                >
                  <Smartphone className="h-3.5 w-3.5 mr-1" /> Mobile
                </Button>
              </div>

              <Button
                size="sm"
                className="bg-indigo-600 text-white text-xs h-8"
                onClick={() => {
                  toast({ title: `Applied "${previewTemplate.name}" to your workspace!` });
                  setPreviewTemplate(null);
                  setActiveTab('my_sites');
                }}
              >
                Apply This Template
              </Button>
            </div>

            {/* Simulated Live Viewport Canvas */}
            <div className="flex-1 overflow-y-auto bg-slate-900/10 p-6 flex justify-center">
              <div
                className={cn(
                  'bg-background rounded-xl shadow-2xl overflow-hidden transition-all duration-300 border flex flex-col',
                  previewDevice === 'desktop' && 'w-full max-w-4xl',
                  previewDevice === 'tablet' && 'w-[680px]',
                  previewDevice === 'mobile' && 'w-[375px]'
                )}
              >
                {/* 1. Website Navbar */}
                <div className="px-6 py-3.5 border-b flex items-center justify-between bg-card shrink-0">
                  <div className="font-bold text-sm text-foreground flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">★</span>
                    <span>{previewTemplate.name.split(' ')[0]}</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-4 text-xs font-medium text-muted-foreground">
                    <span>Home</span>
                    <span>Services</span>
                    <span>About</span>
                    <span>Contact</span>
                  </div>
                  <button className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold">
                    {previewTemplate.hero.ctaPrimary.label}
                  </button>
                </div>

                {/* 2. Hero Section */}
                <div className={`p-10 bg-gradient-to-br ${previewTemplate.theme.heroGradient} text-white`}>
                  <Badge className="bg-white/20 text-white text-xs border-0 mb-3">{previewTemplate.hero.badge}</Badge>
                  <h1 className="text-3xl font-black leading-tight max-w-2xl">{previewTemplate.hero.title}</h1>
                  <p className="mt-3 text-sm text-white/90 leading-relaxed max-w-xl">{previewTemplate.hero.subtitle}</p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button className="px-5 py-2.5 rounded-lg bg-white text-slate-900 font-bold text-xs shadow-md">
                      {previewTemplate.hero.ctaPrimary.label}
                    </button>
                    <button className="px-5 py-2.5 rounded-lg border border-white/40 text-white font-medium text-xs backdrop-blur-xs">
                      {previewTemplate.hero.ctaSecondary.label}
                    </button>
                  </div>
                </div>

                {/* 3. Industry-Specific Sections */}
                <div className="p-8 space-y-10">
                  {previewTemplate.sections.map((section, idx) => (
                    <div key={idx} className="space-y-4">
                      <div>
                        <h3 className="text-lg font-bold text-foreground">{section.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{section.subtitle}</p>
                      </div>

                      {section.items && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {section.items.map((item: any, i: number) => (
                            <div key={i} className="p-4 rounded-xl border bg-card hover:border-indigo-300 transition-colors">
                              <h4 className="font-semibold text-xs text-foreground">{item.name || item.title}</h4>
                              {item.price && (
                                <p className="text-sm font-bold text-indigo-600 font-mono mt-1">{item.price}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{item.desc}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* 4. Customer Trust Call to Action */}
                  <div className="p-8 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900 text-center space-y-3">
                    <h3 className="text-xl font-bold text-foreground">Ready to get started with us?</h3>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                      Join hundreds of satisfied clients today. Book your service or contact our support team.
                    </p>
                    <button className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-md">
                      {previewTemplate.hero.ctaPrimary.label}
                    </button>
                  </div>
                </div>

                {/* 5. Footer */}
                <div className="p-6 border-t bg-muted/40 text-center text-xs text-muted-foreground">
                  <p>© 2026 {previewTemplate.name}. Powered by NexOS Universal Business OS.</p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
