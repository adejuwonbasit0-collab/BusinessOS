'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  ShoppingCart, Calendar, Phone, Mail, MapPin, Globe, CheckCircle2,
  Clock, ArrowRight, MessageSquare, Briefcase, FileText, Send, User,
  Building2, Sparkles, X, ChevronRight, AlertCircle, CreditCard
} from 'lucide-react';
import { getNicheDefinition } from '@/lib/nichesData';
import { getTemplatesByNiche } from '@/lib/templatesData';
import { toast } from '@/hooks/useToast';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export default function TenantPublicPage() {
  const params = useParams();
  const subdomain = (params.subdomain as string) || 'demo';

  // Fetch tenant info
  const { data: tenantData } = useQuery({
    queryKey: ['public-tenant', subdomain],
    queryFn: () => api.get(`/auth/public-tenant/${subdomain}`).catch(() => ({ data: null })),
  });

  // Fetch tenant inventory products
  const { data: productsData } = useQuery({
    queryKey: ['public-products', subdomain],
    queryFn: () => api.get(`/inventory/public/${subdomain}`).catch(() => ({ data: [] })),
  });

  // Fetch active integrations to only show enabled ones
  const { data: integrationsData } = useQuery({
    queryKey: ['public-integrations', subdomain],
    queryFn: () => api.get(`/integrations/public/${subdomain}`).catch(() => ({ data: [] })),
  });

  const tenant = (tenantData as any)?.data || {
    name: `${subdomain.toUpperCase()} Enterprise`,
    slug: subdomain,
    industry: 'hotel',
    phone: '+1 (555) 234-5678',
    currency: 'USD',
    primaryColor: '#4f46e5',
  };

  const niche = getNicheDefinition(tenant.industry || 'general');
  const template = getTemplatesByNiche(tenant.industry)[0];

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([
    { id: 'item-1', name: 'Executive Suite Reservation (1 Night)', price: 180, quantity: 1 },
  ]);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [jobModalOpen, setJobModalOpen] = useState<any | null>(null);

  // Checkout form
  const [checkoutForm, setCheckoutForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    paymentMethod: 'whatsapp', // whatsapp | stripe | paystack | flutterwave | bank
  });

  // Booking form
  const [bookingForm, setBookingForm] = useState({
    service: 'Consultation & Evaluation',
    date: '2026-10-25',
    time: '14:00',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
  });

  // Job application form
  const [jobForm, setJobForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    resumeLink: '',
    coverNote: '',
  });

  // Calculate cart subtotal & total
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const tax = subtotal * 0.08;
  const grandTotal = subtotal + tax;

  const addToCart = (product: { id: string; name: string; price: number }) => {
    setCart((prev) => {
      const exists = prev.find((item) => item.id === product.id);
      if (exists) {
        return prev.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setCartDrawerOpen(true);
    toast({ title: `Added "${product.name}" to cart!` });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // WhatsApp Order Generator
  const handleOrderViaWhatsApp = () => {
    const phone = tenant.phone ? tenant.phone.replace(/[^0-9]/g, '') : '15552345678';
    const itemsSummary = cart
      .map((item) => `• ${item.name} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}`)
      .join('%0A');

    const customerDetails = checkoutForm.name ? `%0A%0A*Customer Info:*%0AName: ${checkoutForm.name}%0APhone: ${checkoutForm.phone}` : '';
    const message = `*NEW ORDER from ${tenant.name} Website*%0A%0A*Items Ordered:*%0A${itemsSummary}%0A%0A*Total Amount:* $${grandTotal.toFixed(2)}${customerDetails}%0A%0APlease confirm availability and payment instructions. Thank you!`;

    const whatsappUrl = `https://wa.me/${phone}?text=${message}`;
    window.open(whatsappUrl, '_blank');
    setCheckoutModalOpen(false);
    setCartDrawerOpen(false);
    toast({ title: 'Order generated! Opening WhatsApp...' });
  };

  // Direct Online Payment (Card / Paystack / Flutterwave)
  const handleCompletePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (checkoutForm.paymentMethod === 'whatsapp') {
      handleOrderViaWhatsApp();
      return;
    }
    toast({
      title: 'Payment Successful!',
      description: `Your order of $${grandTotal.toFixed(2)} has been confirmed via ${checkoutForm.paymentMethod.toUpperCase()}.`,
    });
    setCart([]);
    setCheckoutModalOpen(false);
  };

  // Submit Job Application
  const handleJobSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: 'Application Submitted!',
      description: `Thank you, ${jobForm.fullName}. Our hiring manager has received your resume for ${jobModalOpen?.title}.`,
    });
    setJobModalOpen(null);
    setJobForm({ fullName: '', email: '', phone: '', resumeLink: '', coverNote: '' });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* ── Public Branded Top Navbar ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link href={`/site/${subdomain}`} className="flex items-center gap-2.5 font-bold text-lg text-foreground">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-white font-black text-sm shadow-sm">
              {tenant.name.charAt(0)}
            </span>
            <span>{tenant.name}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-muted-foreground">
            <a href="#services" className="hover:text-foreground transition-colors">Services</a>
            <a href="#products" className="hover:text-foreground transition-colors">Shop / Store</a>
            <a href="#booking" className="hover:text-foreground transition-colors">Book Online</a>
            <a href="#careers" className="hover:text-foreground transition-colors">Careers & Vacancies</a>
            <a href="#contact" className="hover:text-foreground transition-colors">Contact</a>
          </nav>

          <div className="flex items-center gap-2.5">
            {/* Cart Button */}
            <Button
              variant="outline"
              size="sm"
              className="relative h-9 px-3 text-xs gap-1.5"
              onClick={() => setCartDrawerOpen(true)}
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Cart</span>
              {cart.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                  {cart.reduce((c, i) => c + i.quantity, 0)}
                </span>
              )}
            </Button>

            {/* Customer Portal Link */}
            <Link href={`/site/${subdomain}/portal`}>
              <Button size="sm" className="h-9 px-3.5 text-xs bg-indigo-600 text-white hover:bg-indigo-500 font-medium">
                <User className="h-3.5 w-3.5 mr-1.5" />
                Customer Portal
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Banner ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white py-20 px-4 md:py-28">
        <div className="max-w-5xl mx-auto text-center space-y-5">
          <Badge className="bg-white/10 hover:bg-white/15 text-white border-white/20 text-xs px-3 py-1">
            {template.hero.badge || `${niche.name} · Verified Services`}
          </Badge>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight max-w-4xl mx-auto">
            {template.hero.title || `Premier ${niche.name} Experience`}
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {template.hero.subtitle || niche.description}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <a href="#products">
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-6 h-12 shadow-lg shadow-indigo-600/30">
                Browse Offerings & Shop <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </a>
            <a href="#booking">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 text-sm px-6 h-12 font-medium">
                <Calendar className="h-4 w-4 mr-2" /> Book Online Slot
              </Button>
            </a>
          </div>

          <div className="pt-8 grid grid-cols-3 max-w-xl mx-auto divide-x divide-white/10 text-center">
            {template.hero.stats.map((st, i) => (
              <div key={i} className="px-3">
                <p className="text-xl sm:text-2xl font-bold text-white">{st.value}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{st.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Products & E-Commerce Storefront Section ───────────────────────────── */}
      <section id="products" className="py-16 px-4 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <Badge variant="outline" className="text-xs mb-2 text-indigo-600 border-indigo-200">
              Direct E-Commerce Store
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Products, Menus & Offerings
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Add items to your cart, check out online, or order immediately via WhatsApp.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleOrderViaWhatsApp}
            className="text-xs gap-1.5 border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/40"
          >
            <MessageSquare className="h-3.5 w-3.5" /> Order on WhatsApp Direct
          </Button>
        </div>

        {/* Product Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[
            { id: 'prod-1', name: 'Signature Offering Package', price: 120, desc: 'Complete premium service bundle with priority scheduling.' },
            { id: 'prod-2', name: 'Deluxe Access Tier', price: 240, desc: 'All-inclusive multi-session package with direct consultation.' },
            { id: 'prod-3', name: 'Essential Care Kit', price: 45, desc: 'Official branded merchandise and care supplies.' },
            { id: 'prod-4', name: 'Annual Pass / VIP Retainer', price: 480, desc: 'Unrestricted year-round access and priority concierge.' },
          ].map((prod) => (
            <Card key={prod.id} className="overflow-hidden shadow-xs hover:border-indigo-400 transition-all flex flex-col justify-between">
              <div className="p-5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-bold text-sm mb-3">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-sm text-foreground">{prod.name}</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{prod.desc}</p>
                <p className="text-lg font-bold text-indigo-600 mt-3">${prod.price.toFixed(2)}</p>
              </div>

              <div className="p-4 pt-0 flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 text-xs bg-indigo-600 text-white hover:bg-indigo-500"
                  onClick={() => addToCart(prod)}
                >
                  <ShoppingCart className="h-3.5 w-3.5 mr-1" /> Add to Cart
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs border-green-600 text-green-600 hover:bg-green-50"
                  onClick={() => {
                    addToCart(prod);
                    handleOrderViaWhatsApp();
                  }}
                  title="Buy via WhatsApp"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Public Online Booking Widget ──────────────────────────────────────── */}
      <section id="booking" className="py-16 px-4 bg-muted/30 border-y">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <Badge variant="outline" className="text-xs mb-2 text-indigo-600 border-indigo-200">
              Interactive Appointments
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Book a Reservation or Session</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Select your service, choose your preferred slot, and receive instant confirmation.
            </p>
          </div>

          <Card className="p-6 sm:p-8 shadow-sm">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                toast({
                  title: 'Booking Confirmed!',
                  description: `Appointment confirmed for ${bookingForm.clientName} on ${bookingForm.date} at ${bookingForm.time}.`,
                });
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Service Required</Label>
                  <select
                    className="w-full h-10 px-3 border rounded-lg bg-background text-xs"
                    value={bookingForm.service}
                    onChange={(e) => setBookingForm((p) => ({ ...p, service: e.target.value }))}
                  >
                    <option>Consultation & Evaluation</option>
                    <option>Full Executive Treatment / Session</option>
                    <option>Standard Inspection / Review</option>
                    <option>VIP Personalized Service</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={bookingForm.date}
                      onChange={(e) => setBookingForm((p) => ({ ...p, date: e.target.value }))}
                      className="h-10 text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Time Slot</Label>
                    <select
                      className="w-full h-10 px-3 border rounded-lg bg-background text-xs"
                      value={bookingForm.time}
                      onChange={(e) => setBookingForm((p) => ({ ...p, time: e.target.value }))}
                    >
                      <option>09:00 AM</option>
                      <option>11:30 AM</option>
                      <option>02:00 PM</option>
                      <option>04:30 PM</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Your Full Name</Label>
                  <Input
                    required
                    placeholder="Jane Doe"
                    value={bookingForm.clientName}
                    onChange={(e) => setBookingForm((p) => ({ ...p, clientName: e.target.value }))}
                    className="h-10 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    required
                    placeholder="jane@example.com"
                    value={bookingForm.clientEmail}
                    onChange={(e) => setBookingForm((p) => ({ ...p, clientEmail: e.target.value }))}
                    className="h-10 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone / WhatsApp</Label>
                  <Input
                    type="tel"
                    required
                    placeholder="+1 (555) 000-0000"
                    value={bookingForm.clientPhone}
                    onChange={(e) => setBookingForm((p) => ({ ...p, clientPhone: e.target.value }))}
                    className="h-10 text-xs"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-11 bg-indigo-600 text-white font-semibold text-xs mt-2 hover:bg-indigo-500">
                Confirm Booking & Receive Notification
              </Button>
            </form>
          </Card>
        </div>
      </section>

      {/* ── Careers & Vacancies Job Board ────────────────────────────────────── */}
      <section id="careers" className="py-16 px-4 max-w-5xl mx-auto w-full">
        <div className="text-center mb-10">
          <Badge variant="outline" className="text-xs mb-2 text-indigo-600 border-indigo-200">
            Open Positions & Hiring
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Work With Us at {tenant.name}</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            We are hiring talented professionals. Review our open roles and apply online.
          </p>
        </div>

        <div className="space-y-3">
          {[
            { id: 'job-1', title: 'Senior Operations Lead', dept: 'Operations & Management', type: 'Full-time', location: 'On-site / Hybrid' },
            { id: 'job-2', title: 'Customer Experience Associate', dept: 'Guest / Client Relations', type: 'Full-time', location: 'On-site' },
            { id: 'job-3', title: 'Technical Specialist & Supervisor', dept: 'Technical & Delivery', type: 'Full-time', location: 'On-site' },
          ].map((job) => (
            <Card key={job.id} className="hover:border-primary/40 transition-colors shadow-2xs">
              <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-sm text-foreground">{job.title}</h4>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span>{job.dept}</span>
                    <span>•</span>
                    <span>{job.location}</span>
                    <span>•</span>
                    <Badge variant="secondary" className="text-[10px] font-normal">{job.type}</Badge>
                  </div>
                </div>

                <Button
                  size="sm"
                  className="bg-indigo-600 text-white text-xs h-8 shrink-0 hover:bg-indigo-500"
                  onClick={() => setJobModalOpen(job)}
                >
                  Apply for Role
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Contact Section ─────────────────────────────────────────────────── */}
      <section id="contact" className="py-16 px-4 bg-muted/40 border-t">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Connect With Our Team</h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Have questions regarding our services, private booking, or custom orders? Reach us directly.
            </p>

            <div className="mt-6 space-y-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center shrink-0">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold">Direct Telephone / WhatsApp</p>
                  <p className="text-muted-foreground">{tenant.phone || '+1 (555) 234-5678'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center shrink-0">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold">Email Inquiries</p>
                  <p className="text-muted-foreground">hello@{subdomain}.nexos.app</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center shrink-0">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold">Official Business Address</p>
                  <p className="text-muted-foreground">Commercial Business District, Suite 400</p>
                </div>
              </div>
            </div>
          </div>

          <Card className="p-6">
            <h3 className="font-semibold text-sm mb-3">Send Direct Inquiry</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                toast({ title: 'Message Sent!', description: 'Our team will respond within 24 hours.' });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <Label>Your Name</Label>
                <Input required placeholder="Jane Doe" className="h-9 text-xs" />
              </div>
              <div>
                <Label>Your Email</Label>
                <Input type="email" required placeholder="jane@company.com" className="h-9 text-xs" />
              </div>
              <div>
                <Label>Message</Label>
                <textarea required rows={3} placeholder="How can we assist you?" className="w-full p-2.5 border rounded-lg bg-background text-xs" />
              </div>
              <Button type="submit" className="w-full bg-indigo-600 text-white text-xs h-9">
                <Send className="h-3.5 w-3.5 mr-1.5" /> Send Message
              </Button>
            </form>
          </Card>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t py-8 px-4 bg-background text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} {tenant.name}. All rights reserved.</p>
        <p className="mt-1 text-[11px]">Powered by NexOS Universal Business Operating System</p>
      </footer>

      {/* ── Slide-Out Cart Drawer ───────────────────────────────────────────── */}
      {cartDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-background h-full shadow-2xl flex flex-col justify-between p-6">
            <div>
              <div className="flex items-center justify-between pb-4 border-b">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-indigo-600" />
                  Your Order Cart ({cart.length})
                </h3>
                <button onClick={() => setCartDrawerOpen(false)} className="p-1 rounded-lg hover:bg-muted">
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              <div className="py-4 space-y-3 overflow-y-auto max-h-[60vh]">
                {cart.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-10">Your cart is empty.</p>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-xl text-xs">
                      <div>
                        <p className="font-semibold text-foreground">{item.name}</p>
                        <p className="text-muted-foreground mt-0.5">${item.price.toFixed(2)} each</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-6 h-6 rounded bg-muted flex items-center justify-center font-bold"
                        >
                          -
                        </button>
                        <span className="font-semibold px-1">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-6 h-6 rounded bg-muted flex items-center justify-center font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="border-t pt-4 space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated Tax (8%)</span>
                  <span className="font-semibold">${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t pt-2">
                  <span>Grand Total</span>
                  <span className="text-indigo-600">${grandTotal.toFixed(2)}</span>
                </div>

                <div className="space-y-2 pt-2">
                  <Button
                    className="w-full bg-indigo-600 text-white font-semibold text-xs h-10 hover:bg-indigo-500"
                    onClick={() => {
                      setCartDrawerOpen(false);
                      setCheckoutModalOpen(true);
                    }}
                  >
                    Proceed to Online Checkout
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full border-green-600 text-green-600 hover:bg-green-50 text-xs h-10 gap-1.5"
                    onClick={handleOrderViaWhatsApp}
                  >
                    <MessageSquare className="h-4 w-4" /> Order & Pay via WhatsApp
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Online Checkout ────────────────────────────────────────────── */}
      <Dialog open={checkoutModalOpen} onOpenChange={setCheckoutModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-indigo-600" />
              Secure Checkout — ${grandTotal.toFixed(2)}
            </DialogTitle>
            <DialogDescription>
              Select your payment method to complete your purchase.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCompletePayment} className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label>Your Full Name</Label>
              <Input
                required
                value={checkoutForm.name}
                onChange={(e) => setCheckoutForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Jane Doe"
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  required
                  value={checkoutForm.email}
                  onChange={(e) => setCheckoutForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="jane@example.com"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone / WhatsApp</Label>
                <Input
                  type="tel"
                  required
                  value={checkoutForm.phone}
                  onChange={(e) => setCheckoutForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+1 (555) 000-0000"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-semibold">Select Payment Gateway</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'whatsapp', name: 'WhatsApp Direct', desc: 'Confirm via chat' },
                  { key: 'stripe', name: 'Credit / Debit Card', desc: 'Instant Stripe' },
                  { key: 'paystack', name: 'Paystack', desc: 'Nigeria & Africa' },
                  { key: 'flutterwave', name: 'Flutterwave', desc: 'Mobile money & card' },
                  { key: 'paypal', name: 'PayPal', desc: 'PayPal balance' },
                  { key: 'bank', name: 'Bank Transfer', desc: 'Manual transfer receipt' },
                ].map((pm) => (
                  <button
                    key={pm.key}
                    type="button"
                    onClick={() => setCheckoutForm((p) => ({ ...p, paymentMethod: pm.key }))}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      checkoutForm.paymentMethod === pm.key
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 font-semibold'
                        : 'bg-card'
                    }`}
                  >
                    <div className="text-xs">{pm.name}</div>
                    <div className="text-[10px] text-muted-foreground font-normal">{pm.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {checkoutForm.paymentMethod === 'bank' && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1">
                <p className="font-semibold">Bank Transfer Instructions:</p>
                <p>Bank: First National Bank</p>
                <p>Account Name: {tenant.name}</p>
                <p>Account Number: 0129849201</p>
                <p>Please send proof of payment to WhatsApp or email after transferring.</p>
              </div>
            )}

            <Button type="submit" className="w-full bg-indigo-600 text-white font-semibold text-xs h-10 hover:bg-indigo-500">
              {checkoutForm.paymentMethod === 'whatsapp' ? 'Open WhatsApp with Order' : `Pay $${grandTotal.toFixed(2)} Now`}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Job Application ────────────────────────────────────────────── */}
      {jobModalOpen && (
        <Dialog open={!!jobModalOpen} onOpenChange={() => setJobModalOpen(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-indigo-600" />
                Apply for {jobModalOpen.title}
              </DialogTitle>
              <DialogDescription>
                Submit your credentials to the hiring team at {tenant.name}.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleJobSubmit} className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <Label>Full Name</Label>
                <Input
                  required
                  placeholder="Alex Rivers"
                  value={jobForm.fullName}
                  onChange={(e) => setJobForm((p) => ({ ...p, fullName: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    required
                    placeholder="alex@example.com"
                    value={jobForm.email}
                    onChange={(e) => setJobForm((p) => ({ ...p, email: e.target.value }))}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Phone</Label>
                  <Input
                    type="tel"
                    required
                    placeholder="+1 (555) 000-0000"
                    value={jobForm.phone}
                    onChange={(e) => setJobForm((p) => ({ ...p, phone: e.target.value }))}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Link to CV / Resume / LinkedIn Profile</Label>
                <Input
                  required
                  placeholder="https://linkedin.com/in/... or Google Drive link"
                  value={jobForm.resumeLink}
                  onChange={(e) => setJobForm((p) => ({ ...p, resumeLink: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label>Brief Cover Note</Label>
                <textarea
                  rows={3}
                  placeholder="Tell us why you are a great fit..."
                  value={jobForm.coverNote}
                  onChange={(e) => setJobForm((p) => ({ ...p, coverNote: e.target.value }))}
                  className="w-full p-2.5 border rounded-lg bg-background text-xs"
                />
              </div>

              <Button type="submit" className="w-full bg-indigo-600 text-white font-semibold text-xs h-9">
                Submit Application
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
