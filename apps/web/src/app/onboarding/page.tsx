'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle, ArrowLeft, ArrowRight, Boxes, Briefcase, Building2, Calculator,
  Calendar, Check, ClipboardList, FileText, Globe, Kanban, Loader2, MessageSquare,
  Package, PartyPopper, Rocket, Search, ShoppingCart, Sparkles, Users2, Zap,
} from 'lucide-react';
import {
  CatalogueIndustry, CompleteResult, OnboardingState, RecommendationResult,
  onboardingApi,
} from '@/lib/onboardingApi';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

/**
 * The onboarding wizard.
 *
 * It is resumable on purpose: every answer is written to the server as soon
 * as it is given, so closing the browser mid-way through loses nothing. The
 * user picks what they actually need, reviews the exact configuration that is
 * about to be applied, and only then is anything activated.
 */

const COUNTRIES = [
  'United Kingdom', 'United States', 'Canada', 'Ireland', 'Australia', 'New Zealand',
  'Nigeria', 'Kenya', 'Ghana', 'South Africa', 'Egypt', 'Morocco', 'United Arab Emirates',
  'Saudi Arabia', 'Qatar', 'India', 'Pakistan', 'Bangladesh', 'Singapore', 'Malaysia',
  'Germany', 'France', 'Spain', 'Portugal', 'Italy', 'Netherlands', 'Poland', 'Sweden',
];

const CURRENCIES = [
  { code: 'GBP', label: 'GBP — Pound sterling' },
  { code: 'USD', label: 'USD — US dollar' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'CAD', label: 'CAD — Canadian dollar' },
  { code: 'AUD', label: 'AUD — Australian dollar' },
  { code: 'NZD', label: 'NZD — New Zealand dollar' },
  { code: 'AED', label: 'AED — UAE dirham' },
  { code: 'SAR', label: 'SAR — Saudi riyal' },
  { code: 'ZAR', label: 'ZAR — South African rand' },
  { code: 'NGN', label: 'NGN — Nigerian naira' },
  { code: 'KES', label: 'KES — Kenyan shilling' },
  { code: 'INR', label: 'INR — Indian rupee' },
  { code: 'PKR', label: 'PKR — Pakistani rupee' },
  { code: 'JPY', label: 'JPY — Japanese yen' },
];

const TIMEZONES = [
  'UTC', 'Europe/London', 'Europe/Dublin', 'Europe/Lisbon', 'Europe/Paris',
  'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome', 'America/New_York',
  'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Toronto',
  'Africa/Lagos', 'Africa/Nairobi', 'Africa/Johannesburg', 'Africa/Cairo',
  'Africa/Casablanca', 'Asia/Dubai', 'Asia/Riyadh', 'Asia/Karachi', 'Asia/Kolkata',
  'Asia/Dhaka', 'Asia/Singapore', 'Asia/Hong_Kong', 'Asia/Tokyo',
  'Australia/Sydney', 'Australia/Melbourne', 'Pacific/Auckland',
];

const STAFF_SIZES = [
  { value: '1', label: 'Just me' },
  { value: '2-10', label: '2–10 people' },
  { value: '11-50', label: '11–50 people' },
  { value: '51-200', label: '51–200 people' },
  { value: '201-500', label: '201–500 people' },
  { value: '500+', label: 'More than 500' },
];

const LOCATION_COUNTS = [
  { value: '1', label: 'One location' },
  { value: '2-5', label: '2–5 locations' },
  { value: '6-20', label: '6–20 locations' },
  { value: '20+', label: 'More than 20' },
];

const SELL_OPTIONS = [
  { value: 'products', label: 'Physical products', hint: 'Stock, catalogue, orders' },
  { value: 'services', label: 'Services', hint: 'Jobs, work orders, quotes' },
  { value: 'subscriptions', label: 'Subscriptions', hint: 'Recurring billing' },
  { value: 'bookings', label: 'Appointments', hint: 'Calendar and availability' },
  { value: 'rentals', label: 'Rentals', hint: 'Hire, let, per-day rates' },
  { value: 'food', label: 'Food and drink', hint: 'Menus, tables, orders' },
];

type CapabilityKey =
  | 'needsSales' | 'needsInventory' | 'needsAccounting' | 'needsProjects'
  | 'needsBooking' | 'needsPortal' | 'needsForms' | 'needsWebsite'
  | 'needsHr' | 'needsDocuments' | 'needsAutomation';

/**
 * The capabilities the user can tick, and the module each one turns on.
 * The mapping is the same one the API applies, so the review screen can show
 * exactly what is going to be activated.
 */
const CAPABILITIES: Array<{
  key: CapabilityKey; label: string; description: string; module: string;
}> = [
  { key: 'needsSales', label: 'Sell', description: 'Orders, quotes and invoices', module: 'sales' },
  { key: 'needsInventory', label: 'Track stock', description: 'Products, stock levels and suppliers', module: 'inventory' },
  { key: 'needsAccounting', label: 'Accounting', description: 'Chart of accounts, ledgers and VAT', module: 'accounting' },
  { key: 'needsProjects', label: 'Projects', description: 'Boards, tasks and delivery', module: 'projects' },
  { key: 'needsBooking', label: 'Bookings', description: 'Calendar, availability and reservations', module: 'booking' },
  { key: 'needsPortal', label: 'Customer portal', description: 'Let customers log in and self-serve', module: 'portals' },
  { key: 'needsForms', label: 'Forms and requests', description: 'Enquiries, intake and approvals', module: 'forms' },
  { key: 'needsWebsite', label: 'Public website', description: 'A site on your own domain', module: 'website' },
  { key: 'needsHr', label: 'People and payroll', description: 'Staff records, leave and payslips', module: 'hr' },
  { key: 'needsDocuments', label: 'Documents', description: 'Contracts, templates and files', module: 'documents' },
  { key: 'needsAutomation', label: 'Automation', description: 'Triggers and scheduled workflows', module: 'workflows' },
];

const MODULE_ICONS: Record<string, typeof Boxes> = {
  crm: Users2, sales: ShoppingCart, inventory: Package, erp: Boxes, hr: Briefcase,
  projects: Kanban, booking: Calendar, documents: FileText, accounting: Calculator,
  workflows: Zap, portals: Globe, forms: ClipboardList, website: Globe,
  communication: MessageSquare, ai: Sparkles,
};

interface WizardForm {
  businessName: string;
  legalName: string;
  tradingName: string;
  description: string;
  country: string;
  currency: string;
  timezone: string;
  staffCount: string;
  locationCount: string;
  registrationNumber: string;
  sells: string[];
  needsSales: boolean;
  needsInventory: boolean;
  needsAccounting: boolean;
  needsProjects: boolean;
  needsBooking: boolean;
  needsPortal: boolean;
  needsForms: boolean;
  needsWebsite: boolean;
  needsHr: boolean;
  needsDocuments: boolean;
  needsAutomation: boolean;
  extraModules: string[];
  industryKey: string;
  customIndustryName: string;
  customIndustryDescription: string;
  websiteEnabled: boolean;
}

const EMPTY_FORM: WizardForm = {
  businessName: '', legalName: '', tradingName: '', description: '',
  country: '', currency: '', timezone: '', staffCount: '', locationCount: '',
  registrationNumber: '', sells: [],
  needsSales: false, needsInventory: false, needsAccounting: false, needsProjects: false,
  needsBooking: false, needsPortal: false, needsForms: false, needsWebsite: false,
  needsHr: false, needsDocuments: false, needsAutomation: false,
  extraModules: [], industryKey: '', customIndustryName: '', customIndustryDescription: '',
  websiteEnabled: false,
};

function hydrate(state: OnboardingState, saved: Record<string, any>): WizardForm {
  const business = state.business || {};
  const industryKey =
    saved.industryKey ??
    (state.industry && !state.industry.startsWith('custom:') ? state.industry : '');

  return {
    ...EMPTY_FORM,
    businessName: saved.businessName ?? business.name ?? '',
    legalName: saved.legalName ?? business.legalName ?? '',
    tradingName: saved.tradingName ?? business.tradingName ?? '',
    description: saved.description ?? business.description ?? '',
    country: saved.country ?? business.country ?? '',
    currency: saved.currency ?? business.currency ?? '',
    timezone: saved.timezone ?? business.timezone ?? '',
    staffCount: saved.staffCount ?? '',
    locationCount: saved.locationCount ?? '',
    registrationNumber: saved.registrationNumber ?? '',
    sells: Array.isArray(saved.sells) ? saved.sells : [],
    needsSales: saved.needsSales ?? false,
    needsInventory: saved.needsInventory ?? false,
    needsAccounting: saved.needsAccounting ?? false,
    needsProjects: saved.needsProjects ?? false,
    needsBooking: saved.needsBooking ?? false,
    needsPortal: saved.needsPortal ?? false,
    needsForms: saved.needsForms ?? false,
    needsWebsite: saved.needsWebsite ?? false,
    needsHr: saved.needsHr ?? false,
    needsDocuments: saved.needsDocuments ?? false,
    needsAutomation: saved.needsAutomation ?? false,
    extraModules: Array.isArray(saved.extraModules) ? saved.extraModules : [],
    industryKey,
    customIndustryName: saved.customIndustryName ?? '',
    customIndustryDescription: saved.customIndustryDescription ?? '',
    websiteEnabled: saved.websiteEnabled ?? false,
  };
}

/** The answers that belong to each step, written to the server as they change. */
function stepPayload(step: string, form: WizardForm): Record<string, any> {
  switch (step) {
    case 'business':
      return {
        businessName: form.businessName,
        legalName: form.legalName,
        tradingName: form.tradingName,
        description: form.description,
      };
    case 'industry':
      return {
        industryKey: form.industryKey,
        customIndustryName: form.customIndustryName,
        customIndustryDescription: form.customIndustryDescription,
      };
    case 'profile':
      return {
        country: form.country,
        currency: form.currency,
        timezone: form.timezone,
        staffCount: form.staffCount,
        locationCount: form.locationCount,
        registrationNumber: form.registrationNumber,
      };
    case 'capabilities':
      return {
        sells: form.sells,
        needsSales: form.needsSales,
        needsInventory: form.needsInventory,
        needsAccounting: form.needsAccounting,
        needsProjects: form.needsProjects,
        needsBooking: form.needsBooking,
        needsPortal: form.needsPortal,
        needsForms: form.needsForms,
        needsWebsite: form.needsWebsite,
        needsHr: form.needsHr,
        needsDocuments: form.needsDocuments,
        needsAutomation: form.needsAutomation,
        extraModules: form.extraModules,
        websiteEnabled: form.websiteEnabled,
      };
    default:
      return {};
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const tenant = useAuthStore((s) => s.tenant);
  const updateTenant = useAuthStore((s) => s.updateTenant);

  const [state, setState] = useState<OnboardingState | null>(null);
  const [form, setForm] = useState<WizardForm>(EMPTY_FORM);
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [industryMode, setIndustryMode] = useState<'catalogue' | 'other'>('catalogue');
  const [recommendation, setRecommendation] = useState<RecommendationResult | null>(null);
  const [recommending, setRecommending] = useState(false);
  const [result, setResult] = useState<CompleteResult | null>(null);

  const steps = state?.steps ?? [];
  const currentStep = steps[stepIndex];

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await onboardingApi.getState();
      if (data.completed) {
        router.replace('/dashboard');
        return;
      }
      setState(data);
      setForm(hydrate(data, data.data || {}));
      const index = data.steps.findIndex((s) => s.key === data.step);
      setStepIndex(index >= 0 ? index : 0);
    } catch (err: any) {
      setLoadError(err?.message || 'We could not load your setup. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const update = <K extends keyof WizardForm>(key: K, value: WizardForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const toggle = (key: keyof WizardForm) =>
    setForm((current) => ({ ...current, [key]: !current[key] }));

  // ── Derived state ──────────────────────────────────────────────────────────

  const selectedPreset: CatalogueIndustry | null = useMemo(() => {
    if (!state || !form.industryKey) return null;
    return state.catalogue.presets.find((p) => p.key === form.industryKey) ?? null;
  }, [state, form.industryKey]);

  const moduleByKey = useMemo(() => {
    const map = new Map<string, { key: string; name: string; icon: string; summary: string | null; status: string; route: string | null; is_core: boolean }>();
    state?.modules.forEach((m) => map.set(m.key, m));
    return map;
  }, [state]);

  const { activating, planned, unknownModules } = useMemo(() => {
    const keys = new Set<string>();
    selectedPreset?.default_modules?.forEach((k) => keys.add(k));
    CAPABILITIES.forEach((c) => {
      if ((form as any)[c.key]) keys.add(c.module);
    });
    form.extraModules.forEach((k) => keys.add(k));

    const all = Array.from(keys);
    return {
      activating: all.filter((k) => moduleByKey.has(k) && moduleByKey.get(k)!.status !== 'planned'),
      planned: all.filter((k) => moduleByKey.has(k) && moduleByKey.get(k)!.status === 'planned'),
      unknownModules: all.filter((k) => !moduleByKey.has(k)),
    };
  }, [selectedPreset, form, moduleByKey]);

  const optionalModules = useMemo(() => {
    if (!state) return [];
    const covered = new Set(CAPABILITIES.map((c) => c.module));
    return state.modules.filter(
      (m) => !m.is_core && m.status !== 'planned' && !covered.has(m.key),
    );
  }, [state]);

  const filteredCategories = useMemo(() => {
    if (!state) return [];
    const term = search.trim().toLowerCase();
    if (!term) return state.catalogue.categories;
    return state.catalogue.categories
      .map((category) => ({
        ...category,
        industries: category.industries.filter((industry) => {
          const haystack = [
            industry.name,
            industry.description,
            industry.key,
            category.name,
            ...(industry.search_keywords || []),
            ...(industry.aliases || []),
          ].join(' ').toLowerCase();
          return haystack.includes(term);
        }),
      }))
      .filter((category) => category.industries.length > 0);
  }, [state, search]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const persist = useCallback(async (step: string, payload: Record<string, any>) => {
    await onboardingApi.saveState(step, payload);
  }, []);

  const validate = (step: string): string => {
    switch (step) {
      case 'business':
        if (!form.businessName.trim()) return 'Please give your business a name.';
        if (!form.description.trim()) return 'Tell us in one line what your business does.';
        return '';
      case 'industry':
        if (industryMode === 'other') {
          if (!form.customIndustryName.trim()) return 'Give your industry a name.';
          return '';
        }
        if (!form.industryKey) return 'Pick an industry, or describe your business instead.';
        return '';
      case 'profile':
        if (!form.country) return 'Select the country your business operates in.';
        if (!form.currency) return 'Select the currency you use.';
        if (!form.timezone) return 'Select your time zone.';
        return '';
      default:
        return '';
    }
  };

  const goNext = async () => {
    if (!currentStep) return;
    const message = validate(currentStep.key);
    if (message) { setError(message); return; }

    setError('');
    setBusy(true);
    try {
      await persist(currentStep.key, stepPayload(currentStep.key, form));
      setStepIndex((index) => Math.min(index + 1, steps.length - 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err?.message || 'We could not save your progress. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const goBack = () => {
    setError('');
    setStepIndex((index) => Math.max(index - 1, 0));
  };

  const pickIndustry = async (key: string) => {
    update('industryKey', key);
    setIndustryMode('catalogue');
    setError('');
    if (!state) return;
    try {
      await persist('industry', { industryKey: key, customIndustryName: '', customIndustryDescription: '' });
    } catch {
      // A failed save is not fatal — the answer is kept locally and written
      // again when the user continues.
    }
  };

  const suggestIndustry = async () => {
    const description = form.customIndustryDescription.trim() || form.description.trim();
    if (!description) {
      setError('Describe what your business does so we can suggest an industry.');
      return;
    }
    setError('');
    setRecommending(true);
    try {
      const data = await onboardingApi.recommend(description, form.businessName);
      setRecommendation(data);
    } catch (err: any) {
      setError(err?.message || 'We could not work out an industry for that description.');
    } finally {
      setRecommending(false);
    }
  };

  const complete = async () => {
    const message = validate('industry');
    if (message) { setError(message); return; }

    setError('');
    setBusy(true);
    try {
      const useCustom = industryMode === 'other' && form.customIndustryName.trim();
      const payload = {
        industryKey: useCustom ? undefined : form.industryKey,
        customIndustry: useCustom
          ? { name: form.customIndustryName.trim(), description: form.customIndustryDescription.trim() }
          : undefined,
        businessProfile: {
          name: form.businessName.trim(),
          legalName: form.legalName.trim(),
          tradingName: form.tradingName.trim(),
          description: form.description.trim(),
          country: form.country,
          currency: form.currency,
          timezone: form.timezone,
          staffCount: form.staffCount,
          locationCount: form.locationCount,
          registrationNumber: form.registrationNumber.trim(),
        },
        capabilities: {
          sells: form.sells,
          needsSales: form.needsSales,
          needsInventory: form.needsInventory,
          needsAccounting: form.needsAccounting,
          needsProjects: form.needsProjects,
          needsBooking: form.needsBooking,
          needsPortal: form.needsPortal,
          needsForms: form.needsForms,
          needsWebsite: form.needsWebsite,
          needsHr: form.needsHr,
          needsDocuments: form.needsDocuments,
          needsAutomation: form.needsAutomation,
          extraModules: form.extraModules,
        },
        website: { enabled: form.websiteEnabled },
        onboardingData: {
          ...form,
          industryMode,
        },
      };

      const data = await onboardingApi.complete(payload);
      setResult(data);

      updateTenant({
        name: form.businessName.trim() || tenant?.name,
        industry: data.industry,
        enabledModules: data.enabledModules,
        onboardingCompleted: true,
        onboardingStep: 'done',
      });
    } catch (err: any) {
      setError(err?.message || 'We could not set up your workspace. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          <p className="text-sm">Loading your setup…</p>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
          <h1 className="mt-4 text-lg font-semibold text-slate-900">We could not load your setup</h1>
          <p className="mt-2 text-sm text-slate-500">{loadError}</p>
          <Button onClick={load} className="mt-6 bg-indigo-600 text-white hover:bg-indigo-500">Try again</Button>
        </div>
      </main>
    );
  }

  if (result) {
    return <SetupComplete result={result} onContinue={() => router.push('/dashboard')} />;
  }

  const businessName = form.businessName || tenant?.name || 'Your workspace';

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-sm font-black text-white">
              {businessName.charAt(0).toUpperCase() || 'N'}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{businessName}</p>
              <p className="truncate text-xs text-slate-500">Workspace setup</p>
            </div>
          </div>
          <p className="hidden text-xs text-slate-500 sm:block">Progress is saved as you go</p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Stepper */}
        <nav aria-label="Setup progress" className="mb-8">
          <Progress value={((stepIndex + 1) / Math.max(steps.length, 1)) * 100} className="h-1.5" />
          <ol className="mt-4 flex flex-wrap gap-x-2 gap-y-3">
            {steps.map((step, index) => {
              const done = index < stepIndex;
              const current = index === stepIndex;
              return (
                <li key={step.key} className="flex items-center gap-2">
                  <span
                    className={cn(
                      'grid h-6 w-6 place-items-center rounded-full text-xs font-semibold',
                      done && 'bg-indigo-600 text-white',
                      current && 'bg-indigo-50 text-indigo-700 ring-2 ring-indigo-600',
                      !done && !current && 'bg-slate-100 text-slate-400',
                    )}
                    aria-current={current ? 'step' : undefined}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                  </span>
                  <span className={cn('text-sm', current ? 'font-semibold text-slate-900' : 'text-slate-500')}>
                    {step.title}
                  </span>
                </li>
              );
            })}
          </ol>
        </nav>

        {error && (
          <Alert variant="destructive" className="mb-6 border-red-200 bg-red-50 text-red-700">
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <header className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {currentStep?.title}
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">{currentStep?.description}</p>
          </header>

          {currentStep?.key === 'business' && (
            <BusinessStep form={form} update={update} />
          )}
          {currentStep?.key === 'industry' && (
            <IndustryStep
              form={form}
              update={update}
              mode={industryMode}
              setMode={setIndustryMode}
              categories={filteredCategories}
              search={search}
              setSearch={setSearch}
              onPick={pickIndustry}
              recommendation={recommendation}
              recommending={recommending}
              onSuggest={suggestIndustry}
              onPickRecommendation={(key) => pickIndustry(key)}
            />
          )}
          {currentStep?.key === 'profile' && (
            <ProfileStep form={form} update={update} />
          )}
          {currentStep?.key === 'capabilities' && (
            <CapabilitiesStep
              form={form}
              update={update}
              toggle={toggle}
              optionalModules={optionalModules}
            />
          )}
          {currentStep?.key === 'review' && (
            <ReviewStep
              form={form}
              businessName={businessName}
              selectedPreset={selectedPreset}
              industryMode={industryMode}
              activating={activating}
              planned={planned}
              unknownModules={unknownModules}
              moduleByKey={moduleByKey}
              onEdit={(key) => setStepIndex(steps.findIndex((s) => s.key === key))}
              planName={tenant?.planName}
              update={update}
            />
          )}

          <footer className="mt-10 flex items-center justify-between gap-3 border-t border-slate-200 pt-6">
            <Button
              variant="ghost"
              onClick={goBack}
              disabled={stepIndex === 0 || busy}
              className="text-slate-600"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />Back
            </Button>

            {currentStep?.key === 'review' ? (
              <Button
                onClick={complete}
                disabled={busy}
                className="bg-indigo-600 text-white hover:bg-indigo-500"
              >
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
                {busy ? 'Setting up…' : 'Start my workspace'}
              </Button>
            ) : (
              <Button
                onClick={goNext}
                disabled={busy}
                className="bg-indigo-600 text-white hover:bg-indigo-500"
              >
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                Continue
              </Button>
            )}
          </footer>
        </section>
      </div>
    </main>
  );
}

// ── Step 1: business ─────────────────────────────────────────────────────────

function BusinessStep({
  form, update,
}: {
  form: WizardForm;
  update: <K extends keyof WizardForm>(key: K, value: WizardForm[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="businessName">Business name</Label>
        <Input
          id="businessName"
          value={form.businessName}
          onChange={(e) => update('businessName', e.target.value)}
          placeholder="Prosperous Royal Hotel"
          className="h-11 border-slate-300"
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="legalName">Legal name <span className="font-normal text-slate-400">(optional)</span></Label>
          <Input
            id="legalName"
            value={form.legalName}
            onChange={(e) => update('legalName', e.target.value)}
            placeholder="As registered with the authorities"
            className="h-11 border-slate-300"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tradingName">Trading name <span className="font-normal text-slate-400">(optional)</span></Label>
          <Input
            id="tradingName"
            value={form.tradingName}
            onChange={(e) => update('tradingName', e.target.value)}
            placeholder="The name you trade under"
            className="h-11 border-slate-300"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">What does your business do?</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          rows={4}
          placeholder="We run a boutique hotel with a restaurant, spa and conference rooms in the centre of Lagos."
          className="border-slate-300"
        />
        <p className="text-xs text-slate-500">
          One or two sentences is enough. This is what the industry suggestion and the
          dashboard layout are built from.
        </p>
      </div>
    </div>
  );
}

// ── Step 2: industry ─────────────────────────────────────────────────────────

function IndustryStep({
  form, update, mode, setMode, categories, search, setSearch, onPick,
  recommendation, recommending, onSuggest, onPickRecommendation,
}: {
  form: WizardForm;
  update: <K extends keyof WizardForm>(key: K, value: WizardForm[K]) => void;
  mode: 'catalogue' | 'other';
  setMode: (mode: 'catalogue' | 'other') => void;
  categories: any[];
  search: string;
  setSearch: (value: string) => void;
  onPick: (key: string) => void;
  recommendation: RecommendationResult | null;
  recommending: boolean;
  onSuggest: () => void;
  onPickRecommendation: (key: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode('catalogue')}
          className={cn(
            'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
            mode === 'catalogue'
              ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
              : 'border-slate-200 text-slate-600 hover:border-slate-300',
          )}
        >
          Pick from the catalogue
        </button>
        <button
          type="button"
          onClick={() => setMode('other')}
          className={cn(
            'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
            mode === 'other'
              ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
              : 'border-slate-200 text-slate-600 hover:border-slate-300',
          )}
        >
          Other — describe my business
        </button>
      </div>

      {mode === 'catalogue' ? (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search industries — try “hotel”, “clinic”, “restaurant”"
              aria-label="Search industries"
              className="h-11 border-slate-300 pl-9"
            />
          </div>

          {categories.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
              No industry matches “{search}”. Use “Other — describe my business” and we will
              set it up for you.
            </p>
          ) : (
            <div className="space-y-8">
              {categories.map((category) => (
                <div key={category.key}>
                  <div className="mb-3 flex items-center gap-2">
                    <span aria-hidden className="text-base">{category.icon}</span>
                    <h3 className="text-sm font-semibold text-slate-900">{category.name}</h3>
                    <span className="text-xs text-slate-400">{category.industries.length}</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {category.industries.map((industry: CatalogueIndustry) => {
                      const selected = form.industryKey === industry.key;
                      return (
                        <button
                          type="button"
                          key={industry.key}
                          onClick={() => onPick(industry.key)}
                          aria-pressed={selected}
                          className={cn(
                            'flex items-start gap-3 rounded-xl border p-4 text-left transition-colors',
                            selected
                              ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                          )}
                        >
                          <span aria-hidden className="text-xl leading-none">{industry.icon}</span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-slate-900">{industry.name}</span>
                              {selected && <Check className="h-4 w-4 shrink-0 text-indigo-600" />}
                            </span>
                            {industry.description && (
                              <span className="mt-1 block text-xs leading-5 text-slate-500">{industry.description}</span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="customIndustryName">What kind of business is it?</Label>
            <Input
              id="customIndustryName"
              value={form.customIndustryName}
              onChange={(e) => update('customIndustryName', e.target.value)}
              placeholder="Boutique hospitality"
              className="h-11 border-slate-300"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customIndustryDescription">Describe what you do</Label>
            <Textarea
              id="customIndustryDescription"
              value={form.customIndustryDescription}
              onChange={(e) => update('customIndustryDescription', e.target.value)}
              rows={4}
              placeholder="We host weddings and corporate retreats on a country estate."
              className="border-slate-300"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={onSuggest}
            disabled={recommending}
            className="border-slate-300"
          >
            {recommending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {recommending ? 'Working it out…' : 'Suggest an industry'}
          </Button>

          {recommendation && (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
              {recommendation.recommendations.length === 0 ? (
                <p className="text-sm text-slate-600">
                  We could not match that description to a known industry. We will set your
                  workspace up with the name and description you gave — you can change it later
                  in Settings.
                </p>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-700">
                    {recommendation.confident
                      ? 'These look like a match. Pick the closest one:'
                      : 'We are not confident about these — pick the closest one, or keep your own description:'}
                  </p>
                  <div className="space-y-3">
                    {recommendation.recommendations.map((item) => (
                      <button
                        type="button"
                        key={item.industryKey}
                        onClick={() => onPickRecommendation(item.industryKey)}
                        className="flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-indigo-400"
                      >
                        <span aria-hidden className="text-xl leading-none">{item.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">{item.industryName}</span>
                            <Badge variant="secondary" className="text-[10px]">
                              {Math.round(item.confidence * 100)}% match
                            </Badge>
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-slate-500">{item.rationale}</span>
                          {item.matchedTerms.length > 0 && (
                            <span className="mt-2 flex flex-wrap gap-1">
                              {item.matchedTerms.map((term) => (
                                <span key={term} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                                  {term}
                                </span>
                              ))}
                            </span>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Step 3: profile ──────────────────────────────────────────────────────────

function ProfileStep({
  form, update,
}: {
  form: WizardForm;
  update: <K extends keyof WizardForm>(key: K, value: WizardForm[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <select
            id="country"
            value={form.country}
            onChange={(e) => update('country', e.target.value)}
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
          >
            <option value="">Select a country</option>
            {COUNTRIES.map((country) => <option key={country} value={country}>{country}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <select
            id="currency"
            value={form.currency}
            onChange={(e) => update('currency', e.target.value)}
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
          >
            <option value="">Select a currency</option>
            {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="timezone">Time zone</Label>
          <select
            id="timezone"
            value={form.timezone}
            onChange={(e) => update('timezone', e.target.value)}
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
          >
            <option value="">Select a time zone</option>
            {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="staffCount">How many people work here?</Label>
          <select
            id="staffCount"
            value={form.staffCount}
            onChange={(e) => update('staffCount', e.target.value)}
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
          >
            <option value="">Select a size</option>
            {STAFF_SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="locationCount">How many locations?</Label>
          <select
            id="locationCount"
            value={form.locationCount}
            onChange={(e) => update('locationCount', e.target.value)}
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
          >
            <option value="">Select a number</option>
            {LOCATION_COUNTS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="registrationNumber">Company registration number <span className="font-normal text-slate-400">(optional)</span></Label>
          <Input
            id="registrationNumber"
            value={form.registrationNumber}
            onChange={(e) => update('registrationNumber', e.target.value)}
            placeholder="RC 123456"
            className="h-11 border-slate-300"
          />
        </div>
      </div>
    </div>
  );
}

// ── Step 4: capabilities ─────────────────────────────────────────────────────

function CapabilitiesStep({
  form, update, toggle, optionalModules,
}: {
  form: WizardForm;
  update: <K extends keyof WizardForm>(key: K, value: WizardForm[K]) => void;
  toggle: (key: keyof WizardForm) => void;
  optionalModules: any[];
}) {  const toggleSell = (value: string) => {
    const next = form.sells.includes(value)
      ? form.sells.filter((s) => s !== value)
      : [...form.sells, value];
    update('sells', next);
  };

  const toggleExtra = (key: string) => {
    const next = form.extraModules.includes(key)
      ? form.extraModules.filter((m) => m !== key)
      : [...form.extraModules, key];
    update('extraModules', next);
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">What do you sell?</h3>
        <p className="mt-1 text-sm text-slate-500">Pick everything that applies.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {SELL_OPTIONS.map((option) => {
            const checked = form.sells.includes(option.value);
            return (
              <label
                key={option.value}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors',
                  checked ? 'border-indigo-600 bg-indigo-50/60' : 'border-slate-200 hover:border-slate-300',
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggleSell(option.value)}
                  className="mt-0.5"
                  aria-label={option.label}
                />
                <span>
                  <span className="block text-sm font-medium text-slate-900">{option.label}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{option.hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-900">What do you need the system to do?</h3>
        <p className="mt-1 text-sm text-slate-500">We only activate what you pick.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {CAPABILITIES.map((capability) => {
            const checked = Boolean((form as any)[capability.key]);
            return (
              <label
                key={capability.key}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors',
                  checked ? 'border-indigo-600 bg-indigo-50/60' : 'border-slate-200 hover:border-slate-300',
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggle(capability.key)}
                  className="mt-0.5"
                  aria-label={capability.label}
                />
                <span>
                  <span className="block text-sm font-medium text-slate-900">{capability.label}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{capability.description}</span>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {optionalModules.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Anything else?</h3>
          <p className="mt-1 text-sm text-slate-500">Optional modules you can switch on now or later.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {optionalModules.map((module) => {
              const checked = form.extraModules.includes(module.key);
              const Icon = MODULE_ICONS[module.key] ?? Boxes;
              return (
                <label
                  key={module.key}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors',
                    checked ? 'border-indigo-600 bg-indigo-50/60' : 'border-slate-200 hover:border-slate-300',
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleExtra(module.key)}
                    className="mt-0.5"
                    aria-label={module.name}
                  />
                  <span className="flex min-w-0 items-start gap-2">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <span>
                      <span className="block text-sm font-medium text-slate-900">{module.name}</span>
                      {module.summary && (
                        <span className="mt-0.5 block text-xs text-slate-500">{module.summary}</span>
                      )}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Step 5: review ───────────────────────────────────────────────────────────

function ReviewStep({
  form, businessName, selectedPreset, industryMode, activating, planned, unknownModules,
  moduleByKey, onEdit, planName, update,
}: {
  form: WizardForm;
  businessName: string;
  selectedPreset: CatalogueIndustry | null;
  industryMode: 'catalogue' | 'other';
  activating: string[];
  planned: string[];
  unknownModules: string[];
  moduleByKey: Map<string, any>;
  onEdit: (step: string) => void;
  planName?: string;
  update: <K extends keyof WizardForm>(key: K, value: WizardForm[K]) => void;
}) {
  const industryLabel =
    industryMode === 'other'
      ? form.customIndustryName || 'Your own industry'
      : selectedPreset?.name || 'Not selected';

  const rows: Array<{ label: string; value: string; step: string }> = [
    { label: 'Business', value: businessName, step: 'business' },
    { label: 'Industry', value: industryLabel, step: 'industry' },
    {
      label: 'Location',
      value: [form.country, form.currency, form.timezone].filter(Boolean).join(' · ') || 'Not set',
      step: 'profile',
    },
    {
      label: 'Team',
      value: [
        STAFF_SIZES.find((s) => s.value === form.staffCount)?.label,
        LOCATION_COUNTS.find((l) => l.value === form.locationCount)?.label,
      ].filter(Boolean).join(' · ') || 'Not set',
      step: 'profile',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-5">
        <h3 className="text-sm font-semibold text-indigo-900">Here is what we are about to set up</h3>
        <p className="mt-1.5 text-sm leading-6 text-indigo-800/90">
          Nothing has been activated yet. When you press “Start my workspace”, we switch on the
          modules below for {businessName} and build the dashboard around{' '}
          {industryMode === 'other' ? 'your industry' : industryLabel}. You can change any of it
          later in Settings.
        </p>
      </div>

      <dl className="divide-y divide-slate-200 rounded-xl border border-slate-200">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 px-4 py-3">
            <dt className="text-sm text-slate-500">{row.label}</dt>
            <dd className="flex items-center gap-3 text-sm font-medium text-slate-900">
              {row.value}
              <button
                type="button"
                onClick={() => onEdit(row.step)}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
              >
                Edit
              </button>
            </dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-sm text-slate-500">Plan</dt>
          <dd className="text-sm font-medium text-slate-900">{planName || 'Starter'}</dd>
        </div>
      </dl>

      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          {activating.length} module{activating.length === 1 ? '' : 's'} will be activated
        </h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {activating.map((key) => {
            const module = moduleByKey.get(key);
            const Icon = MODULE_ICONS[key] ?? Boxes;
            return (
              <div key={key} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-900">{module?.name ?? key}</span>
                  {module?.summary && (
                    <span className="mt-0.5 block text-xs text-slate-500">{module.summary}</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {(planned.length > 0 || unknownModules.length > 0) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="text-sm font-semibold text-amber-900">Not activated</h3>
          <p className="mt-1.5 text-sm leading-6 text-amber-900/80">
            {planned.length > 0 && (
              <>These are still being built, so they stay switched off for now:{' '}
                <strong className="font-medium">{planned.map((k) => moduleByKey.get(k)?.name ?? k).join(', ')}</strong>. </>
            )}
            {unknownModules.length > 0 && (
              <> These are not part of the product yet:{' '}
                <strong className="font-medium">{unknownModules.join(', ')}</strong>.</>
            )}
          </p>
        </div>
      )}

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4">
        <Checkbox
          checked={form.websiteEnabled}
          onCheckedChange={() => update('websiteEnabled', !form.websiteEnabled)}
          className="mt-0.5"
          aria-label="Create a website"
        />
        <span>
          <span className="block text-sm font-medium text-slate-900">Create my website</span>
          <span className="mt-0.5 block text-xs text-slate-500">
            We build a draft page for {businessName} that you can publish once it looks right.
          </span>
        </span>
      </label>
    </div>
  );
}

// ── After the setup ──────────────────────────────────────────────────────────

function SetupComplete({
  result, onContinue,
}: {
  result: CompleteResult;
  onContinue: () => void;
}) {
  const skipped = [
    ...result.skipped.notImplemented.map((key) => ({ key, reason: 'still being built' })),
    ...result.skipped.notInPlan.map((key) => ({ key, reason: 'not included in your plan' })),
    ...result.skipped.unknown.map((key) => ({ key, reason: 'not available' })),
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
            <PartyPopper className="h-6 w-6" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">
            Your workspace is ready
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            We activated {result.enabledModules.length} module
            {result.enabledModules.length === 1 ? '' : 's'} and set the dashboard up for{' '}
            <strong className="font-medium text-slate-900">{result.industry}</strong>.
          </p>

          <div className="mt-8">
            <h2 className="text-sm font-semibold text-slate-900">Next steps</h2>
            <ul className="mt-3 space-y-2">
              {result.checklist.map((item) => (
                <li
                  key={item.key}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3"
                >
                  <span
                    className={cn(
                      'grid h-5 w-5 shrink-0 place-items-center rounded-full',
                      item.done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400',
                    )}
                  >
                    {item.done ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                  </span>
                  <span className="text-sm text-slate-700">{item.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {skipped.length > 0 && (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h2 className="text-sm font-semibold text-amber-900">Not activated</h2>
              <ul className="mt-2 space-y-1">
                {skipped.map((item) => (
                  <li key={item.key} className="text-sm text-amber-900/80">
                    <span className="font-medium">{item.key}</span> — {item.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button onClick={onContinue} className="mt-8 w-full bg-indigo-600 text-white hover:bg-indigo-500">
            <Building2 className="mr-2 h-4 w-4" />
            Go to my dashboard
          </Button>
        </div>
      </div>
    </main>
  );
}
