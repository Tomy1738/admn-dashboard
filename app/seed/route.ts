import { Pool } from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { invoices, customers, revenue, users } from '../lib/placeholder-data';

dotenv.config(); // Load environment variables from .env file

// Create a pool of connections
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

async function seedUsers() {
  const client = await pool.connect();
  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      );
    `);

    const insertedUsers = await Promise.all(
      users.map(async (user) => {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        return client.query(`
          INSERT INTO users (id, name, email, password)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (id) DO NOTHING;
        `, [user.id, user.name, user.email, hashedPassword]);
      })
    );

    return insertedUsers;
  } finally {
    client.release(); // Release the client back to the pool
  }
}

async function seedInvoices() {
  const client = await pool.connect();
  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        customer_id UUID NOT NULL,
        amount INT NOT NULL,
        status VARCHAR(255) NOT NULL,
        date DATE NOT NULL
      );
    `);

    const insertedInvoices = await Promise.all(
      invoices.map(
        (invoice) =>
          client.query(`
            INSERT INTO invoices (customer_id, amount, status, date)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id) DO NOTHING;
          `, [invoice.customer_id, invoice.amount, invoice.status, invoice.date])
      )
    );

    return insertedInvoices;
  } finally {
    client.release(); // Release the client back to the pool
  }
}

async function seedCustomers() {
  const client = await pool.connect();
  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        image_url VARCHAR(255) NOT NULL
      );
    `);

    const insertedCustomers = await Promise.all(
      customers.map(
        (customer) =>
          client.query(`
            INSERT INTO customers (id, name, email, image_url)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id) DO NOTHING;
          `, [customer.id, customer.name, customer.email, customer.image_url])
      )
    );

    return insertedCustomers;
  } finally {
    client.release(); // Release the client back to the pool
  }
}

async function seedRevenue() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS revenue (
        month VARCHAR(4) NOT NULL UNIQUE,
        revenue INT NOT NULL
      );
    `);

    const insertedRevenue = await Promise.all(
      revenue.map(
        (rev) =>
          client.query(`
            INSERT INTO revenue (month, revenue)
            VALUES ($1, $2)
            ON CONFLICT (month) DO NOTHING;
          `, [rev.month, rev.revenue])
      )
    );

    return insertedRevenue;
  } finally {
    client.release(); // Release the client back to the pool
  }
}

export async function GET() {
  try {
    await pool.query('BEGIN');
    await seedUsers(); // Call seedUsers to insert user data
    await seedCustomers();
    await seedInvoices();
    await seedRevenue();
    await pool.query('COMMIT');

    return new Response(JSON.stringify({ message: 'Database seeded successfully' }), { status: 200 });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Seeding error:', error); // Log the error to the console
    
    // Provide more details in the response
    let errorMessage = 'An error occurred during seeding';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}
