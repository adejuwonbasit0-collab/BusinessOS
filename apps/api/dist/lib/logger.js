"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const { combine, timestamp, errors, json, colorize, simple } = winston_1.default.format;
const transports = [
    new winston_1.default.transports.Console({
        format: process.env.NODE_ENV === 'development'
            ? combine(colorize(), simple())
            : combine(timestamp(), errors({ stack: true }), json()),
    }),
];
if (process.env.NODE_ENV === 'production') {
    transports.push(new winston_daily_rotate_file_1.default({ filename: 'logs/error-%DATE%.log', datePattern: 'YYYY-MM-DD', level: 'error', maxFiles: '30d', zippedArchive: true }), new winston_daily_rotate_file_1.default({ filename: 'logs/combined-%DATE%.log', datePattern: 'YYYY-MM-DD', maxFiles: '14d', zippedArchive: true }));
}
exports.logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(timestamp(), errors({ stack: true }), json()),
    transports,
    exitOnError: false,
});
//# sourceMappingURL=logger.js.map