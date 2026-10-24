'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Check, CircleCheck, Loader2, Sparkles, Building2, Search, SlidersHorizontal } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { billingApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NICHES_DATA, NICHE_CATEGORIES, getNicheDefinition } from '@/lib/nichesData';

const trialBenefits = ['14-day free trial', 'No credit card required', 'Set up in minutes'];

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register: registerUser } = useAuthStore();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    businessName: '',
    username: '',
    phone: '',
    plan: 'starter',
    industry: searchParams.get('niche') || 'hotel',
    customIndustry: '',
  });

  useEffect(() => {
    const urlNiche = searchParams.get('niche');
    if (urlNiche) {
      setForm((p) => ({ ...p, industry: urlNiche }));
    }
  }, [searchParams]);

  const [nicheSearch, setNicheSearch] = useState('');
  const [plans, setPlans] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameState, setUsernameState] = useState<{ normalized: string; available: boolean; suggestions: string[] } | null>(null);

  const update = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  useEffect(() => {
    billingApi.plans().then((res: any) => setPlans(res?.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const candidate = form.username.trim().toLowerCase();
    if (candidate.length < 3) { setUsernameState(null); return; }
    const timer = window.setTimeout(() => {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/auth/username-suggestions?username=${encodeURIComponent(candidate)}`)
        .then((response) => response.json())
        .then((response) => setUsernameState(response?.data || null))
        .catch(() => setUsernameState(null));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [form.username]);

  const selectedNicheInfo = getNicheDefinition(form.industry, form.customIndustry);

  const filteredNiches = Object.values(NICHES_DATA).filter((n) =>
    n.name.toLowerCase().includes(nicheSearch.toLowerCase()) ||
    n.categoryName.toLowerCase().includes(nicheSearch.toLowerCase())
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const tenant = await registerUser({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        businessName: form.businessName,
        username: form.username,
        phone: form.phone,
        plan: form.plan,
        industry: form.industry,
        customIndustry: form.industry === 'other' ? form.customIndustry : undefined,
      });
      // A new owner leaves the platform registration page for their own
      // workspace host. Their login, dashboard and logout all stay there.
      const port = window.location.port ? `:${window.location.port}` : '';
      window.location.assign(`${window.location.protocol}//${tenant.subdomain}.localhost${port}/dashboard`);
    } catch (err: any) {
      setError(err.message || 'We could not create your workspace. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-3 text-slate-900 lg:p-5">
      <div className="grid min-h-[calc(100vh-1.5rem)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-950 p-10 text-white lg:flex lg:flex-col xl:p-14">
          <div className="absolute -right-16 top-16 h-72 w-72 rounded-full border border-indigo-500/20" />
          <div className="absolute -bottom-24 right-24 h-80 w-80 rounded-full border border-cyan-500/20" />
          
          <div className="relative flex items-center gap-3 text-lg font-semibold">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 text-sm font-black text-white shadow-lg">
              N
            </span>
            NexOS Universal
          </div>

          <div className="relative my-auto max-w-sm">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-cyan-300">
              <Sparkles className="h-3.5 w-3.5" />
              Adapts to 70+ Business Niches
            </div>
            
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-white xl:text-4xl">
              One platform, customized for your exact industry.
            </h1>
            
            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              Select your niche and NexOS automatically activates your terminology, workflows, POS register, booking system, ERP tools, and starter website templates.
            </p>

            {/* Dynamic preview badge based on selection */}
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Selected Workspace Blueprint</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-2xl">{selectedNicheInfo.icon}</span>
                <div>
                  <p className="font-semibold text-white">{selectedNicheInfo.name}</p>
                  <p className="text-xs text-slate-400">{selectedNicheInfo.categoryName}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {Object.entries(selectedNicheInfo.terminology).slice(0, 4).map(([key, val]) => (
                  <span key={key} className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] text-slate-200">
                    {key}: <strong className="text-white">{val}</strong>
                  </span>
                ))}
              </div>
            </div>

            <ul className="mt-8 space-y-3">
              {trialBenefits.map((benefit) => (
                <li key={benefit} className="flex items-center gap-2.5 text-xs text-slate-200">
                  <CircleCheck className="h-4 w-4 text-cyan-400 shrink-0" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
          
          <p className="relative text-xs text-slate-400">NexOS Universal Business OS · Multi-Tenant Architecture</p>
        </section>

        <section className="flex items-center justify-center bg-white px-5 py-8 sm:px-10 overflow-y-auto">
          <div className="w-full max-w-xl py-4">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-sm font-black text-white">N</span>
              <span className="text-lg font-semibold">NexOS</span>
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Create your workspace</h2>
              <p className="mt-1 text-sm text-slate-500">Pick your business type to configure your specialized dashboard.</p>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-5 border-red-200 bg-red-50 text-red-700">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Personal info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First name" id="firstName" value={form.firstName} onChange={update('firstName')} autoComplete="given-name" placeholder="Sarah" />
                <Field label="Last name" id="lastName" value={form.lastName} onChange={update('lastName')} autoComplete="family-name" placeholder="Connor" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Work email" id="email" type="email" value={form.email} onChange={update('email')} autoComplete="email" placeholder="sarah@company.com" />
                <Field label="Phone number" id="phone" type="tel" value={form.phone} onChange={update('phone')} placeholder="+1 (555) 000-0000" />
              </div>

              <Field label="Business / Company name" id="businessName" value={form.businessName} onChange={update('businessName')} autoComplete="organization" placeholder="e.g. Grand Vista Hotel or St. Jude Clinic" />

              <div className="space-y-1.5 rounded-xl border border-slate-200 p-3">
                <Label htmlFor="username" className="text-xs font-semibold">Choose your workspace username</Label>
                <div className="flex items-center rounded-md border bg-white focus-within:ring-2 focus-within:ring-indigo-500">
                  <Input id="username" value={form.username} onChange={update('username')} required minLength={3} maxLength={32} pattern="[a-z0-9][a-z0-9-]*[a-z0-9]" placeholder="bazillin" className="h-10 border-0 shadow-none focus-visible:ring-0" />
                  <span className="pr-3 whitespace-nowrap text-xs text-slate-500">.localhost:3002</span>
                </div>
                {usernameState && <p className={usernameState.available ? 'text-xs text-emerald-600' : 'text-xs text-amber-600'}>{usernameState.available ? 'This workspace address is available.' : 'That address is already taken.'}</p>}
                {usernameState?.suggestions?.length ? <div className="flex flex-wrap gap-2 pt-1">{usernameState.suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => setForm((current) => ({ ...current, username: suggestion }))} className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700 hover:bg-indigo-100">{suggestion}.localhost</button>)}</div> : null}
                <p className="text-[11px] text-slate-500">This is the owner’s separate platform: its public site, login, dashboard and logout all use this address.</p>
              </div>

              {/* Niche / Occupation Picker */}
              <div className="space-y-2 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="industry" className="text-sm font-semibold text-indigo-950 flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-indigo-600" />
                    Business Niche / Occupation
                  </Label>
                  <span className="text-xs text-indigo-600 font-medium">70+ Presets Available</span>
                </div>

                <Select value={form.industry} onValueChange={(val) => setForm((p) => ({ ...p, industry: val }))}>
                  <SelectTrigger className="h-12 border-slate-300 bg-white shadow-sm font-medium">
                    <SelectValue placeholder="Select your occupation/niche" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    <div className="p-2 border-b">
                      <div className="flex items-center gap-2 px-2 py-1 bg-slate-100 rounded-lg text-xs">
                        <Search className="h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          type="text"
                          value={nicheSearch}
                          onChange={(e) => setNicheSearch(e.target.value)}
                          placeholder="Search 70+ niches (school, hotel, salon, airport...)"
                          className="bg-transparent outline-none w-full text-xs text-foreground"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    {filteredNiches.map((niche) => (
                      <SelectItem key={niche.key} value={niche.key}>
                        <div className="flex items-center gap-2.5 py-0.5">
                          <span className="text-base">{niche.icon}</span>
                          <div>
                            <span className="font-medium">{niche.name}</span>
                            <span className="ml-2 text-xs text-muted-foreground">({niche.categoryName})</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value="other">
                      <div className="flex items-center gap-2 py-0.5 text-indigo-600 font-semibold">
                        <span>✨</span> Other (Type Custom Business Niche)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* If user selected Other */}
                {form.industry === 'other' && (
                  <div className="mt-3 space-y-1.5 animate-in fade-in slide-in-from-top-1">
                    <Label htmlFor="customIndustry" className="text-xs font-semibold text-indigo-900">
                      Specify Your Custom Niche / Industry:
                    </Label>
                    <Input
                      id="customIndustry"
                      value={form.customIndustry}
                      onChange={update('customIndustry')}
                      placeholder="e.g. Antique Restoration, Drone Surveying, Pet Daycare..."
                      className="h-11 border-indigo-200 bg-white text-sm"
                      required
                    />
                    <p className="text-[11px] text-indigo-700/80">
                      We will apply our Universal Business OS layout and give you direct access to the Module Marketplace to toggle any additional features you need.
                    </p>
                  </div>
                )}
              </div>

              {/* Plan selection */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="plan" className="text-xs font-medium">Subscription Plan</Label>
                  <Select value={form.plan} onValueChange={(v) => setForm((p) => ({ ...p, plan: v }))}>
                    <SelectTrigger className="h-11 border-slate-300 bg-white">
                      <SelectValue placeholder="Choose a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter — Free 14-day Trial (Then $19/mo)</SelectItem>
                      <SelectItem value="pro">Pro Growth — $49/mo (Custom domain & AI)</SelectItem>
                      <SelectItem value="enterprise">Enterprise — $149/mo (Full ERP & API)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Field
                  label="Password"
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={update('password')}
                  autoComplete="new-password"
                  placeholder="Min 8 characters"
                  minLength={8}
                />
              </div>

              <Button
                type="submit"
                className="mt-2 h-12 w-full bg-indigo-600 text-white font-semibold hover:bg-indigo-500 shadow-md shadow-indigo-600/20"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                {isSubmitting ? 'Provisioning specialized workspace…' : 'Launch My Specialized Workspace'}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-500">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
                Sign in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-50" aria-busy="true" />}>
      <RegisterForm />
    </Suspense>
  );
}

function Field({
  label,
  id,
  type = 'text',
  ...props
}: { label: string; id: string; type?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-slate-700">{label}</Label>
      <Input
        id={id}
        type={type}
        required
        className="h-11 border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-indigo-500 text-sm"
        {...props}
      />
    </div>
  );
}
