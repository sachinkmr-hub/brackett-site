import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from './schema.js';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is missing');
}

const poolMax = Number(process.env.PG_POOL_MAX || 10);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number.isFinite(poolMax) && poolMax > 0 ? poolMax : 10,
});

pool.on('error', (error) => {
  logger.error({ err: error }, 'Postgres pool client error');
});

export const db = drizzle(pool, { schema });
