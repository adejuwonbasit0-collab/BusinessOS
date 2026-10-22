'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight, BarChart3, Package, Shield, Sparkles, Users, DollarSign,
  Hotel, GraduationCap, HeartPulse, Scissors, UtensilsCrossed, Plane,
  Briefcase, ShoppingCart, Building2, Truck, CheckCircle2, Star, Eye,
  Layers, Zap, Clock, Smartphone
} from 'lucide-react';

const HIGHLIGHT_NICHES = [
  { key: 'school', name: 'Schools & Universities', icon: GraduationCap, desc: 'Student enrollments, academic LMS, exams, gradebooks, and tuition fee billing.' },
  { key: 'hotel', name: 'Hotels & Resorts', icon: Hotel, desc: 'Room suites inventory, guest reservations, check-in folio billing, and housekeeping.' },
  { key: 'hospital', name: 'Hospitals & Healthcare', icon: HeartPulse, desc: 'Patient EHR/EMR, doctor appointments, diagnosis, prescription orders, and ward beds.' },
  { key: 'beauty_salon', name: 'Barbershops & Salons', icon: Scissors, desc: 'Stylist chair roster, haircut bookings, walk-in queues, and service duration menus.' },
  { key: 'restaurant', name: 'Restaurants & Dining', icon: UtensilsCrossed, desc: 'Table seating map, kitchen order tickets (KOT), daily specials, and reservations.' },
  { key: 'airport', name: 'Airports & Aviation', icon: Plane, desc: 'Live flight arrival/departure board, terminal gate allocations, and baggage handling.' },
  { key: 'ecommerce', name: 'Retail & E-Commerce', icon: ShoppingCart, desc: 'Product catalog, barcode generation, 80mm thermal receipts, and WhatsApp orders.' },
  { key: 'professional_services', name: 'Freelancers & Agencies', icon: Briefcase, desc: 'Client proposals, project milestones, time tracking, and retainer invoicing.' },
];

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      {/* ── Public Navbar ────────────────────────────────────────────────────── */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="font-black text-xl tracking-tight flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">N</span>
              <span>Nex<span className="text-indigo-600">OS</span></span>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link href="/templates" className="text-foreground hover:text-indigo-600 transition-colors flex items-center gap-1.5 font-semibold">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                100+ Templates
              </Link>
              <Link href="#solutions" className="text-muted-foreground hover:text-foreground transition-colors">70+ Niches</Link>
              <Link href="#features" className="text-muted-foreground hover:text-foreground transition-colors">OS Features</Link>
              <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing Plans</Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push('/login')}>Sign in</Button>
            <Button size="sm" className="bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => router.push('/register')}>
              Create Free Workspace
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero Section ────────────────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-6 py-24 text-center">
          <Badge className="bg-indigo-50 border-indigo-200 text-indigo-700 px-3.5 py-1 text-xs mb-5 inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Universal Business Operating System
          </Badge>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-foreground max-w-4xl mx-auto leading-tight">
            One Operating System For <span className="text-indigo-600">Every Business on Earth.</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            From schools and luxury hotels to medical clinics, barbershops, airports, and online stores. NexOS morphs its terminology, POS register, booking system, ERP ledger, and landing pages to your exact industry.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 h-12 text-sm font-semibold shadow-lg shadow-indigo-600/20" onClick={() => router.push('/register')}>
              Start Free 14-Day Trial <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-sm font-semibold" onClick={() => router.push('/templates')}>
              Browse 100+ Templates
            </Button>
          </div>

          <div className="mt-10 flex items-center justify-center gap-8 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> 70+ Curated Industry Presets</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> 106+ Pre-built Website Templates</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> POS + WhatsApp Order Checkout</span>
          </div>
        </section>

        {/* ── Solutions by Niche Section ───────────────────────────────────────── */}
        <section id="solutions" className="border-t py-20 bg-muted/20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <h2 className="text-3xl font-extrabold tracking-tight">Tuned for 70+ Occupations & Niches</h2>
              <p className="mt-3 text-muted-foreground text-sm">
                No generic software. When you register your business, your entire dashboard, navigation, and customer workflows adapt instantly to how your industry operates.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {HIGHLIGHT_NICHES.map((niche) => {
                const Icon = niche.icon;
                return (
                  <Card key={niche.key} className="hover:border-indigo-400 hover:shadow-md transition-all group">
                    <CardContent className="pt-6 pb-5 flex flex-col justify-between h-full">
                      <div>
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="font-bold text-base text-foreground">{niche.name}</h3>
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{niche.desc}</p>
                      </div>

                      <div className="mt-5 pt-3 border-t">
                        <Link
                          href={`/register?niche=${niche.key}`}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                        >
                          Launch {niche.name.split(' ')[0]} Workspace <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="mt-10 text-center">
              <Button variant="outline" onClick={() => router.push('/templates')} className="text-xs">
                Explore All 106 Industry Templates & Niches <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        </section>

        {/* ── All-in-One Operations & ERP Section ──────────────────────────────── */}
        <section id="features" className="border-t py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <h2 className="text-3xl font-extrabold tracking-tight">Everything a Business Needs Under One Roof</h2>
              <p className="mt-3 text-muted-foreground text-sm">
                Stop stitching together five different subscriptions. NexOS handles sales, procurement, inventory, risk matrices, and public sites natively.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-6">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  <Package className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-base">Inventory & Code128 Barcodes</h3>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Product SKUs, suppliers, categories, low-stock reorder thresholds, and interactive printable sticky barcode label sheets.
                </p>
              </Card>

              <Card className="p-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-base">High-Speed POS & Thermal Receipts</h3>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Lightning fast barcode scanner register with cash, card, Paystack, Flutterwave, and instant 80mm printable thermal receipt generator.
                </p>
              </Card>

              <Card className="p-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                  <Truck className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-base">Purchases & Vendor Intake</h3>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Full dedicated purchase order ledger with typeahead product search, multi-line costs, and automatic inventory restocking.
                </p>
              </Card>

              <Card className="p-6">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                  <Shield className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-base">ERP & 5x5 Risk Management</h3>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Enterprise risk registers with probability/impact scoring matrices, background task schedulers, and expense ledgers.
                </p>
              </Card>

              <Card className="p-6">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                  <Smartphone className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-base">Multi-Domain Public Sites</h3>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Host your business storefront at <code className="text-[11px] font-mono bg-muted px-1 rounded">myname.localhost:3002</code> or your own custom domain with WhatsApp order dispatch.
                </p>
              </Card>

              <Card className="p-6">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                  <Layers className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-base">No-Code Module Builder</h3>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Create bespoke database tables and workflows without code. Add custom fields, statuses, records, and relations directly from your dashboard.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* ── Ready CTA Banner ────────────────────────────────────────────────── */}
        <section className="border-t py-20 bg-gradient-to-br from-indigo-900 to-slate-900 text-white text-center">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Ready to Run Your Entire Business on NexOS?</h2>
            <p className="mt-4 text-slate-300 text-sm max-w-xl mx-auto leading-relaxed">
              Start your 14-day free trial. Choose from 106+ landing page templates and 70+ industry presets today.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Button size="lg" className="bg-indigo-500 hover:bg-indigo-600 text-white px-8 font-semibold" onClick={() => router.push('/register')}>
                Create Workspace Now <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={() => router.push('/pricing')}>
                View Pricing
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* ── Public Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t py-8 bg-card">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>© 2026 NexOS Universal Multi-Tenant Business Operating System.</span>
          <div className="flex gap-6">
            <Link href="/templates" className="hover:text-foreground">100+ Templates</Link>
            <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link href="/login" className="hover:text-foreground">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
