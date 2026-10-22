'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Search, Eye, ArrowRight, Laptop, Tablet, Smartphone, Sparkles,
  Hotel, GraduationCap, HeartPulse, Scissors, UtensilsCrossed, Plane,
  Briefcase, ShoppingCart, Building2, CheckCircle2, ChevronRight, Star
} from 'lucide-react';
import { TEMPLATES_DATA, WebsiteTemplate } from '@/lib/templatesData';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { key: 'all', name: 'All Templates', icon: Sparkles },
  { key: 'hospitality', name: 'Hotels & Lodging', icon: Hotel },
  { key: 'education', name: 'Schools & Universities', icon: GraduationCap },
  { key: 'healthcare', name: 'Hospitals & Clinics', icon: HeartPulse },
  { key: 'personal_care', name: 'Barbers & Salons', icon: Scissors },
  { key: 'food_beverage', name: 'Restaurants & Dining', icon: UtensilsCrossed },
  { key: 'aviation', name: 'Airports & Aviation', icon: Plane },
  { key: 'professional', name: 'Freelancers & Law', icon: Briefcase },
  { key: 'retail', name: 'E-Commerce & Retail', icon: ShoppingCart },
  { key: 'construction', name: 'Builders & Trades', icon: Building2 },
];

export default function PublicTemplatesPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<WebsiteTemplate | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const filtered = useMemo(() => {
    return TEMPLATES_DATA.filter((t) => {
      const matchCat = selectedCategory === 'all' || t.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        t.name.toLowerCase().includes(q) ||
        t.categoryName.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  const handleUseTemplate = (template: WebsiteTemplate) => {
    // Map template category to registration niche
    const nicheParam =
      template.category === 'education' ? 'school' :
      template.category === 'hospitality' ? 'hotel' :
      template.category === 'healthcare' ? 'hospital' :
      template.category === 'personal_care' ? 'beauty_salon' :
      template.category === 'food_beverage' ? 'restaurant' :
      template.category === 'aviation' ? 'airport' :
      template.category === 'retail' ? 'ecommerce' :
      template.category === 'professional' ? 'professional_services' :
      template.category === 'construction' ? 'construction' : 'general';

    router.push(`/register?niche=${nicheParam}&template=${template.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ── Public Navigation Header ─────────────────────────────────────────── */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="font-bold text-xl tracking-tight flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-sm">N</span>
              <span>Nex<span className="text-indigo-600">OS</span></span>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link href="/templates" className="text-indigo-600 font-semibold">100+ Templates</Link>
              <Link href="/#solutions" className="text-muted-foreground hover:text-foreground">Solutions by Niche</Link>
              <Link href="/pricing" className="text-muted-foreground hover:text-foreground">Pricing Plans</Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push('/login')}>Sign In</Button>
            <Button size="sm" className="bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => router.push('/register')}>
              Create Free Workspace
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero Banner ──────────────────────────────────────────────────────── */}
      <section className="py-16 px-6 max-w-7xl mx-auto text-center border-b">
        <Badge className="bg-indigo-50 border-indigo-200 text-indigo-700 px-3 py-1 mb-4">
          <Sparkles className="h-3.5 w-3.5 mr-1" /> 106+ Production Landing Page & Website Templates
        </Badge>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground max-w-3xl mx-auto">
          Choose a Template Tuned for Your Industry. Launch in 60 Seconds.
        </h1>
        <p className="mt-4 text-base text-muted-foreground max-w-2xl mx-auto">
          Every template comes with built-in online bookings, service catalogs, appointment calendars, applicant job boards, and automated WhatsApp checkout.
        </p>

        {/* Search Bar */}
        <div className="max-w-md mx-auto mt-8 relative">
          <Search className="h-4 w-4 absolute left-3.5 top-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates (e.g. 'hotel', 'high school', 'clinic', 'barber')..."
            className="pl-10 h-11 text-sm bg-card shadow-xs"
          />
        </div>
      </section>

      {/* ── Category Filter Pills ───────────────────────────────────────────── */}
      <div className="border-b bg-muted/20 sticky top-16 z-20 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-2 overflow-x-auto scrollbar-none">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all',
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-card border text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Template Cards Grid ──────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Showing {filtered.length} Industry Templates
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((tmpl) => (
            <Card key={tmpl.id} className="overflow-hidden group hover:border-indigo-400 hover:shadow-lg transition-all duration-300 flex flex-col">
              {/* Template Card Mockup Preview Header */}
              <div className={`p-6 bg-gradient-to-br ${tmpl.theme.heroGradient} text-white relative min-h-[170px] flex flex-col justify-between`}>
                <div className="flex items-center justify-between">
                  <Badge className="bg-white/20 backdrop-blur text-white text-[10px] border-0">
                    {tmpl.categoryName}
                  </Badge>
                  <span className="text-xs font-mono opacity-80 uppercase tracking-widest">{tmpl.style}</span>
                </div>

                <div>
                  <h3 className="font-bold text-base leading-snug drop-shadow-xs">{tmpl.hero.title}</h3>
                  <p className="text-xs text-white/80 line-clamp-1 mt-1 drop-shadow-xs">{tmpl.hero.subtitle}</p>
                </div>
              </div>

              {/* Card Body */}
              <CardContent className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-sm text-foreground">{tmpl.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    {tmpl.description}
                  </p>

                  {/* Section Features Badges */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {tmpl.sections.slice(0, 3).map((sec, i) => (
                      <span key={i} className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded text-muted-foreground">
                        {sec.title}
                      </span>
                    ))}
                    {tmpl.sections.length > 3 && (
                      <span className="text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                        +{tmpl.sections.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 pt-4 border-t flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-9 text-xs"
                    onClick={() => setPreviewTemplate(tmpl)}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1 text-muted-foreground" /> Full Preview
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-9 text-xs bg-indigo-600 text-white hover:bg-indigo-700"
                    onClick={() => handleUseTemplate(tmpl)}
                  >
                    Use Template <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      {/* ── Modal: High-Fidelity Realistic Template Preview ─────────────────── */}
      {previewTemplate && (
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col p-0">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-3.5 border-b bg-muted/40">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-foreground">{previewTemplate.name}</span>
                <Badge variant="outline" className="text-[10px]">{previewTemplate.categoryName}</Badge>
              </div>

              {/* Viewport Device Controls */}
              <div className="flex items-center gap-1 bg-background border rounded-lg p-0.5">
                <Button
                  size="sm"
                  variant={previewDevice === 'desktop' ? 'secondary' : 'ghost'}
                  className="h-7 px-2.5"
                  onClick={() => setPreviewDevice('desktop')}
                >
                  <Laptop className="h-3.5 w-3.5 mr-1" /> Desktop
                </Button>
                <Button
                  size="sm"
                  variant={previewDevice === 'tablet' ? 'secondary' : 'ghost'}
                  className="h-7 px-2.5"
                  onClick={() => setPreviewDevice('tablet')}
                >
                  <Tablet className="h-3.5 w-3.5 mr-1" /> Tablet
                </Button>
                <Button
                  size="sm"
                  variant={previewDevice === 'mobile' ? 'secondary' : 'ghost'}
                  className="h-7 px-2.5"
                  onClick={() => setPreviewDevice('mobile')}
                >
                  <Smartphone className="h-3.5 w-3.5 mr-1" /> Mobile
                </Button>
              </div>

              <Button
                size="sm"
                className="bg-indigo-600 text-white text-xs h-8"
                onClick={() => handleUseTemplate(previewTemplate)}
              >
                Start Workspace with this Template <ArrowRight className="h-3.5 w-3.5 ml-1" />
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

                      {/* Grid Items */}
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

                  {/* 4. Customer Trust & Call To Action Banner */}
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

                {/* 5. Website Footer */}
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
