import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    await pool.query('DROP TABLE IF EXISTS announcement_deliveries CASCADE');
    await pool.query('DROP TABLE IF EXISTS question_events CASCADE');
    await pool.query('DROP TABLE IF EXISTS question_assignees CASCADE');
    await pool.query('DROP TABLE IF EXISTS questions CASCADE');
    console.log('Old tables dropped successfully.');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
