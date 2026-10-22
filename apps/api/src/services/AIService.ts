import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const DEFAULT_MODEL = process.env.AI_MODEL || 'claude-opus-4-6';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface BusinessAnalysis {
  businessType: string;
  industry: string;
  recommendedModules: string[];
  terminologyOverrides: Record<string, string>;
  suggestedWorkflows: WorkflowTemplate[];
  suggestedDashboardWidgets: DashboardWidget[];
  suggestedPermissions: PermissionSet[];
  websiteContent: WebsiteContent;
  sops: SOP[];
  policies: Policy[];
  forms: Form[];
}

export interface WorkflowTemplate {
  name: string;
  description: string;
  triggerType: string;
  triggerConfig: Record<string, any>;
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  type: string;
  name: string;
  config: Record<string, any>;
}

export interface DashboardWidget {
  type: 'stat_card' | 'chart' | 'table' | 'funnel' | 'heatmap';
  title: string;
  dataSource: string;
  config: Record<string, any>;
}

export interface PermissionSet {
  module: string;
  role: string;
  permissions: string[];
}

export interface WebsiteContent {
  heroHeadline: string;
  heroSubheadline: string;
  features: { title: string; description: string; icon: string }[];
  cta: string;
  aboutText: string;
}

export interface SOP {
  title: string;
  department: string;
  steps: string[];
  frequency: string;
}

export interface Policy {
  title: string;
  category: string;
  content: string;
}

export interface Form {
  name: string;
  fields: FormField[];
  purpose: string;
}

export interface FormField {
  label: string;
  type: 'text' | 'email' | 'phone' | 'select' | 'date' | 'number' | 'textarea' | 'checkbox';
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export class AIService {
  // ── Core completion helper ────────────────────────────────────────────────
  private static async complete(
    systemPrompt: string,
    userPrompt: string,
    maxTokens = 4096
  ): Promise<string> {
    const response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type from AI');
    return content.text;
  }

  private static async completeJSON<T>(
    systemPrompt: string,
    userPrompt: string,
    maxTokens = 4096
  ): Promise<T> {
    const text = await this.complete(
      systemPrompt + '\n\nYou MUST respond with valid JSON only — no markdown, no explanation, no code fences.',
      userPrompt,
      maxTokens
    );
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned) as T;
  }

  // ── 1. Business Analysis & Industry Adaptation ────────────────────────────
  static async analyzeBusinessDescription(description: string): Promise<BusinessAnalysis> {
    const AVAILABLE_MODULES = [
      'dashboard', 'analytics', 'crm', 'sales', 'finance', 'inventory', 'hr',
      'projects', 'booking', 'documents', 'communication', 'workflows', 'roles',
      'branches', 'website', 'ai', 'accounting',
    ];

    const systemPrompt = `You are an expert business analyst and software architect for NexOS, a universal business operating system.
Your job is to analyze a business description and produce a comprehensive configuration JSON that tells the platform exactly how to set itself up for that business.
Be specific, practical, and thorough. Generate real, usable content — not placeholder text.`;

    const userPrompt = `Analyze this business and produce a full configuration:

BUSINESS DESCRIPTION: "${description}"

Available modules: ${AVAILABLE_MODULES.join(', ')}

Return a JSON object with exactly this shape:
{
  "businessType": "string — concise name for this type of business",
  "industry": "string — the industry key (use underscores, lowercase)",
  "recommendedModules": ["array of module keys from the available list"],
  "terminologyOverrides": {
    "contacts": "what this business calls their contacts (e.g. Clients, Patients, Guests)",
    "deals": "what they call deals/opportunities",
    "bookings": "what they call reservations/appointments (if applicable)",
    "products": "what they call their products/services",
    "invoices": "what they call invoices"
  },
  "suggestedWorkflows": [
    {
      "name": "workflow name",
      "description": "what it does",
      "triggerType": "one of: contact.created, deal.created, invoice.paid, booking.created, form.submitted, schedule.daily, schedule.weekly, webhook.received",
      "triggerConfig": {},
      "steps": [
        { "type": "send_email", "name": "step name", "config": { "subject": "...", "template": "..." } }
      ]
    }
  ],
  "suggestedDashboardWidgets": [
    {
      "type": "stat_card",
      "title": "widget title",
      "dataSource": "the API endpoint or metric name",
      "config": {}
    }
  ],
  "suggestedPermissions": [
    {
      "module": "module name",
      "role": "role name relevant to this business",
      "permissions": ["view", "create"]
    }
  ],
  "websiteContent": {
    "heroHeadline": "compelling headline for their website",
    "heroSubheadline": "supporting sentence",
    "features": [
      { "title": "feature name", "description": "2-sentence description", "icon": "lucide icon name" }
    ],
    "cta": "call to action text",
    "aboutText": "2-paragraph about section"
  },
  "sops": [
    {
      "title": "SOP title",
      "department": "department name",
      "steps": ["step 1", "step 2", "step 3"],
      "frequency": "daily/weekly/monthly/per-event"
    }
  ],
  "policies": [
    {
      "title": "policy title",
      "category": "HR/Operations/Finance/IT/Customer",
      "content": "full policy text (3-5 paragraphs)"
    }
  ],
  "forms": [
    {
      "name": "form name",
      "purpose": "what the form is for",
      "fields": [
        { "label": "Field Label", "type": "text", "required": true, "placeholder": "placeholder" }
      ]
    }
  ]
}

Generate at least 3 workflows, 6 dashboard widgets, 3 SOPs, 2 policies, and 2 forms. Make everything specific to this business type.`;

    return this.completeJSON<BusinessAnalysis>(systemPrompt, userPrompt, 8192);
  }

  // ── 2. Workflow Generation from natural language ───────────────────────────
  static async generateWorkflowFromDescription(
    description: string,
    tenantContext: string
  ): Promise<WorkflowTemplate> {
    const systemPrompt = `You are an automation expert for NexOS. Convert plain-language workflow descriptions into structured workflow configs.`;

    const userPrompt = `Business context: ${tenantContext}

User wants to automate: "${description}"

Available trigger types: contact.created, contact.updated, deal.created, deal.won, deal.lost, invoice.created, invoice.paid, invoice.overdue, booking.created, booking.confirmed, form.submitted, schedule.daily, schedule.weekly, schedule.monthly, webhook.received

Available step types: send_email, send_sms, send_whatsapp, wait, condition, create_contact, update_contact, create_deal, update_deal, create_task, create_invoice, create_booking, score_lead, add_to_list, http_request, ai_action, slack_message, notify_user

Return JSON:
{
  "name": "workflow name",
  "description": "what this workflow does",
  "triggerType": "trigger key",
  "triggerConfig": {},
  "steps": [
    {
      "type": "step type",
      "name": "human-readable step name",
      "config": { "key": "value" }
    }
  ]
}`;

    return this.completeJSON<WorkflowTemplate>(systemPrompt, userPrompt, 2048);
  }

  // ── 3. Report generation from live data ───────────────────────────────────
  static async generateReport(
    reportType: string,
    data: Record<string, any>,
    businessContext: string
  ): Promise<{ title: string; summary: string; sections: { heading: string; content: string }[]; recommendations: string[] }> {
    const systemPrompt = `You are a business intelligence analyst. You generate clear, actionable business reports from data. Be specific, cite numbers, and always end with concrete recommendations.`;

    const userPrompt = `Business: ${businessContext}
Report type: ${reportType}
Data: ${JSON.stringify(data, null, 2)}

Generate a comprehensive business report. Return JSON:
{
  "title": "report title",
  "summary": "2-3 sentence executive summary",
  "sections": [
    { "heading": "section heading", "content": "detailed analysis paragraph" }
  ],
  "recommendations": ["specific actionable recommendation 1", "recommendation 2", "recommendation 3"]
}`;

    return this.completeJSON(systemPrompt, userPrompt, 3072);
  }

  // ── 4. SOP Generator ──────────────────────────────────────────────────────
  static async generateSOPs(
    businessType: string,
    departments: string[]
  ): Promise<SOP[]> {
    const systemPrompt = `You are an operations consultant who creates practical, step-by-step standard operating procedures for businesses.`;

    const userPrompt = `Business type: ${businessType}
Departments: ${departments.join(', ')}

Generate comprehensive SOPs for this business. Each SOP should have 5-10 practical steps.
Return a JSON array of SOP objects:
[
  {
    "title": "SOP title",
    "department": "department name",
    "steps": ["detailed step 1", "detailed step 2", ...],
    "frequency": "how often this runs"
  }
]

Generate at least 5 SOPs covering the most critical operations.`;

    return this.completeJSON<SOP[]>(systemPrompt, userPrompt, 4096);
  }

  // ── 5. Policy Generator ───────────────────────────────────────────────────
  static async generatePolicies(
    businessType: string,
    industry: string
  ): Promise<Policy[]> {
    const systemPrompt = `You are a compliance and HR consultant who drafts professional workplace policies. Write policies that are legally sensible, clear, and specific to the business type.`;

    const userPrompt = `Business type: ${businessType} in the ${industry} industry.

Generate a set of essential business policies. Return a JSON array:
[
  {
    "title": "Policy Title",
    "category": "HR/Operations/Finance/IT/Customer Service/Compliance",
    "content": "Full policy text — at least 3 well-written paragraphs covering purpose, scope, procedures, and responsibilities."
  }
]

Include at minimum: Data Privacy Policy, Employee Code of Conduct, Leave & Attendance Policy, Customer Service Standards, and one industry-specific policy.`;

    return this.completeJSON<Policy[]>(systemPrompt, userPrompt, 6144);
  }

  // ── 6. Form Generator ─────────────────────────────────────────────────────
  static async generateForms(
    businessType: string,
    purpose: string
  ): Promise<Form> {
    const systemPrompt = `You are a UX expert who designs practical data capture forms for businesses.`;

    const userPrompt = `Business type: ${businessType}
Form purpose: ${purpose}

Design a comprehensive form. Return JSON:
{
  "name": "form name",
  "purpose": "what this form is for",
  "fields": [
    {
      "label": "Field Label",
      "type": "text|email|phone|select|date|number|textarea|checkbox",
      "required": true,
      "placeholder": "helpful placeholder",
      "options": ["option1", "option2"]
    }
  ]
}
Include 6-12 fields appropriate for the purpose. Only include "options" for select fields.`;

    return this.completeJSON<Form>(systemPrompt, userPrompt, 2048);
  }

  // ── 7. Website Content Generator ─────────────────────────────────────────
  static async generateWebsiteContent(
    businessType: string,
    businessName: string,
    description: string
  ): Promise<WebsiteContent> {
    const systemPrompt = `You are a professional copywriter who creates compelling website content for businesses. Your copy converts visitors into customers.`;

    const userPrompt = `Business name: ${businessName}
Business type: ${businessType}
Description: ${description}

Generate compelling website content. Return JSON:
{
  "heroHeadline": "powerful 4-8 word headline",
  "heroSubheadline": "compelling 1-2 sentence supporting copy",
  "features": [
    { "title": "feature name", "description": "2 sentence description of the value", "icon": "lucide-react icon name" }
  ],
  "cta": "call to action button text",
  "aboutText": "2-paragraph about section that builds trust and explains what makes this business special"
}

Generate 6 features. Make it specific, not generic.`;

    return this.completeJSON<WebsiteContent>(systemPrompt, userPrompt, 2048);
  }

  // ── 8. Dashboard Widget Generator ─────────────────────────────────────────
  static async generateDashboard(
    businessType: string,
    availableModules: string[]
  ): Promise<{ name: string; widgets: DashboardWidget[] }> {
    const systemPrompt = `You are a business intelligence specialist who designs executive dashboards. Create dashboards that give decision-makers the KPIs they actually need.`;

    const userPrompt = `Business type: ${businessType}
Available modules: ${availableModules.join(', ')}

Design an executive dashboard. Return JSON:
{
  "name": "Dashboard name",
  "widgets": [
    {
      "type": "stat_card|chart|table|funnel|heatmap",
      "title": "widget title",
      "dataSource": "which API endpoint provides this data",
      "config": {
        "metric": "what to measure",
        "period": "time period",
        "chartType": "area|bar|line|pie (for charts)",
        "columns": ["col1", "col2"] 
      }
    }
  ]
}

Generate 10-14 widgets appropriate for this business. Mix stat cards, charts, and tables.`;

    return this.completeJSON(systemPrompt, userPrompt, 3072);
  }

  // ── 9. AI Chat — general business assistant ────────────────────────────────
  static async chat(
    messages: AIMessage[],
    tenantContext: { name: string; industry: string; enabledModules: string[] },
    systemPromptExtra = ''
  ): Promise<string> {
    const systemPrompt = `You are an AI business assistant built into NexOS, the Universal Business Operating System.
You are helping the team at ${tenantContext.name}, a ${tenantContext.industry} business.
Their active modules: ${tenantContext.enabledModules.join(', ')}.
Be concise, practical, and business-focused. When relevant, reference their specific modules and data.
${systemPromptExtra}`;

    const response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Unexpected AI response type');
    return content.text;
  }

  // ── 10. Lead Scoring ──────────────────────────────────────────────────────
  static async scoreLeadWithReasoning(
    contactData: Record<string, any>
  ): Promise<{ score: number; grade: string; reasoning: string; nextActions: string[] }> {
    const systemPrompt = `You are a CRM expert. Score leads based on profile data and suggest next actions.`;

    const userPrompt = `Score this lead and return JSON:
Contact data: ${JSON.stringify(contactData, null, 2)}

Return:
{
  "score": <0-100 integer>,
  "grade": "<A|B|C|D>",
  "reasoning": "2-3 sentence explanation of the score",
  "nextActions": ["specific next action 1", "specific next action 2", "specific next action 3"]
}`;

    return this.completeJSON(systemPrompt, userPrompt, 1024);
  }

  // ── 11. App Builder — component config generation ─────────────────────────
  static async generatePortalConfig(
    portalType: 'customer' | 'staff' | 'vendor',
    businessType: string,
    description: string
  ): Promise<{
    name: string;
    pages: { name: string; slug: string; components: { type: string; config: Record<string, any> }[] }[];
  }> {
    const systemPrompt = `You are a no-code app designer. Design portal apps for businesses using available component types.
Available component types: hero_banner, stat_card, data_table, form, calendar, kanban, file_list, profile_card, invoice_list, booking_widget, product_catalog, chat_widget, notification_feed.`;

    const userPrompt = `Design a ${portalType} portal for a ${businessType} business.
Description: ${description}

Return JSON:
{
  "name": "portal name",
  "pages": [
    {
      "name": "page name",
      "slug": "/page-slug",
      "components": [
        {
          "type": "component type from the list",
          "config": { "title": "...", "dataSource": "...", "columns": [] }
        }
      ]
    }
  ]
}

Generate 3-5 pages with 2-4 components each. Make it practical for this portal type.`;

    return this.completeJSON(systemPrompt, userPrompt, 3072);
  }
}
