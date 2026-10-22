# NexOS — Universal Business Operating System

A multi-tenant SaaS platform built to serve **any business type** — from hotels and hospitals to logistics companies and NGOs. NexOS automatically adapts its module set, terminology, and workflow based on the industry you select.

---

## Architecture

```
nexos/
├── apps/
│   ├── api/          # Express.js + TypeScript REST API  (port 4000)
│   ├── web/          # Next.js 14 App Router frontend    (port 3002)
│   └── admin/        # Super-admin standalone console    (port 3001)
├── packages/
│   ├── database/     # Knex migrations + seeds (PostgreSQL)
│   ├── shared/       # Shared utils / constants
│   ├── email/        # Email service package
│   └── ai/           # AI service package
└── infrastructure/
    ├── docker/       # Docker Compose stack
    ├── nginx/        # Reverse proxy config
    ├── k8s/          # Kubernetes manifests
    └── terraform/    # Infrastructure as code
```

**Theme:** the platform ships with a **light theme** as the default (and only) active
theme. Both `apps/web` and `apps/admin` force `forcedTheme="light"`, and all colours
are driven by the CSS custom properties in `src/styles/globals.css` — so restyling the
whole product is a matter of editing the `:root` block.

**Tech stack**
| Layer | Technology |
|-------|------------|
| Monorepo | Turborepo + pnpm workspaces |
| Backend | Express.js 4 + TypeScript, Knex, PostgreSQL 16 |
| Queues | BullMQ + Redis |
| Real-time | Socket.IO |
| Frontend | Next.js 14 App Router, Tailwind CSS, shadcn/ui |
| State | Zustand + TanStack Query |
| Charts | Recharts |
| Auth | JWT (cookie + bearer) + TOTP 2FA + Magic Links |
| Payments | Stripe |
| Storage | S3 / MinIO |
| AI | Anthropic Claude |
| Search | Meilisearch |

---

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- Docker + Docker Compose (for local services)
- PostgreSQL 16 (or use Docker)
- Redis 7 (or use Docker)

---

## Quick Start

### 1. Clone and install

```bash
git clone <repo-url> nexos
cd nexos
pnpm install
```

### 2. Copy environment variables

```bash
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL, REDIS_URL, JWT_SECRET
```

### 3. Start backing services

```bash
# From the repo root. --env-file points Docker Compose at the root .env so the
# container ports and credentials match the rest of the monorepo.
docker compose --env-file .env -f infrastructure/docker/docker-compose.yml up -d postgres redis minio meilisearch
```

The stack defaults to host ports **5434** (PostgreSQL) and **6380** (Redis) so it
does not collide with a PostgreSQL/Redis you may already be running locally.
Override them with `POSTGRES_PORT` / `REDIS_PORT` in `.env` if needed — the
matching `DATABASE_URL` / `REDIS_URL` must be updated too.

### 4. Run database migrations and seed

```bash
pnpm db:migrate
pnpm db:seed
```

### 5. Start development servers

```bash
# All apps in parallel (Turborepo)
pnpm dev

# Or individually:
pnpm --filter @nexos/api dev      # API on :4000
pnpm --filter @nexos/web dev      # Web on :3002
pnpm --filter @nexos/admin dev    # Admin on :3001
```

> **Note:** Turborepo runs tasks in strict env-var mode. The variables the API
> needs (`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, …) are declared in
> `turbo.json` under `globalEnv` / `globalPassThroughEnv` — if you add a new
> environment variable that the API reads, add it there as well.

---

## Troubleshooting

### `❌ PostgreSQL connection failed: ECONNREFUSED`

The database runs in Docker and was not up yet. The API now retries the
connection for ~20 s before it gives up, so it is enough to start the stack
and the API will pick it up:

```bash
docker compose --env-file .env -f infrastructure/docker/docker-compose.yml up -d postgres redis meilisearch
```

Check what is actually listening: `docker ps` and
`Test-NetConnection localhost -Port 5434`.

### Docker Desktop is installed but not running

On Windows, Docker Desktop has to be started before the compose stack can be
used. If `docker ps` reports that it cannot connect to the Docker engine,
launch Docker Desktop and wait until the engine is ready:

```powershell
Start-Process "$Env:LOCALAPPDATA\Programs\DockerDesktop\Docker Desktop.exe"
docker version   # wait until this prints a Server version
```

### The page reloads itself over and over

The API client used to answer a `401` with a hard redirect to
`/login?redirect=<current path>`. On the login page that produced
`/login?redirect=/login` — a link to itself. The browser reloaded it, the
`/auth/me` request came back `401` again, and the app reloaded forever,
flooding the API with requests until the rate limiter kicked in.

The redirect is now skipped when the app is already on an auth route, and the
dashboard layout refuses to build a redirect that points at `/login`.

### The Sign in button does nothing

The shadcn checkbox is a Radix `<button role="checkbox">`, not an
`<input type="checkbox">`. Registering it with react-hook-form captured the
button's string value instead of a boolean, so the zod schema rejected the
whole form — and because the page only rendered the `email` and `password`
errors, the failure was invisible. The checkbox is now wired up with
`Controller`, and every field's error is rendered.

### Impersonating a tenant opens the wrong app

The admin console opens `NEXT_PUBLIC_APP_URL` when you impersonate a
workspace. That variable has to point at the **web app** (`:3002`), not at the
admin console itself (`:3001`). The tab is opened synchronously inside the
click handler — calling `window.open` from a promise callback is blocked by
popup blockers, which made the button look inert.

The web app picks the `?impersonation_token=` parameter up in the auth store,
strips it from the address bar and exchanges it for a session. This happens
inside `initialize()`, before the regular `/auth/me` check, because that check
runs without a session and would otherwise bounce the browser to the login
page and lose the token.



The API rate limits authenticated traffic per user (see **Rate limiting**
below). Raise `RATE_LIMIT_MAX_REQUESTS` in `.env` if you are driving the API
with a script — a single browser session stays well below the default of
100 requests per 15-minute window.

> If the app itself seems to be hitting the limit, check for a reload loop
> first (see **The page reloads itself over and over** below) — that used to
> generate thousands of requests per minute from a single page view.

### The API connects to the wrong database

`dotenv` never overrides a variable that is already set in the shell, so a
`DATABASE_URL` exported by a PowerShell profile (or by another project) wins
over the repo `.env`. The API now logs a warning when that happens:

```
WARNING: DATABASE_URL is set in your shell ("…") and overrides the value from .env
```

Remove the variable from the shell (`Remove-Item Env:\DATABASE_URL`) or scope
it to the project that needs it — do not set it globally in your profile.

### `TypeError: fetch failed … ENOTFOUND registry.npmjs.org`

Next.js checks npm for a newer release on every `next dev` start. On a
machine without access to the npm registry that prints an error (the dev
server still starts). It is disabled via `NEXT_TELEMETRY_DISABLED=1` in
`apps/web/.env.local` and `apps/admin/.env.local`.

### `The file … Microsoft.PowerShell_profile.ps1 is not digitally signed`

The profile is synced through OneDrive and therefore carries a "downloaded
from the internet" mark. Remove it once:

```powershell
Unblock-File -Path $PROFILE
```

### `ENOENT: … .next/server/middleware-manifest.json` (500 on every page)

The `.next` cache was cleared or corrupted while the dev server was running.
Stop the dev server, delete `apps/<app>/.next` and start it again.

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| **Super Admin** | admin@nexos.app | Admin@nexos123 |
| **Tenant Owner** (Acme Corp) | james@acmecorp.com | Demo@acme123 |
| **Admin** | sarah@acmecorp.com | Demo@acme123 |
| **Manager** | marcus@acmecorp.com | Demo@acme123 |
| **Staff** | linda@acmecorp.com | Demo@acme123 |

---

## Full Module List

### Core (always enabled)
| Module | Path | Description |
|--------|------|-------------|
| **Executive Dashboard** | `/dashboard` | Revenue, profit, expenses, orders, staff, inventory, forecasts, AI insights |
| **Advanced Analytics** | `/analytics` | Revenue trends, sales analysis, customer analytics, funnel, cohort, staff analytics |
| **Communication Center** | `/communication` | Internal messaging, notifications, outbound email/SMS log |
| **Role Management** | `/roles` | Custom roles, permission groups, access matrix |
| **Settings** | `/settings` | Workspace config, industry selection |

### Sales
| Module | Path | Description |
|--------|------|-------------|
| **CRM** | `/crm/contacts` | Leads, prospects, customers, pipelines, deals, activities |
| **Sales & POS** | `/sales` | Orders, quotations, estimates, POS sessions, refunds |
| **Finance** | `/finance` | Invoices (incl. recurring), payments |
| **Website Builder** | `/website` | Drag-and-drop CMS, SEO, custom domain |

### Operations
| Module | Path | Description |
|--------|------|-------------|
| **Accounting** | `/accounting` | Chart of accounts, general ledger, budgets, tax rates, P&L, cash flow |
| **Inventory** | `/inventory` | Products, variants, categories, warehouses, stock movements, POs, suppliers |
| **Project Management** | `/projects` | Projects, tasks (Kanban), milestones, timelines |
| **Document Management** | `/documents` | Contracts, policies, approvals, e-signatures |
| **Booking System** | `/bookings` | Reservations, appointments, resource availability |

### People
| Module | Path | Description |
|--------|------|-------------|
| **HR** | `/hr` | Staff directory, attendance, leave management, payroll, recruitment, performance reviews |
| **Multi-Branch** | `/branches` | Branches, locations, regional reporting, transfers |

---

## Industry Adaptation System

Go to **Settings → Industry & Modules** to select your business type. NexOS will:

1. Activate the relevant module set automatically
2. Apply terminology overrides (e.g. "Contacts" → "Guests" for hotels)
3. Let you fine-tune individual modules with a single toggle

**Supported industries (built-in):**

| Industry | Key modules activated |
|----------|----------------------|
| 🏨 Hotels & Hospitality | CRM, Booking, Finance, HR, Documents, Communication |
| 🎓 Schools & Education | CRM, HR, Booking, Finance, Documents, Communication |
| 🏥 Hospitals & Healthcare | CRM, Booking, HR, Finance, Inventory, Documents |
| 🍽️ Restaurants | CRM, Sales/POS, Booking, Inventory, Finance, HR |
| 🛍️ Retail | CRM, Sales/POS, Inventory, Finance, HR, Website |
| 🏭 Manufacturing | Inventory, Finance, HR, Projects, Documents |
| 🚚 Logistics | Inventory, Booking, Finance, HR, Documents |
| 🏢 Real Estate | CRM, Booking, Documents, Finance, Website |
| 🤝 NGOs / Non-Profits | CRM, Finance, HR, Projects, Documents |
| 🏛️ Government | CRM, Documents, HR, Projects, Communication |
| 🏗️ Construction | Projects, Inventory, HR, Finance, Documents |
| 🌾 Agriculture | Inventory, Finance, HR, Projects |
| 💼 Professional Services | CRM, Projects, Finance, Documents, AI |

Custom industries are also supported — define your own module set from Settings.

---

## Database Schema

**15 migrations, 60+ tables:**

| Migration | Tables |
|-----------|--------|
| 001_core_schema | plans, tenants, users, sessions, audit_logs, oauth, password_resets |
| 002_crm_schema | contact_lists, contacts, pipelines, pipeline_stages, deals, activities |
| 003_finance_schema | products, invoices, invoice_items, payments, expenses |
| 004_workflows_schema | workflows, workflow_runs, integrations, webhooks, api_keys |
| 005_cms_schema | websites, pages, media_files, templates |
| 006_branches_roles | branches, role_definitions, permissions, departments, permission_scopes |
| 007_hr_schema | teams, attendance, leave types/requests, payroll, payslips, recruitment, performance_reviews |
| 008_inventory_schema | product_categories, variants, warehouses, stock_levels, stock_movements, suppliers, purchase_orders |
| 009_sales_schema | sales_orders, quotations, refunds, pos_sessions |
| 010_accounting_schema | chart_of_accounts, journal_entries, budgets, tax_rates |
| 011_projects_schema | projects, milestones, tasks, task_comments |
| 012_booking_schema | bookable_resources, availability_rules, bookings |
| 013_documents_schema | documents, approval_requests, document_signatures |
| 014_communication_schema | message_threads, messages, communication_logs, notifications |
| 015_industry_adaptation | module_registry, industry_presets, custom_industries |

---

## API Reference

All routes under `/api/v1/`. Auth via cookie or `Authorization: Bearer <token>`.

| Base Path | Module |
|-----------|--------|
| `/auth` | Registration, login, 2FA, sessions, password reset, magic links |
| `/contacts` | CRM contacts CRUD + stats |
| `/invoices` | Invoice CRUD + send + mark-paid + stats |
| `/analytics` | Dashboard, executive view, KPIs, revenue, sales, customers, inventory, staff |
| `/branches` | Branch management + regional reporting |
| `/roles` | Custom roles, permissions catalog, access matrix |
| `/departments` | Department management |
| `/inventory` | Products, warehouses, stock, transfers, suppliers, purchase orders |
| `/sales` | Orders, quotations, refunds, stats |
| `/hr` | Staff, attendance, leave, payroll, recruitment, reviews |
| `/projects` | Projects, tasks, milestones, comments |
| `/bookings` | Resources, reservations, availability |
| `/documents` | Document management, approvals, e-signatures |
| `/communication` | Threads, messages, notifications, outbound log |
| `/accounting` | Chart of accounts, journal entries, GL, budgets, tax |
| `/industries` | Industry presets, module registry, toggles |
| `/admin` | Super-admin: tenants, users, audit logs, revenue (requires `super_admin` role) |

---

## Environment Variables

See `.env.example` for the full reference. Key variables:

```bash
DATABASE_URL=postgresql://nexos_user:nexos_pass@localhost:5434/nexos_db
REDIS_URL=redis://:nexos_redis_pass@localhost:6380
JWT_SECRET=your-secret-here
ANTHROPIC_API_KEY=sk-ant-...          # For AI module
STRIPE_SECRET_KEY=sk_test_...          # For billing
S3_BUCKET=nexos-uploads               # Storage
SMTP_HOST=smtp.sendgrid.net           # Email
```

---

## Docker (Full Stack)

```bash
# Backing services only (postgres, redis, minio, meilisearch)
docker compose --env-file .env -f infrastructure/docker/docker-compose.yml up -d

# Everything including api, web and nginx
docker compose --env-file .env -f infrastructure/docker/docker-compose.yml --profile full up -d

docker compose --env-file .env -f infrastructure/docker/docker-compose.yml logs -f api   # Stream API logs
docker compose --env-file .env -f infrastructure/docker/docker-compose.yml down          # Stop all
```

---

## Project Patterns

**All API controllers follow:**
1. `authenticate` middleware → tenant scoping
2. Business logic against tenant-scoped DB queries
3. `AuditService.log()` for sensitive mutations
4. Consistent `{ success: true, data: { ... } }` response shape

**Request validation:**
Write endpoints declare their required fields with the `requireFields(...)`
middleware from `apps/api/src/lib/validation.ts`. A request that is missing one
of them is rejected with `422 VALIDATION_ERROR` and a list of the offending
fields, instead of being forwarded to PostgreSQL where a `NOT NULL` violation
would surface as a generic `500`. The same module provides `requireLineItems()`
for invoice/order/quotation line items and `toJsonb()` for the `jsonb`
columns (`branches.address`, `suppliers.address`, `bookable_resources.metadata`)
so that a plain string address is accepted instead of failing the insert.

**Error responses:**
`apps/api/src/middleware/index.ts` maps PostgreSQL error codes onto proper
status codes — `23502` (missing value) and `23514` (check violation) become
`422`, `22P02` (bad value for a column type) becomes `422 INVALID_VALUE`,
`23503` (bad reference) becomes `400` and `23505` (duplicate) becomes `409`.

**Rate limiting:**
The limiter is mounted inside each router, directly after `authenticate`, so
that the bucket can be keyed on the authenticated user. Mounting it globally
(before authentication) would force it to fall back to the client IP, which
means every user behind the same address shares a single budget and starts
receiving `429`s far too early. Tune it with `RATE_LIMIT_MAX_REQUESTS` and
`RATE_LIMIT_WINDOW_MS` in `.env`.

**Stock movements:**
Every inventory change (purchase, sale, transfer, adjustment) writes to `stock_movements` for full audit history.

**Double-entry accounting:**
`createJournalEntry` validates `sum(debit) === sum(credit)` before inserting — enforces balanced books.

**Module gating:**
`requireModule('inventory')` middleware checks `tenants.enabled_modules` JSON array. The industry selection system populates this array; individual modules can be toggled from Settings.

**Industry terminology:**
`tenants.settings.terminologyOverrides` is a JSON map that the frontend uses to rename labels per industry. For example, a hotel workspace sees "Guests" instead of "Contacts".

---

## Super Admin Console

Separate Next.js app on port 3001. Login with `admin@nexos.app / Admin@nexos123`.

Features:
- Platform-wide stats (MRR, tenant counts, churn)
- Tenant management (suspend, unsuspend, delete, impersonate)
- All-user search across tenants
- Revenue breakdown by plan
- Platform audit log

## The Two Login Surfaces

| Surface | URL | Who can sign in | Workspace |
|---------|-----|-----------------|-----------|
| **Web app** | http://localhost:3002 | Any user of a tenant | Derived from the user |
| **Admin console** | http://localhost:3001 | `super_admin` only | The platform tenant |

There is no separate "workspace login" form. A workspace (tenant) is a
property of the user: signing in with `james@acmecorp.com` lands you in the
**Acme Corp** workspace, `sarah@acmecorp.com` in the same one, and
`admin@nexos.app` in the **NexOS Platform** workspace. A new workspace is
created by signing up at `/register`, which provisions the tenant, an owner
account, a Starter plan and a unique subdomain.

Every tenant also has a subdomain (`acmecorp.nexos.app`, `platform.nexos.app`,
…). In production the workspace is resolved from the request host; on
`localhost` it is resolved from the JWT. Either way the two must agree — the
API rejects a request whose token belongs to a different workspace with
`403 TENANT_MISMATCH`, so a credential can never read another workspace's data.

Only failed sign-ins count towards the auth rate limit
(`RATE_LIMIT_AUTH_MAX`, 10 per 15 minutes per address), so a mistyped password
does not lock everyone behind the same IP out of the console.

---

## Roadmap (not yet built)

- [ ] Workflow Automation engine (triggers + step runner)
- [ ] AI chat assistant (Claude integration in sidebar)
- [ ] Stripe billing subscription flow
- [ ] S3 file upload service
- [ ] Full-text search via Meilisearch
- [ ] WhatsApp / SMS via Twilio
- [ ] k8s deployment manifests
- [ ] Test suite (vitest)
- [ ] Custom Dashboard Builder (drag/rearrange widgets)
#   B u s i n e s s O S  
 