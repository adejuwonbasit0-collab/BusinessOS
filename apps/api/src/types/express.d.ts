import 'express';

declare module 'express' {
  interface Request {
    user?: {
      id: string; tenant_id: string; email: string; first_name: string; last_name: string;
      display_name: string; avatar_url: string | null; role: string; status: string;
      is_email_verified: boolean; two_factor_enabled: boolean; timezone: string; locale: string;
      preferences: Record<string, any>; department_id?: string; branch_id?: string;
      created_at: Date; updated_at: Date;
    };
    tenant?: {
      id: string; name: string; slug: string; subdomain: string; custom_domain: string | null;
      status: string; plan_id: string; plan_name: string; plan_slug: string; plan_features: Record<string, any>;
      industry: string | null; enabled_modules: string[]; primary_color: string; secondary_color: string;
      timezone: string; locale: string; currency: string;
      max_users: number; max_storage_gb: number; max_workflows: number; max_api_keys: number; max_branches: number;
      feature_ai: boolean; feature_custom_domain: boolean; feature_white_label: boolean;
      feature_sso: boolean; feature_audit_logs: boolean; feature_api_access: boolean; feature_advanced_analytics: boolean;
      storage_used_bytes: number; users_count: number;
      [key: string]: any;
    };
    tenantId?: string;
    apiKey?: { id: string; tenant_id: string; name: string; permissions: string[]; environment: string };
  }
}
