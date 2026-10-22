import { db } from '../lib/database';
import { AppError } from '../lib/errors';

/**
 * The industry catalogue.
 *
 * The catalogue is data, not code: Super Admin can add categories, create
 * sub-categories, edit descriptions, assign icons, configure the recommended
 * modules and deactivate obsolete entries without touching application source
 * code.
 *
 * The recommendation engine in this file is deliberately *deterministic and
 * explainable*. It matches the words a business owner used against the
 * catalogue's names, keywords and aliases, and shows exactly which terms
 * caused a recommendation. When an AI provider is configured, its answer can
 * be layered on top — but it never replaces the deterministic result, so a
 * recommendation can always be traced back to the catalogue.
 */

export interface CataloguePreset {
  key: string;
  name: string;
  icon: string;
  description: string;
  category: string | null;
  default_modules: string[];
  terminology_overrides: Record<string, string>;
  search_keywords: string[];
  aliases: string[];
  dashboard_preset_key: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface IndustryRecommendation {
  industryKey: string;
  industryName: string;
  icon: string;
  category: string | null;
  confidence: number;
  matchedTerms: string[];
  modules: string[];
  rationale: string;
}

/** Words that carry no signal when describing a business. */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'for', 'to', 'in', 'on', 'with', 'that', 'this',
  'we', 'our', 'us', 'i', 'my', 'it', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'company', 'business', 'businesses', 'operate',
  'operates', 'operating', 'provides', 'provide', 'offers', 'offer', 'services', 'service',
]);

/**
 * Capabilities a business can describe, and the modules they imply.
 *
 * These are only *suggestions*: the catalogue's own `default_modules` always
 * take precedence, and the tenant confirms the final list before anything is
 * activated.
 */
const CAPABILITY_MODULES: Array<{ terms: string[]; modules: string[] }> = [
  { terms: ['sell', 'sells', 'selling', 'sale', 'sales', 'shop', 'store', 'retail', 'ecommerce', 'e-commerce', 'pos', 'point of sale'], modules: ['sales'] },
  { terms: ['stock', 'inventory', 'warehouse', 'product', 'products', 'catalogue', 'catalog', 'sku', 'material', 'materials', 'equipment'], modules: ['inventory'] },
  { terms: ['invoice', 'invoices', 'billing', 'bill', 'payment', 'payments', 'finance', 'financial', 'account', 'accounts', 'subscription', 'membership'], modules: ['finance', 'accounting'] },
  { terms: ['book', 'booking', 'bookings', 'appointment', 'appointments', 'reservation', 'reservations', 'schedule', 'slot', 'slots', 'session', 'sessions', 'class', 'classes', 'rent', 'rents', 'rental', 'hire'], modules: ['booking'] },
  { terms: ['staff', 'employee', 'employees', 'team', 'payroll', 'shift', 'shifts', 'leave', 'recruit', 'recruitment', 'teacher', 'teachers'], modules: ['hr'] },
  { terms: ['project', 'projects', 'task', 'tasks', 'deliverable', 'deliverables', 'milestone', 'inspection', 'inspections', 'maintenance', 'repair', 'maintain'], modules: ['projects'] },
  { terms: ['website', 'web', 'landing page', 'blog', 'site', 'online presence', 'public site'], modules: ['website'] },
  { terms: ['portal', 'portals', 'customer login', 'self-service', 'self service', 'customer area'], modules: ['portals'] },
  { terms: ['form', 'forms', 'application', 'applications', 'intake', 'survey', 'questionnaire'], modules: ['forms'] },
  { terms: ['document', 'documents', 'contract', 'contracts', 'proposal', 'proposals', 'policy', 'policies', 'manual', 'certificate'], modules: ['documents'] },
  { terms: ['automate', 'automated', 'automates', 'automation', 'workflow', 'workflows'], modules: ['workflows'] },
  { terms: ['report', 'reports', 'reporting', 'analytics', 'dashboard', 'kpi', 'insight'], modules: ['analytics'] },
  { terms: ['branch', 'branches', 'location', 'locations', 'multi-site', 'multi site', 'multi-branch'], modules: ['branches'] },
  { terms: ['message', 'messages', 'email', 'sms', 'notification', 'notifications', 'chat'], modules: ['communication'] },
  { terms: ['role', 'roles', 'permission', 'permissions', 'access control'], modules: ['roles'] },
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

/**
 * Reduces a word to its stem so that "rooms" and "room" are the same word.
 *
 * Without this, a description that says "we run a hotel with rooms" scored
 * lower than one that happened to contain the exact plural used in the
 * catalogue, which is how the right industry ended up ranked second.
 */
function stem(token: string): string {
  if (token.length > 4 && token.endsWith('ies')) return `${token.slice(0, -3)}y`;
  if (token.length > 4 && token.endsWith('es')) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  return token;
}

/** Escapes a term so it can be used inside a regular expression. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * How distinctive a word is across the catalogue.
 *
 * "dental" only appears in one industry, so it is a strong signal. "company"
 * appears in a dozen, so it barely tells us anything — without this, a
 * description like "we serve companies" matched half the catalogue.
 */
function buildTermWeights(presets: CataloguePreset[]): Map<string, number> {
  const documentFrequency = new Map<string, number>();

  for (const preset of presets) {
    const words = new Set<string>([
      ...tokenize(`${preset.name} ${preset.description || ''}`).map(stem),
      ...(preset.search_keywords || []).flatMap((k) => tokenize(k || '').map(stem)),
      ...(preset.aliases || []).flatMap((a) => tokenize(a || '').map(stem)),
    ]);
    for (const word of words) {
      documentFrequency.set(word, (documentFrequency.get(word) || 0) + 1);
    }
  }

  const weights = new Map<string, number>();
  for (const [word, frequency] of documentFrequency) {
    if (frequency <= 2) weights.set(word, 1);
    else if (frequency <= 5) weights.set(word, 0.6);
    else if (frequency <= 12) weights.set(word, 0.35);
    else weights.set(word, 0.2);
  }
  return weights;
}

/**
 * Matches a free-text description against the catalogue.
 *
 * Pure function — it takes the catalogue and the description and returns the
 * ranked recommendations. Keeping it free of database access makes it
 * directly testable.
 */
export function scoreIndustries(description: string, presets: CataloguePreset[]): IndustryRecommendation[] {
  const text = (description || '').toLowerCase().trim();
  if (!text) return [];

  const tokens = new Set(tokenize(text).map(stem));
  const weights = buildTermWeights(presets);
  const results: IndustryRecommendation[] = [];

  for (const preset of presets) {
    if (preset.is_active === false) continue;

    const matchedTerms: string[] = [];
    let score = 0;

    const name = (preset.name || '').toLowerCase();
    if (name && text.includes(name)) {
      score += 5;
      matchedTerms.push(preset.name);
    }

    // The preset's own vocabulary: its search keywords and its aliases. A
    // term counts when it appears as a whole word, or when every word of the
    // term is present in the description — "hotel" still matches "hotels".
    const vocabulary = [
      ...(preset.search_keywords || []),
      ...(preset.aliases || []),
    ];
    const seenVocabulary = new Set<string>();

    for (const term of vocabulary) {
      const termLower = (term || '').toLowerCase().trim();
      if (!termLower || seenVocabulary.has(termLower)) continue;
      seenVocabulary.add(termLower);

      const asWholeWord = new RegExp(`\\b${escapeRegex(termLower)}\\b`).test(text);
      const termStems = Array.from(new Set(tokenize(termLower).map(stem)));
      const allWordsPresent =
        termStems.length > 0 && termStems.every((t) => tokens.has(t));

      if (asWholeWord || allWordsPresent) {
        // The most distinctive word of the term decides how much it counts.
        const weight = Math.max(...termStems.map((t) => weights.get(t) ?? 1), 0.2);
        score += 2 * weight;
        matchedTerms.push(term);
      }
    }

    // Individual word overlap with the preset's name and description.
    const wordBag = new Set(tokenize(`${preset.name} ${preset.description || ''}`).map(stem));
    for (const token of tokens) {
      if (wordBag.has(token)) {
        score += weights.get(token) ?? 1;
        if (!matchedTerms.includes(token)) matchedTerms.push(token);
      }
    }

    if (score <= 0) continue;

    // The confidence saturates: a couple of independent signals make a match
    // believable, and the curve never claims certainty from a single word.
    const confidence = Math.min(1, Math.round((1 - Math.exp(-score / 2.5)) * 100) / 100);
    results.push({
      industryKey: preset.key,
      industryName: preset.name,
      icon: preset.icon,
      category: preset.category,
      confidence,
      matchedTerms: Array.from(new Set(matchedTerms)).slice(0, 8),
      modules: preset.default_modules || [],
      rationale: `Matched on: ${Array.from(new Set(matchedTerms)).slice(0, 5).join(', ')}`,
    });
  }

  return results.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}

/**
 * The modules implied by the capabilities the description mentions.
 *
 * Returned separately from the industry recommendation so the user can see
 * *why* a module is being proposed.
 */
export function suggestModules(description: string): Array<{ module: string; because: string[] }> {
  const text = (description || '').toLowerCase();
  if (!text) return [];

  const suggestions = new Map<string, string[]>();
  for (const capability of CAPABILITY_MODULES) {
    const matched = capability.terms.filter((term) => text.includes(term));
    if (!matched.length) continue;
    for (const module of capability.modules) {
      const list = suggestions.get(module) || [];
      suggestions.set(module, Array.from(new Set([...list, ...matched])));
    }
  }
  return Array.from(suggestions.entries()).map(([module, because]) => ({ module, because }));
}

/** All active presets, optionally filtered by category or search term. */
export async function listPresets(options: {
  search?: string;
  category?: string;
  includeInactive?: boolean;
} = {}): Promise<CataloguePreset[]> {
  const query = db('industry_presets').where({ is_custom: false });

  if (!options.includeInactive) query.where({ is_active: true });
  if (options.category) query.where({ category: options.category });

  if (options.search && options.search.trim()) {
    const term = options.search.trim();
    query.where((q) => {
      q.whereILike('name', `%${term}%`)
        .orWhereILike('description', `%${term}%`)
        .orWhere('key', 'ilike', `%${term}%`);
    });
  }

  const presets = await query.orderBy('sort_order').orderBy('name');
  return presets.map((preset: any) => ({
    ...preset,
    default_modules: preset.default_modules || [],
    search_keywords: preset.search_keywords || [],
    aliases: preset.aliases || [],
    terminology_overrides: preset.terminology_overrides || {},
  }));
}

/** The catalogue grouped by category, for the onboarding selector. */
export async function listCatalogue(options: { search?: string; category?: string } = {}) {
  const [categories, presets] = await Promise.all([
    db('industry_categories').where({ is_active: true }).orderBy('sort_order'),
    listPresets(options),
  ]);

  const grouped = new Map<string, any>();
  for (const category of categories as any[]) {
    grouped.set(category.key, { ...category, industries: [] as any[] });
  }
  for (const preset of presets) {
    const bucket = grouped.get(preset.category || '');
    if (bucket) bucket.industries.push(preset);
    else grouped.set(`uncategorised:${preset.category || 'other'}`, { key: preset.category || 'other', name: preset.category || 'Other', industries: [preset] });
  }

  return { categories: Array.from(grouped.values()), presets };
}

/** A single preset by key, including deactivated ones (for admin tooling). */
export async function getPreset(key: string): Promise<CataloguePreset | null> {
  const preset = await db('industry_presets').where({ key, is_custom: false }).first();
  if (!preset) return null;
  return {
    ...preset,
    default_modules: preset.default_modules || [],
    search_keywords: preset.search_keywords || [],
    aliases: preset.aliases || [],
    terminology_overrides: preset.terminology_overrides || {},
  };
}

/**
 * Applies a preset to a tenant: industry, module set, terminology and the
 * dashboard preset that drives the navigation.
 */
export async function applyPreset(
  tenantId: string,
  preset: CataloguePreset,
  options: { modules?: string[]; additionalModules?: string[] } = {},
): Promise<string[]> {
  const requested = options.modules && options.modules.length ? options.modules : preset.default_modules || [];

  // Always keep the modules a preset depends on.
  const moduleKeys = new Set<string>(requested);
  const registry = await db('module_registry').whereIn('key', Array.from(moduleKeys));
  for (const entry of registry as any[]) {
    for (const dependency of entry.depends_on || []) moduleKeys.add(dependency);
  }
  for (const extra of options.additionalModules || []) moduleKeys.add(extra);

  // Core modules are always present.
  const coreModules = await db('module_registry').where({ is_core: true, is_active: true });
  for (const entry of coreModules as any[]) moduleKeys.add(entry.key);

  const finalModules = Array.from(moduleKeys);

  await db('tenants').where({ id: tenantId }).update({
    industry: preset.key,
    enabled_modules: JSON.stringify(finalModules),
    dashboard_preset_key: preset.dashboard_preset_key || 'general',
    settings: db.raw('settings || ?::jsonb', [
      JSON.stringify({ terminologyOverrides: preset.terminology_overrides || {} }),
    ]),
    updated_at: new Date(),
  });

  return finalModules;
}

/**
 * Ensures a module key exists in the registry before a tenant can activate
 * it — activating an unknown module would leave the dashboard pointing at a
 * screen that does not exist.
 */
export async function assertModulesExist(moduleKeys: string[]): Promise<void> {
  if (!moduleKeys.length) return;
  const known = await db('module_registry').whereIn('key', moduleKeys).pluck('key');
  const unknown = moduleKeys.filter((key) => !known.includes(key));
  if (unknown.length) {
    throw new AppError(`Unknown module(s): ${unknown.join(', ')}`, 400, 'UNKNOWN_MODULE');
  }
}
