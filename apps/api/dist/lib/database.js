"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
exports.connectDatabase = connectDatabase;
exports.connectDatabaseWithRetry = connectDatabaseWithRetry;
const knex_1 = __importDefault(require("knex"));
const logger_1 = require("./logger");
let _db;
/** A single connect attempt must not block longer than this. */
const ACQUIRE_TIMEOUT_MS = 10000;
/**
 * Opens the pool and runs a `SELECT 1` health check.
 *
 * The knex instance is created only once, so a failed attempt can be retried
 * without leaking connection pools.
 */
async function connectDatabase() {
    if (!_db) {
        exports.db = _db = (0, knex_1.default)({
            client: 'postgresql',
            connection: process.env.DATABASE_URL,
            pool: {
                min: parseInt(process.env.DATABASE_POOL_MIN || '2'),
                max: parseInt(process.env.DATABASE_POOL_MAX || '10'),
                afterCreate: (conn, done) => {
                    conn.query("SET search_path TO public; SET timezone = 'UTC'", done);
                },
            },
            acquireConnectionTimeout: ACQUIRE_TIMEOUT_MS,
        });
    }
    try {
        await _db.raw('SELECT 1');
    }
    catch (err) {
        // A pool whose *first* connection attempt failed does not recover on its
        // own: the failed resource stays attached to the acquire queue, so every
        // later request waits for a connection that never arrives and fails with
        // "Timeout acquiring a connection. The pool is probably full." — even
        // though PostgreSQL is reachable again by then.
        //
        // Throwing the pool away and letting the next retry build a fresh one
        // makes the startup sequence genuinely resilient to a database that is
        // still coming up.
        const failedPool = _db;
        exports.db = _db = undefined;
        await failedPool.destroy().catch(() => { });
        throw err;
    }
    logger_1.logger.info('✅ PostgreSQL connected');
}
/**
 * Waits for PostgreSQL to become reachable.
 *
 * The API is frequently started alongside (or restarted while) the Docker
 * stack, so a brief outage at boot is normal. Retrying here turns a hard
 * startup failure into a short wait instead of a crash loop.
 */
async function connectDatabaseWithRetry(attempts = 10, delayMs = 2000) {
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            await connectDatabase();
            return;
        }
        catch (err) {
            if (attempt === attempts) {
                logger_1.logger.error('❌ PostgreSQL connection failed:', err);
                throw err;
            }
            logger_1.logger.warn(`PostgreSQL not ready (attempt ${attempt}/${attempts}) - retrying in ${delayMs}ms. ` +
                `Is Docker running? "docker compose --env-file .env -f infrastructure/docker/docker-compose.yml up -d postgres redis"`);
            await new Promise((r) => setTimeout(r, delayMs));
        }
    }
}
//# sourceMappingURL=database.js.map