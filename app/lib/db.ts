// db.ts
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Configure the database connection using the connection string from .env
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false, // Necessary for some cloud providers like Neon.tech
  }
});

// Utility function to query the database
export async function query<T>(text: string, params?: any[]): Promise<{ rows: T[] }> {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res as { rows: T[] };
  } catch (err) {
    console.error('Query Error:', err);
    throw err;
  } finally {
    client.release();
  }
}
