import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from './logger';

const queueRedisUrl = process.env.QUEUE_REDIS_URL || process.env.REDIS_URL || 'redis://localhost:6379';

/**
 * BullMQ requires a dedicated ioredis instance with `maxRetriesPerRequest`
 * set to null — it manages reconnection itself and fails fast otherwise.
 * Passing `{ url }` as plain connection options is not understood by ioredis
 * (it would silently fall back to localhost:6379 and emit an unhandled
 * 'error' event).
 */
export const queueConnection = new IORedis(queueRedisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

queueConnection.on('error', (err) => logger.error('Queue Redis error:', err));

const queueOptions = { connection: queueConnection };

export const emailQueue = new Queue('email', queueOptions);
export const workflowQueue = new Queue('workflow', queueOptions);
export const webhookQueue = new Queue('webhook', queueOptions);
export const aiQueue = new Queue('ai', queueOptions);
export const analyticsQueue = new Queue('analytics', queueOptions);
export const storageQueue = new Queue('storage', queueOptions);
export const billingQueue = new Queue('billing', queueOptions);
export const notificationQueue = new Queue('notification', queueOptions);

export async function setupQueues() {
  logger.info(`✅ Job queues initialized (${queueRedisUrl.replace(/\/\/[^@]*@/, '//***@')})`);
}
