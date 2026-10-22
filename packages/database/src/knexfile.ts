import type { Knex } from 'knex';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load the repo-root .env so migrations/seeds always target the same database
// as the API, regardless of the directory the CLI is invoked from.
function findUp(startDir: string, fileName: string): string | null {
  let dir = path.resolve(startDir);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const candidate = path.join(dir, fileName);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

const rootEnv = findUp(__dirname, '.env');
if (rootEnv) {
  dotenv.config({ path: rootEnv });
}

const config: Record<string, Knex.Config> = {
  development: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL || 'postgresql://nexos_user:nexos_pass@localhost:5434/nexos_db',
    migrations: { directory: path.resolve(__dirname, 'migrations'), extension: 'ts' },
    seeds: { directory: path.resolve(__dirname, 'seeds'), extension: 'ts' },
    pool: { min: 2, max: 10 },
  },
  test: {
    client: 'postgresql',
    connection: process.env.TEST_DATABASE_URL || 'postgresql://nexos_user:nexos_pass@localhost:5434/nexos_test_db',
    migrations: { directory: path.resolve(__dirname, 'migrations'), extension: 'ts' },
    seeds: { directory: path.resolve(__dirname, 'seeds'), extension: 'ts' },
    pool: { min: 1, max: 5 },
  },
  production: {
    client: 'postgresql',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    },
    migrations: { directory: path.resolve(__dirname, 'migrations'), extension: 'ts' },
    pool: { min: 2, max: 20 },
  },
};

export default config;
