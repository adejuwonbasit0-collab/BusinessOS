"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationQueue = exports.billingQueue = exports.storageQueue = exports.analyticsQueue = exports.aiQueue = exports.webhookQueue = exports.workflowQueue = exports.emailQueue = exports.queueConnection = void 0;
exports.setupQueues = setupQueues;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("./logger");
const queueRedisUrl = process.env.QUEUE_REDIS_URL || process.env.REDIS_URL || 'redis://localhost:6379';
/**
 * BullMQ requires a dedicated ioredis instance with `maxRetriesPerRequest`
 * set to null — it manages reconnection itself and fails fast otherwise.
 * Passing `{ url }` as plain connection options is not understood by ioredis
 * (it would silently fall back to localhost:6379 and emit an unhandled
 * 'error' event).
 */
exports.queueConnection = new ioredis_1.default(queueRedisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
});
exports.queueConnection.on('error', (err) => logger_1.logger.error('Queue Redis error:', err));
const queueOptions = { connection: exports.queueConnection };
exports.emailQueue = new bullmq_1.Queue('email', queueOptions);
exports.workflowQueue = new bullmq_1.Queue('workflow', queueOptions);
exports.webhookQueue = new bullmq_1.Queue('webhook', queueOptions);
exports.aiQueue = new bullmq_1.Queue('ai', queueOptions);
exports.analyticsQueue = new bullmq_1.Queue('analytics', queueOptions);
exports.storageQueue = new bullmq_1.Queue('storage', queueOptions);
exports.billingQueue = new bullmq_1.Queue('billing', queueOptions);
exports.notificationQueue = new bullmq_1.Queue('notification', queueOptions);
async function setupQueues() {
    logger_1.logger.info(`✅ Job queues initialized (${queueRedisUrl.replace(/\/\/[^@]*@/, '//***@')})`);
}
//# sourceMappingURL=queues.js.map