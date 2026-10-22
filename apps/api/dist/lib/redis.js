"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
exports.connectRedis = connectRedis;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("./logger");
let _redis;
/**
 * How long we wait for the first successful Redis connection.
 *
 * ioredis reconnects on its own (see `retryStrategy` below), so a Redis that
 * is still booting is picked up automatically — we only need a bound so the
 * API reports a clear error instead of hanging during startup.
 */
const CONNECT_TIMEOUT_MS = 60000;
/**
 * Connects to Redis and resolves once the connection is established.
 * Rejects after {@link CONNECT_TIMEOUT_MS} if Redis never becomes reachable.
 */
function connectRedis(timeoutMs = CONNECT_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
        if (!_redis) {
            exports.redis = _redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379', {
                keyPrefix: process.env.REDIS_PREFIX || 'nexos:',
                retryStrategy: (times) => Math.min(times * 50, 2000),
                maxRetriesPerRequest: 3,
            });
            _redis.on('error', (err) => logger_1.logger.error('Redis error:', err));
            _redis.on('reconnecting', () => logger_1.logger.warn('Redis reconnecting...'));
        }
        const timer = setTimeout(() => {
            reject(new Error(`Redis connection timed out after ${timeoutMs}ms — is Docker running? ` +
                `Try: docker compose --env-file .env -f infrastructure/docker/docker-compose.yml up -d postgres redis`));
        }, timeoutMs);
        _redis.on('connect', () => {
            clearTimeout(timer);
            logger_1.logger.info('✅ Redis connected');
            resolve();
        });
    });
}
//# sourceMappingURL=redis.js.map