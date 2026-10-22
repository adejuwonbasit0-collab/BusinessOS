"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestId = exports.validate = exports.authFloodLimiter = exports.authRateLimiter = exports.rateLimiter = exports.errorHandler = exports.asyncHandler = void 0;
exports.safeRouter = safeRouter;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const express_validator_1 = require("express-validator");
const uuid_1 = require("uuid");
const logger_1 = require("../lib/logger");
const errors_1 = require("../lib/errors");
const asyncHandler = (handler) => (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
};
exports.asyncHandler = asyncHandler;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Every `*id` column in the schema is a UUID, so any param named like an id
// must be one. Params such as `:token` or `:provider` are not ids and are
// therefore left alone.
const ID_PARAM_RE = /id$/i;
/**
 * Makes a router safe for Express 4.
 *
 * Express 4 only forwards *synchronous* throws to the error handler — a
 * rejected promise from an `async` controller escapes as an unhandled
 * rejection, which terminates the process on modern Node versions. This
 * wrapper:
 *
 *   1. forwards rejected promises (and synchronous throws) to `next()`, so
 *      they are rendered by `errorHandler` instead of crashing the API, and
 *   2. rejects malformed UUID route params with a 400 before they reach
 *      PostgreSQL (which would otherwise raise a 22P02 cast error).
 *
 * Usage: `app.use('/api/v1/projects', safeRouter(projectsRouter));`
 */
function safeRouter(router) {
    router.stack.forEach((layer) => {
        if (!layer.route)
            return;
        layer.route.stack.forEach((routeLayer) => {
            const handler = routeLayer.handle;
            if (typeof handler !== 'function' || handler.length >= 4)
                return; // error handler
            routeLayer.handle = (req, res, next) => {
                for (const key of Object.keys(req.params || {})) {
                    const value = req.params[key];
                    if (value && ID_PARAM_RE.test(key) && !UUID_RE.test(value)) {
                        return next(new errors_1.AppError(`Invalid ${key} parameter`, 400, 'INVALID_PARAMETER'));
                    }
                }
                try {
                    const result = handler(req, res, next);
                    if (result && typeof result.catch === 'function') {
                        result.catch(next);
                    }
                }
                catch (err) {
                    next(err);
                }
            };
        });
    });
    return router;
}
const errorHandler = (err, req, res, _next) => {
    let statusCode = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details;
    if (err instanceof errors_1.AppError) {
        statusCode = err.statusCode;
        code = err.code;
        message = err.message;
        details = err.details;
    }
    else if (err.type === 'entity.parse.failed') {
        statusCode = 400;
        code = 'INVALID_JSON';
        message = 'Invalid JSON in request body';
    }
    else if (err.code === '23505') {
        statusCode = 409;
        code = 'DUPLICATE_ENTRY';
        message = 'A record with this value already exists';
    }
    else if (err.code === '23503') {
        statusCode = 400;
        code = 'INVALID_REFERENCE';
        message = 'Referenced record does not exist';
    }
    else if (err.code === '23502') {
        // not_null_violation — a required column was left empty.
        statusCode = 422;
        code = 'MISSING_FIELD';
        message = `Missing required field: ${err.column || 'unknown'}`;
        details = [{ field: err.column, message: 'is required' }];
    }
    else if (err.code === '23514') {
        // check_violation — e.g. a value outside an enum-like CHECK constraint.
        statusCode = 422;
        code = 'CONSTRAINT_VIOLATION';
        message = `Value violates the "${err.constraint || 'unknown'}" constraint`;
    }
    else if (err.code === '22P02') {
        // invalid_text_representation — e.g. a string written into a jsonb column.
        statusCode = 422;
        code = 'INVALID_VALUE';
        message = `Invalid value for "${err.column || 'field'}"`;
    }
    else if (err.code === '22001') {
        // string_data_right_truncation — value longer than the column allows.
        statusCode = 422;
        code = 'VALUE_TOO_LONG';
        message = `Value for "${err.column || 'field'}" is too long`;
    }
    if (statusCode >= 500) {
        logger_1.logger.error('Server Error:', {
            error: err.message, stack: err.stack, path: req.path, method: req.method,
            requestId: req.headers['x-request-id'], tenantId: req.tenant?.id, userId: req.user?.id,
        });
    }
    res.status(statusCode).json({
        success: false,
        error: { code, message, ...(details && { details }) },
        requestId: req.headers['x-request-id'],
    });
};
exports.errorHandler = errorHandler;
/**
 * Rate limiter for authenticated API traffic.
 *
 * It has to run *after* `authenticate` so that `req.user` is populated —
 * otherwise the bucket can only be keyed by IP, which means every user behind
 * the same address (a shared office IP, a NAT gateway, or simply every
 * browser on a developer machine) shares a single budget and starts receiving
 * 429s long before any individual caller has hit the limit.
 *
 * The key therefore prefers the authenticated user, falls back to the tenant
 * and finally to the client address. Mount it together with `authenticate`:
 *
 *   router.use(authenticate, rateLimiter);
 */
exports.rateLimiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id || req.tenant?.id || req.ip || 'unknown',
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Please slow down.' },
        });
    },
});
exports.authRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '10', 10),
    standardHeaders: true,
    legacyHeaders: false,
    // Keyed on the address *and* the account being tried, so that one user
    // repeatedly mistyping their password cannot lock out everyone else behind
    // the same address (a school lab, an office behind one NAT gateway).
    // `authFloodLimiter` still caps the address as a whole, so spraying many
    // different accounts from one place does not get around this.
    keyGenerator: (req) => {
        const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase() : '';
        return `${req.ip || 'unknown'}:${email}`;
    },
    // Only *failed* attempts count towards the limit. Brute force is made of
    // failed attempts, so limiting those is what actually protects the account
    // — while a successful sign-in (or a single mistyped password) no longer
    // eats into the budget that everyone behind the same address shares.
    skipSuccessfulRequests: true,
    message: { success: false, error: { code: 'AUTH_RATE_LIMIT', message: 'Too many attempts. Try again in 15 minutes.' } },
});
/**
 * Flood guard for the unauthenticated `/auth` routes.
 *
 * The general `rateLimiter` counts *every* request, and on the auth routes it
 * can only be keyed by IP — so a burst of legitimate sign-ins (a school lab
 * or an office behind one NAT address) burned the shared budget and locked
 * everybody out even though nobody had failed anything.
 *
 * This variant counts failed responses only, which is the traffic worth
 * limiting, and gives the non-credential endpoints (2FA verification, magic
 * links, password reset) a ceiling of their own.
 *
 * The ceiling is deliberately generous: `authRateLimiter` already locks a
 * single account after a handful of failures, so this only needs to stop a
 * sustained spray of many accounts from one address. Setting it too low means
 * one shared address locks everybody out — which is far more likely to hurt
 * real users than to stop an attacker, who is already stopped per account.
 */
exports.authFloodLimiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '10', 10) * 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip || 'unknown',
    skipSuccessfulRequests: true,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            error: { code: 'AUTH_RATE_LIMIT', message: 'Too many attempts. Try again in 15 minutes.' },
        });
    },
});
const validate = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR', message: 'Validation failed',
                details: errors.array().map((e) => ({ field: e.path, message: e.msg, value: e.value })),
            },
        });
    }
    return next();
};
exports.validate = validate;
const requestId = (req, res, next) => {
    const id = req.headers['x-request-id'] || (0, uuid_1.v4)();
    req.headers['x-request-id'] = id;
    res.setHeader('X-Request-ID', id);
    next();
};
exports.requestId = requestId;
//# sourceMappingURL=index.js.map