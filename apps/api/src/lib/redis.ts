import Redis from 'ioredis';
import { logger } from './logger';

let _redis: Redis;

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
export function connectRedis(timeoutMs: number = CONNECT_TIMEOUT_MS): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!_redis) {
      _redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        keyPrefix: process.env.REDIS_PREFIX || 'nexos:',
        retryStrategy: (times) => Math.min(times * 50, 2000),
        maxRetriesPerRequest: 3,
      });
      _redis.on('error', (err) => logger.error('Redis error:', err));
      _redis.on('reconnecting', () => logger.warn('Redis reconnecting...'));
    }

    const timer = setTimeout(() => {
      reject(
        new Error(
          `Redis connection timed out after ${timeoutMs}ms — is Docker running? ` +
            `Try: docker compose --env-file .env -f infrastructure/docker/docker-compose.yml up -d postgres redis`
        )
      );
    }, timeoutMs);

    _redis.on('connect', () => {
      clearTimeout(timer);
      logger.info('✅ Redis connected');
      resolve();
    });
  });
}

export { _redis as redis };
