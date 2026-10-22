import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'development'
      ? combine(colorize(), simple())
      : combine(timestamp(), errors({ stack: true }), json()),
  }),
];

if (process.env.NODE_ENV === 'production') {
  transports.push(
    new DailyRotateFile({ filename: 'logs/error-%DATE%.log', datePattern: 'YYYY-MM-DD', level: 'error', maxFiles: '30d', zippedArchive: true }),
    new DailyRotateFile({ filename: 'logs/combined-%DATE%.log', datePattern: 'YYYY-MM-DD', maxFiles: '14d', zippedArchive: true })
  );
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(timestamp(), errors({ stack: true }), json()),
  transports,
  exitOnError: false,
});
