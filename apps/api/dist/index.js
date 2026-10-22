"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.app = void 0;
require("./lib/env");
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const database_1 = require("./lib/database");
const redis_1 = require("./lib/redis");
const queues_1 = require("./lib/queues");
const socketio_1 = require("./lib/socketio");
const logger_1 = require("./lib/logger");
const tenant_1 = require("./middleware/tenant");
const index_1 = require("./middleware/index");
const auth_1 = __importDefault(require("./routes/auth"));
const index_2 = require("./routes/index");
const organization_1 = require("./routes/organization");
const inventory_1 = __importDefault(require("./routes/inventory"));
const sales_1 = __importDefault(require("./routes/sales"));
const hr_1 = __importDefault(require("./routes/hr"));
const projects_1 = __importDefault(require("./routes/projects"));
const booking_1 = __importDefault(require("./routes/booking"));
const operations_1 = require("./routes/operations");
const industry_1 = __importDefault(require("./routes/industry"));
const admin_1 = __importDefault(require("./routes/admin"));
const ai_1 = __importDefault(require("./routes/ai"));
const workflows_1 = __importDefault(require("./routes/workflows"));
const phase3_1 = require("./routes/phase3");
const app = (0, express_1.default)();
exports.app = app;
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, { cors: { origin: '*' } });
exports.io = io;
const PORT = process.env.PORT || 4000;
// ── Global middleware ──────────────────────────────────────────────────────
app.use((0, helmet_1.default)({ contentSecurityPolicy: false }));
app.use((0, cors_1.default)({ origin: true, credentials: true }));
app.use((0, cookie_parser_1.default)());
app.use(index_1.requestId);
// Stripe webhook needs raw body — must be registered before json()
app.use('/api/v1/billing/webhook/stripe', express_1.default.raw({ type: 'application/json' }));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use(tenant_1.tenantMiddleware);
// NOTE: the per-user rate limiter is mounted inside each router, right after
// `authenticate`, so that it can key on the authenticated user instead of
// lumping every caller behind one IP into a single bucket.
// ── Health check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
// ── Routes ──────────────────────────────────────────────────────────────────
// Every router is wrapped in `safeRouter` so that a rejected promise inside an
// async controller is forwarded to the Express error handler instead of
// escaping as an unhandled rejection (which terminates the Node process).
app.use('/api/v1/auth', (0, index_1.safeRouter)(auth_1.default));
app.use('/api/v1/contacts', (0, index_1.safeRouter)(index_2.contactsRouter));
app.use('/api/v1/invoices', (0, index_1.safeRouter)(index_2.invoicesRouter));
app.use('/api/v1/analytics', (0, index_1.safeRouter)(index_2.analyticsRouter));
app.use('/api/v1/branches', (0, index_1.safeRouter)(organization_1.branchesRouter));
app.use('/api/v1/roles', (0, index_1.safeRouter)(organization_1.rolesRouter));
app.use('/api/v1/departments', (0, index_1.safeRouter)(organization_1.departmentsRouter));
app.use('/api/v1/inventory', (0, index_1.safeRouter)(inventory_1.default));
app.use('/api/v1/sales', (0, index_1.safeRouter)(sales_1.default));
app.use('/api/v1/hr', (0, index_1.safeRouter)(hr_1.default));
app.use('/api/v1/projects', (0, index_1.safeRouter)(projects_1.default));
app.use('/api/v1/bookings', (0, index_1.safeRouter)(booking_1.default));
app.use('/api/v1/documents', (0, index_1.safeRouter)(operations_1.documentsRouter));
app.use('/api/v1/communication', (0, index_1.safeRouter)(operations_1.communicationRouter));
app.use('/api/v1/accounting', (0, index_1.safeRouter)(operations_1.accountingRouter));
app.use('/api/v1/industries', (0, index_1.safeRouter)(industry_1.default));
app.use('/api/v1/admin', (0, index_1.safeRouter)(admin_1.default));
app.use('/api/v1/ai', (0, index_1.safeRouter)(ai_1.default));
app.use('/api/v1/workflows', (0, index_1.safeRouter)(workflows_1.default));
app.use('/api/v1/portals', (0, index_1.safeRouter)(phase3_1.portalsRouter));
app.use('/api/v1/forms', (0, index_1.safeRouter)(phase3_1.formsRouter));
app.use('/api/v1/tables', (0, index_1.safeRouter)(phase3_1.tablesRouter));
app.use('/api/v1/marketplace', (0, index_1.safeRouter)(phase3_1.marketplaceRouter));
app.use('/api/v1/integrations', (0, index_1.safeRouter)(phase3_1.integrationsRouter));
app.use('/api/v1/white-label', (0, index_1.safeRouter)(phase3_1.whiteLabelRouter));
// Additional route modules mount here as they're built (workflows, ai,
// billing, admin, sales, finance, hr, projects, booking, etc.)
// ── Error handling ──────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } }));
app.use(index_1.errorHandler);
// ── Socket.IO ───────────────────────────────────────────────────────────────
(0, socketio_1.setupSocketIO)(io);
// ── Startup ─────────────────────────────────────────────────────────────────
const MAX_LISTEN_RETRIES = 10;
const LISTEN_RETRY_DELAY_MS = 1000;
function listen() {
    return new Promise((resolve, reject) => {
        const onError = (err) => {
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
        await (0, database_1.connectDatabaseWithRetry)();
        await (0, redis_1.connectRedis)();
        await (0, queues_1.setupQueues)();
    }
    catch (err) {
        logger_1.logger.error('Failed to start server:', err);
        process.exit(1);
    }
    // A hot-reload (tsx watch) restarts the process before the OS has released
    // the listening socket, which surfaces as EADDRINUSE. Retry with a short
    // backoff instead of crash-looping the watcher.
    for (let attempt = 1; attempt <= MAX_LISTEN_RETRIES; attempt++) {
        try {
            await listen();
            logger_1.logger.info(`🚀 NexOS API running on port ${PORT}`);
            return;
        }
        catch (err) {
            if (err?.code === 'EADDRINUSE' && attempt < MAX_LISTEN_RETRIES) {
                logger_1.logger.warn(`Port ${PORT} is in use — retrying in ${LISTEN_RETRY_DELAY_MS}ms (attempt ${attempt}/${MAX_LISTEN_RETRIES})`);
                await new Promise((r) => setTimeout(r, LISTEN_RETRY_DELAY_MS));
                continue;
            }
            logger_1.logger.error(`Server failed to start: ${err?.message || err}`);
            process.exit(1);
        }
    }
}
process.on('SIGTERM', () => {
    logger_1.logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => process.exit(0));
});
// A single bad request must never take the whole API down. `safeRouter` already
// forwards controller rejections to the Express error handler; these last-resort
// handlers cover anything that slips through (e.g. a promise created outside
// the request lifecycle).
function describe(reason) {
    if (reason instanceof Error)
        return reason.stack || `${reason.name}: ${reason.message}`;
    try {
        return JSON.stringify(reason);
    }
    catch {
        return String(reason);
    }
}
process.on('unhandledRejection', (reason) => {
    logger_1.logger.error(`Unhandled promise rejection: ${describe(reason)}`);
});
process.on('uncaughtException', (err) => {
    logger_1.logger.error(`Uncaught exception: ${describe(err)}`);
});
start();
//# sourceMappingURL=index.js.map