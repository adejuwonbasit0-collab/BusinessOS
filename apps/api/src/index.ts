import './lib/env';
import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDatabaseWithRetry } from './lib/database';
import { connectRedis } from './lib/redis';
import { setupQueues } from './lib/queues';
import { setupSocketIO } from './lib/socketio';
import { logger } from './lib/logger';
import { tenantMiddleware } from './middleware/tenant';
import { errorHandler, requestId, safeRouter } from './middleware/index';
import authRoutes from './routes/auth';
import { contactsRouter, invoicesRouter, analyticsRouter } from './routes/index';
import { branchesRouter, rolesRouter, departmentsRouter } from './routes/organization';
import billingRoutes from './routes/billing';
import salesRoutes from './routes/sales';
import hrRoutes from './routes/hr';
import projectsRoutes from './routes/projects';
import bookingRoutes from './routes/booking';
import inventoryRoutes from './routes/inventory';
import { documentsRouter, communicationRouter, accountingRouter } from './routes/operations';
import industryRoutes from './routes/industry';
import adminRoutes from './routes/admin';
import aiRoutes from './routes/ai';
import workflowRoutes from './routes/workflows';
import onboardingRoutes from './routes/onboarding';
import brandingRoutes from './routes/branding';
import websiteRoutes from './routes/websites';
import { BRANDING_STORAGE_ROOT } from './controllers/BrandingController';
import { portalsRouter, formsRouter, tablesRouter, marketplaceRouter, integrationsRouter, whiteLabelRouter } from './routes/phase3';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 4000;

// ── Global middleware ──────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(requestId);

// Stripe webhook needs raw body — must be registered before json()
app.use('/api/v1/billing/webhook/stripe', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(tenantMiddleware);

// NOTE: the per-user rate limiter is mounted inside each router, right after
// `authenticate`, so that it can key on the authenticated user instead of
// lumping every caller behind one IP into a single bucket.

// ── Health check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── Routes ──────────────────────────────────────────────────────────────────
// Every router is wrapped in `safeRouter` so that a rejected promise inside an
// async controller is forwarded to the Express error handler instead of
// escaping as an unhandled rejection (which terminates the Node process).
app.use('/api/v1/auth', safeRouter(authRoutes));
app.use('/api/v1/contacts', safeRouter(contactsRouter));
app.use('/api/v1/invoices', safeRouter(invoicesRouter));
app.use('/api/v1/analytics', safeRouter(analyticsRouter));
app.use('/api/v1/branches', safeRouter(branchesRouter));
app.use('/api/v1/roles', safeRouter(rolesRouter));
app.use('/api/v1/departments', safeRouter(departmentsRouter));
app.use('/api/v1/billing', safeRouter(billingRoutes));
app.use('/api/v1/sales', safeRouter(salesRoutes));
app.use('/api/v1/hr', safeRouter(hrRoutes));
app.use('/api/v1/projects', safeRouter(projectsRoutes));
app.use('/api/v1/bookings', safeRouter(bookingRoutes));
app.use('/api/v1/inventory', safeRouter(inventoryRoutes));
app.use('/api/v1/documents', safeRouter(documentsRouter));
app.use('/api/v1/communication', safeRouter(communicationRouter));
app.use('/api/v1/accounting', safeRouter(accountingRouter));
app.use('/api/v1/industries', safeRouter(industryRoutes));
app.use('/api/v1/onboarding', safeRouter(onboardingRoutes));
app.use('/api/v1/branding', safeRouter(brandingRoutes));
app.use('/api/v1/websites', safeRouter(websiteRoutes));
app.use('/api/v1/admin', safeRouter(adminRoutes));
app.use('/api/v1/ai', safeRouter(aiRoutes));
app.use('/api/v1/workflows', safeRouter(workflowRoutes));
app.use('/api/v1/portals', safeRouter(portalsRouter));
app.use('/api/v1/forms', safeRouter(formsRouter));
app.use('/api/v1/tables', safeRouter(tablesRouter));
app.use('/api/v1/marketplace', safeRouter(marketplaceRouter));
app.use('/api/v1/integrations', safeRouter(integrationsRouter));
app.use('/api/v1/white-label', safeRouter(whiteLabelRouter));

// Additional route modules mount here as they're built (workflows, ai,
// billing, admin, sales, finance, hr, projects, booking, etc.)

// ── Public branding assets ─────────────────────────────────────────────────
// Logos and favicons uploaded by a tenant. The files live in a folder per
// tenant, so one business's assets can never be overwritten by another's.
app.use('/public/branding', express.static(BRANDING_STORAGE_ROOT, {
  maxAge: '1h',
  index: false,
  fallthrough: false,
}));

// ── Error handling ──────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } }));
app.use(errorHandler);

// ── Socket.IO ───────────────────────────────────────────────────────────────
setupSocketIO(io);

// ── Startup ─────────────────────────────────────────────────────────────────
const MAX_LISTEN_RETRIES = 10;
const LISTEN_RETRY_DELAY_MS = 1000;

function listen(): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (err: NodeJS.ErrnoException) => {
      server.off('listening', onListening);
      reject(err);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(PORT);
  });
}

async function start() {
  try {
    await connectDatabaseWithRetry();
    await connectRedis();
    await setupQueues();
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }

  // A hot-reload (tsx watch) restarts the process before the OS has released
  // the listening socket, which surfaces as EADDRINUSE. Retry with a short
  // backoff instead of crash-looping the watcher.
  for (let attempt = 1; attempt <= MAX_LISTEN_RETRIES; attempt++) {
    try {
      await listen();
      logger.info(`🚀 NexOS API running on port ${PORT}`);
      return;
    } catch (err: any) {
      if (err?.code === 'EADDRINUSE' && attempt < MAX_LISTEN_RETRIES) {
        logger.warn(`Port ${PORT} is in use — retrying in ${LISTEN_RETRY_DELAY_MS}ms (attempt ${attempt}/${MAX_LISTEN_RETRIES})`);
        await new Promise((r) => setTimeout(r, LISTEN_RETRY_DELAY_MS));
        continue;
      }
      logger.error(`Server failed to start: ${err?.message || err}`);
      process.exit(1);
    }
  }
}

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => process.exit(0));
});

// A single bad request must never take the whole API down. `safeRouter` already
// forwards controller rejections to the Express error handler; these last-resort
// handlers cover anything that slips through (e.g. a promise created outside
// the request lifecycle).
function describe(reason: unknown): string {
  if (reason instanceof Error) return reason.stack || `${reason.name}: ${reason.message}`;
  try {
    return JSON.stringify(reason);
  } catch {
    return String(reason);
  }
}

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled promise rejection: ${describe(reason)}`);
});
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught exception: ${describe(err)}`);
});

start();

export { app, io };
