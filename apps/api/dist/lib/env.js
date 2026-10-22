"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("./logger");
/**
 * Walks up the directory tree looking for the first `.env` file.
 */
function findUp(startDir, fileName) {
    let dir = path_1.default.resolve(startDir);
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const candidate = path_1.default.join(dir, fileName);
        if (fs_1.default.existsSync(candidate))
            return candidate;
        const parent = path_1.default.dirname(dir);
        if (parent === dir)
            return null;
        dir = parent;
    }
}
/**
 * Loads `.env` files for the API.
 *
 * The API package lives at `apps/api`, so `dotenv/config` (which resolves
 * `.env` against `process.cwd()`) picks up an app-local `.env` instead of the
 * repo-root one that the rest of the monorepo (database package, Docker
 * Compose) uses. We therefore search upward from both the working directory
 * and the source directory and load every match, nearest first, so the
 * repo-root `.env` still supplies anything the app-local file omits.
 */
function loadEnv() {
    const found = [];
    for (const start of [process.cwd(), __dirname]) {
        const file = findUp(start, '.env');
        if (file && !found.includes(file))
            found.push(file);
    }
    // dotenv never overrides a variable that is already defined, so anything
    // inherited from the shell (a PowerShell profile, a CI variable, …) wins
    // over the project `.env`. That is occasionally what you want, but far more
    // often it is a leftover from another project — so remember the conflicts
    // and report them instead of failing later with a cryptic DB error.
    const shadowed = new Map();
    for (const file of found) {
        const parsed = dotenv_1.default.parse(fs_1.default.readFileSync(file));
        for (const key of Object.keys(parsed)) {
            if (shadowed.has(key))
                continue;
            const inherited = process.env[key];
            if (inherited !== undefined && inherited !== parsed[key]) {
                shadowed.set(key, inherited);
            }
        }
    }
    for (const file of found) {
        // dotenv never overrides an already-defined variable, so the first file
        // found (closest to the app) takes precedence.
        dotenv_1.default.config({ path: file });
    }
    for (const [key, value] of shadowed) {
        logger_1.logger.warn(`WARNING: ${key} is set in your shell ("${value}") and overrides the value from .env - ` +
            `remove it from the shell (or your PowerShell profile) to use the project configuration.`);
    }
}
loadEnv();
//# sourceMappingURL=env.js.map