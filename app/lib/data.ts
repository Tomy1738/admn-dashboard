import { query } from "./db";
import { formatCurrency } from "./utils";
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  LatestInvoice,
  Revenue,
} from "./definitions";
import { CountResult, InvoiceStatusResult } from "./definitions";

const ITEMS_PER_PAGE = 6;

export async function fetchRevenue(): Promise<Revenue[]> {
  try {
    // Fetch data
    const result = await query("SELECT * FROM revenue");

    // Transform the data to match the Revenue type
    const rows: Revenue[] = result.rows.map((row: any) => ({
      month: row.month,
      revenue: row.revenue,
    }));

    return rows;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch revenue data.");
  }
}

export async function fetchLatestInvoices(): Promise<LatestInvoice[]> {
    try {
      const result = await query(`
        SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
        FROM invoices
        JOIN customers ON invoices.customer_id = customers.id
        ORDER BY invoices.date DESC
        LIMIT 5
      `);
  
      // Transform the data to match LatestInvoice type
      const latestInvoices: LatestInvoice[] = result.rows.map((invoice: any) => ({
        ...invoice,
        amount: formatCurrency(invoice.amount),  // Convert number to string
      }));
  
      return latestInvoices;
    } catch (error) {
      console.error("Database Error:", error);
      throw new Error("Failed to fetch the latest invoices.");
    }
  }
  

export async function fetchCardData(): Promise<{
  numberOfCustomers: number;
  numberOfInvoices: number;
  totalPaidInvoices: string;
  totalPendingInvoices: string;
}> {
  try {
    // Query the data
    const invoiceCountResult = await query("SELECT COUNT(*) FROM invoices");
    const customerCountResult = await query("SELECT COUNT(*) FROM customers");
    const invoiceStatusResult = await query(`
        SELECT
          SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS paid,
          SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS pending
        FROM invoices
      `);

    // Ensure the data has the expected properties
    const invoiceCountRow: CountResult = invoiceCountResult
      .rows[0] as CountResult;
    const customerCountRow: CountResult = customerCountResult
      .rows[0] as CountResult;
    const invoiceStatusRow: InvoiceStatusResult = invoiceStatusResult
      .rows[0] as InvoiceStatusResult;

    // Check if rows exist and have the required properties
    if (invoiceCountRow && "count" in invoiceCountRow) {
      const numberOfInvoices = Number(invoiceCountRow.count ?? "0");
      const numberOfCustomers = Number(customerCountRow.count ?? "0");
      const totalPaidInvoices = formatCurrency(invoiceStatusRow.paid ?? 0);
      const totalPendingInvoices = formatCurrency(
        invoiceStatusRow.pending ?? 0
      );

      return {
        numberOfCustomers,
        numberOfInvoices,
        totalPaidInvoices,
        totalPendingInvoices,
      };
    } else {
      throw new Error("Unexpected result structure from database queries.");
    }
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch card data.");
  }
}

export async function fetchFilteredInvoices(
  queryString: string,
  currentPage: number
): Promise<InvoiceForm[]> {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    const { rows } = await query<InvoiceForm>(
      `
      SELECT
        invoices.id,
        invoices.amount,
        invoices.date,
        invoices.status,
        customers.name,
        customers.email,
        customers.image_url
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE
        customers.name ILIKE $1 OR
        customers.email ILIKE $1 OR
        invoices.amount::text ILIKE $1 OR
        invoices.date::text ILIKE $1 OR
        invoices.status ILIKE $1
      ORDER BY invoices.date DESC
      LIMIT $2 OFFSET $3
    `,
      [`%${queryString}%`, ITEMS_PER_PAGE, offset]
    );

    return rows;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch invoices.");
  }
}

export async function fetchInvoicesPages(queryString: string): Promise<number> {
    try {
      // Specify the type for the query result
      const { rows } = await query<CountResult>(`
        SELECT COUNT(*)
        FROM invoices
        JOIN customers ON invoices.customer_id = customers.id
        WHERE
          customers.name ILIKE $1 OR
          customers.email ILIKE $1 OR
          invoices.amount::text ILIKE $1 OR
          invoices.date::text ILIKE $1 OR
          invoices.status ILIKE $1
      `, [`%${queryString}%`]);
  
      // Type assertion to ensure rows[0] conforms to CountResult
      const countResult = rows[0] as CountResult;
      
      // Convert count to number and calculate total pages
      const totalPages = Math.ceil(Number(countResult.count) / ITEMS_PER_PAGE);
      return totalPages;
    } catch (error) {
      console.error('Database Error:', error);
      throw new Error('Failed to fetch total number of invoices.');
    }
  }

export async function fetchInvoiceById(id: string): Promise<InvoiceForm> {
  try {
    const { rows } = await query<InvoiceForm>(
      `
      SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status
      FROM invoices
      WHERE invoices.id = $1
    `,
      [id]
    );

    const invoice = rows.map((inv) => ({
      ...inv,
      amount: inv.amount / 100, // Convert amount from cents to dollars
    }));

    return invoice[0];
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch invoice.");
  }
}

export async function fetchCustomers(): Promise<CustomerField[]> {
  try {
    const { rows } = await query<CustomerField>(`
      SELECT
        id,
        name
      FROM customers
      ORDER BY name ASC
    `);

    return rows;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch all customers.");
  }
}

export async function fetchFilteredCustomers(queryString: string): Promise<CustomersTableType[]> {
    try {
      const { rows } = await query<CustomersTableType>(`
        SELECT
          customers.id,
          customers.name,
          customers.email,
          customers.image_url,
          COUNT(invoices.id) AS total_invoices,
          SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
          SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
        FROM customers
        LEFT JOIN invoices ON customers.id = invoices.customer_id
        WHERE
          customers.name ILIKE $1 OR
          customers.email ILIKE $1
        GROUP BY customers.id, customers.name, customers.email, customers.image_url
        ORDER BY customers.name ASC
      `, [`%${queryString}%`]);
  
      // No need to format here if `CustomersTableType` expects numbers
      return rows;
    } catch (error) {
      console.error("Database Error:", error);
      throw new Error("Failed to fetch customer table.");
    }
  }
