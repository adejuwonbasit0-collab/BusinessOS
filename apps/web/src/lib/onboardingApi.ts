import { api } from './api';

/**
 * Onboarding API.
 *
 * The wizard is resumable: every step is saved through `saveState`, so a user
 * who closes the browser can continue where they stopped.
 *
 * The methods unwrap the API envelope, so callers work with the payload
 * directly (`const state = await onboardingApi.getState()`).
 */
export const onboardingApi = {
  getState: async () => (await api.get('/onboarding/state')).data as OnboardingState,
  saveState: async (step: string, data: Record<string, any>) =>
    (await api.put('/onboarding/state', { step, data })).data as {
      step: string; data: Record<string, any>; completed: boolean;
    },
  recommend: async (description: string, businessName?: string) =>
    (await api.post('/onboarding/recommend', { description, businessName })).data as RecommendationResult,
  complete: async (payload: Record<string, any>) =>
    (await api.post('/onboarding/complete', payload)).data as CompleteResult,
  reset: async () => (await api.post('/onboarding/reset')).data as { step: string; completed: boolean },
};

export interface OnboardingStep {
  key: string;
  title: string;
  description: string;
}

export interface CatalogueIndustry {
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
}

export interface CatalogueCategory {
  key: string;
  name: string;
  icon: string;
  description: string;
  industries: CatalogueIndustry[];
}

export interface RegistryModule {
  key: string;
  name: string;
  category: string;
  icon: string;
  summary: string | null;
  status: string;
  route: string | null;
  is_core: boolean;
  depends_on: string[];
}

export interface OnboardingState {
  steps: OnboardingStep[];
  step: string;
  completed: boolean;
  data: Record<string, any>;
  business: Record<string, any>;
  industry: string | null;
  enabledModules: string[];
  catalogue: { categories: CatalogueCategory[]; presets: CatalogueIndustry[] };
  modules: RegistryModule[];
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

export interface RecommendationResult {
  description: string;
  recommendations: IndustryRecommendation[];
  suggestedModules: Array<{ module: string; because: string[] }>;
  confident: boolean;
}

export interface CompleteResult {
  tenant: Record<string, any>;
  enabledModules: string[];
  industry: string;
  preset: CatalogueIndustry | null;
  websiteCreated: boolean;
  skipped: { notImplemented: string[]; notInPlan: string[]; unknown: string[] };
  checklist: Array<{ key: string; label: string; href: string; done: boolean }>;
}
