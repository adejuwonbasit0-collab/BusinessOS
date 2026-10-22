'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, billingApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CreditCard, Check, AlertCircle, Sparkles, Download, ArrowRight,
  Shield, Zap, CheckCircle2, Building, RefreshCw, Lock
} from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { useAuthStore } from '@/store/authStore';

export default function BillingManagementPage() {
  const qc = useQueryClient();
  const { tenant, updateTenant } = useAuthStore();

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPlanToUpgrade, setSelectedPlanToUpgrade] = useState<string | null>(null);

  const currentPlanSlug = tenant?.planSlug || 'starter';

  // Usage stats
  const usage = {
    users: { current: tenant?.usersCount || 1, max: tenant?.maxUsers || 3 },
    storage: { current: 0.8, max: tenant?.maxStorageGb || 5 },
    products: { current: 14, max: currentPlanSlug === 'starter' ? 50 : currentPlanSlug === 'pro' ? 1000 : 99999 },
    invoices: { current: 28, max: currentPlanSlug === 'starter' ? 100 : 99999 },
  };

  const PLANS = [
    {
      slug: 'starter',
      name: 'Starter Plan',
      price: '$19',
      period: '/ month',
      desc: 'Ideal for sole proprietors, freelancers, and small single-location shops.',
      quotas: ['Max 3 team users', '1 branch / location', 'Up to 50 products in catalogue', '100 invoices / month', 'Standard Community Support'],
      features: ['Basic POS register', 'Core CRM contacts', 'Standard website template', 'Manual bank & WhatsApp orders'],
      restricted: ['No AI insights', 'No custom domain', 'No white-labeling', 'No automated risk management'],
    },
    {
      slug: 'pro',
      name: 'Pro Growth',
      price: '$49',
      period: '/ month',
      popular: true,
      desc: 'Engineered for scaling businesses needing automation, custom domain, and AI.',
      quotas: ['Max 15 team users', 'Up to 5 branches & warehouses', 'Up to 1,000 products', 'Unlimited invoices & receipts', 'Priority 24/7 Support'],
      features: ['Full POS register with barcode scanner', 'AI business intelligence & forecasts', 'Custom domain mapping (www.yourbrand.com)', 'Stripe, Paystack & Flutterwave integration', '100+ website templates access'],
      restricted: ['Dedicated database backup node'],
    },
    {
      slug: 'enterprise',
      name: 'Enterprise Scale',
      price: '$149',
      period: '/ month',
      desc: 'Full power for hotels, hospitals, universities, logistics fleets, and multi-branch operations.',
      quotas: ['Unlimited team users', 'Unlimited branches & warehouses', 'Unlimited products & stock', 'Unlimited invoicing & bookings', 'Dedicated Account Manager'],
      features: ['Full ERP suite with Risk Register', 'Background task scheduler & cron engine', 'Custom Module Builder (unlimited tables)', 'White-labeling & custom email SMTP', 'Automated nightly database snapshots', 'Full REST API & webhook webhooks'],
      restricted: [],
    },
  ];

  // Invoices history
  const invoices = [
    { id: 'INV-2026-10', date: 'Oct 01, 2026', amount: '$49.00', status: 'Paid', plan: 'Pro Growth Plan', method: 'Visa ending in 4242' },
    { id: 'INV-2026-09', date: 'Sep 01, 2026', amount: '$49.00', status: 'Paid', plan: 'Pro Growth Plan', method: 'Visa ending in 4242' },
    { id: 'INV-2026-08', date: 'Aug 01, 2026', amount: '$19.00', status: 'Paid', plan: 'Starter Plan', method: 'Visa ending in 4242' },
  ];

  // Handle Plan Upgrade
  const handleSwitchPlan = async (planSlug: string) => {
    try {
      await api.post('/billing/subscription', { plan: planSlug });
      updateTenant({ planSlug, planName: planSlug.toUpperCase() });
      toast({ title: `Subscription changed to ${planSlug.toUpperCase()}!` });
      setSelectedPlanToUpgrade(null);
    } catch (e: any) {
      toast({ title: e.message || 'Error updating subscription', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-indigo-600" />
            Subscription & Billing Monitor
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor plan quota limits, manage payment methods, and review transaction history.
          </p>
        </div>

        <Badge className="bg-indigo-600 text-white font-medium px-3 py-1 text-xs self-start sm:self-center">
          Active Plan: {tenant?.planName || currentPlanSlug.toUpperCase()}
        </Badge>
      </div>

      {/* ── Current Plan & Quota Meters ───────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Card: Current Plan Overview */}
        <Card className="border-2 border-indigo-200 dark:border-indigo-900 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-indigo-600 border-indigo-300 font-semibold text-[10px]">
                CURRENT ACTIVE TIER
              </Badge>
              <span className="text-xs text-muted-foreground">Renews Nov 01, 2026</span>
            </div>
            <CardTitle className="text-2xl font-extrabold text-foreground mt-1">
              {currentPlanSlug === 'starter' ? 'Starter Plan' : currentPlanSlug === 'pro' ? 'Pro Growth' : 'Enterprise'}
            </CardTitle>
            <CardDescription className="text-xs">
              Billed monthly via default payment method.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-indigo-600 font-mono">
                {currentPlanSlug === 'starter' ? '$19' : currentPlanSlug === 'pro' ? '$49' : '$149'}
              </span>
              <span className="text-xs text-muted-foreground">/ month</span>
            </div>

            <div className="p-3 rounded-lg bg-background border text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Payment Method:</span>
                <span className="font-semibold flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5 text-indigo-600" /> Visa ending 4242
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subscription Status:</span>
                <span className="text-green-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Good Standing
                </span>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs h-8"
              onClick={() => setPaymentModalOpen(true)}
            >
              Update Payment Method
            </Button>
          </CardContent>
        </Card>

        {/* Right 2 Cols: Usage Quotas & Feature Restrictions */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Tier Usage Quotas & Limits</CardTitle>
            <CardDescription className="text-xs">
              Live consumption against your subscription plan capacity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Meter 1: Users */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-foreground">Team User Accounts</span>
                <span className="font-mono text-muted-foreground">
                  {usage.users.current} / {usage.users.max} seats used ({Math.round((usage.users.current / usage.users.max) * 100)}%)
                </span>
              </div>
              <Progress value={(usage.users.current / usage.users.max) * 100} className="h-2" />
            </div>

            {/* Meter 2: Products */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-foreground">Inventory Product Catalogue</span>
                <span className="font-mono text-muted-foreground">
                  {usage.products.current} / {usage.products.max} products ({Math.round((usage.products.current / usage.products.max) * 100)}%)
                </span>
              </div>
              <Progress value={(usage.products.current / usage.products.max) * 100} className="h-2" />
            </div>

            {/* Meter 3: Storage */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-foreground">Media & Document Storage</span>
                <span className="font-mono text-muted-foreground">
                  {usage.storage.current} GB / {usage.storage.max} GB ({Math.round((usage.storage.current / usage.storage.max) * 100)}%)
                </span>
              </div>
              <Progress value={(usage.storage.current / usage.storage.max) * 100} className="h-2" />
            </div>

            {/* Meter 4: Monthly Invoices */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-foreground">Monthly Invoices Issued</span>
                <span className="font-mono text-muted-foreground">
                  {usage.invoices.current} / {usage.invoices.max >= 99999 ? 'Unlimited' : usage.invoices.max}
                </span>
              </div>
              <Progress value={Math.min((usage.invoices.current / (usage.invoices.max >= 99999 ? 1000 : usage.invoices.max)) * 100, 100)} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Strict Plan Comparison & 1-Click Upgrade Matrix ───────────────────── */}
      <div className="space-y-3 pt-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Compare Plans & Upgrade Tier</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Strict subscription rules enforce feature access. Upgrade anytime with prorated billing.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {PLANS.map((plan) => {
            const isCurrent = currentPlanSlug === plan.slug;
            return (
              <Card
                key={plan.slug}
                className={cn(
                  'flex flex-col justify-between transition-all shadow-xs relative',
                  plan.popular && 'border-indigo-600 ring-2 ring-indigo-600/20',
                  isCurrent && 'bg-indigo-50/20 dark:bg-indigo-950/10'
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-indigo-600 text-white font-semibold text-[10px] px-3 py-0.5 shadow-sm">
                      MOST POPULAR
                    </Badge>
                  </div>
                )}

                <div className="p-6">
                  <div className="flex justify-between items-baseline mb-2">
                    <h3 className="font-bold text-base text-foreground">{plan.name}</h3>
                    {isCurrent && (
                      <Badge variant="outline" className="text-green-600 border-green-400 text-[10px] font-semibold">
                        ACTIVE
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground min-h-[32px] leading-relaxed mb-4">{plan.desc}</p>

                  <div className="flex items-baseline gap-1 mb-5">
                    <span className="text-3xl font-extrabold text-foreground">{plan.price}</span>
                    <span className="text-xs text-muted-foreground">{plan.period}</span>
                  </div>

                  <div className="space-y-2 text-xs border-t pt-4">
                    <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider">Plan Quotas:</p>
                    {plan.quotas.map((q, i) => (
                      <div key={i} className="flex items-center gap-2 text-muted-foreground">
                        <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                        <span>{q}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 text-xs border-t pt-3 mt-3">
                    <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider">Enabled Features:</p>
                    {plan.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-muted-foreground">
                        <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>

                  {plan.restricted.length > 0 && (
                    <div className="space-y-1.5 text-xs border-t pt-3 mt-3">
                      <p className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">Restricted:</p>
                      {plan.restricted.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-muted-foreground/70">
                          <Lock className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                          <span className="line-through">{r}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-6 pt-0">
                  <Button
                    className={cn(
                      'w-full text-xs font-semibold h-10',
                      isCurrent
                        ? 'bg-muted text-muted-foreground hover:bg-muted cursor-default'
                        : plan.popular
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        : 'bg-primary text-primary-foreground'
                    )}
                    disabled={isCurrent}
                    onClick={() => handleSwitchPlan(plan.slug)}
                  >
                    {isCurrent ? 'Current Plan' : `Upgrade to ${plan.name}`}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── Invoices History Table ───────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Billing Invoices & Payment Receipts</CardTitle>
          <CardDescription className="text-xs">
            Download PDF receipts for your accounting and tax records.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Billing Date</TableHead>
                <TableHead>Plan Tier</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono font-medium text-xs text-indigo-600">{inv.id}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{inv.date}</TableCell>
                  <TableCell className="text-xs font-semibold">{inv.plan}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{inv.method}</TableCell>
                  <TableCell className="text-right font-mono font-bold text-xs">{inv.amount}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-indigo-600 gap-1"
                      onClick={() => toast({ title: `Downloading ${inv.id}.pdf receipt...` })}
                    >
                      <Download className="h-3 w-3" /> PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Modal: Update Payment Method ──────────────────────────────────────── */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-indigo-600" />
              Update Payment Card
            </DialogTitle>
            <DialogDescription>
              Enter new card details for subscription renewals.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              toast({ title: 'Payment method updated successfully!' });
              setPaymentModalOpen(false);
            }}
            className="space-y-3 py-2 text-xs"
          >
            <div>
              <Label>Cardholder Name</Label>
              <Input required placeholder="Jane Doe" className="h-9 text-xs" />
            </div>
            <div>
              <Label>Card Number</Label>
              <Input required placeholder="4242 •••• •••• 4242" className="h-9 text-xs font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Expiry (MM/YY)</Label>
                <Input required placeholder="12/28" className="h-9 text-xs font-mono" />
              </div>
              <div>
                <Label>CVC / CVV</Label>
                <Input required placeholder="123" className="h-9 text-xs font-mono" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setPaymentModalOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" className="bg-indigo-600 text-white">Save Card</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
