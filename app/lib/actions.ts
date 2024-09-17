'use server';
import { z } from 'zod';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { query } from './db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Form schema for invoice creation and updating
const FormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(['pending', 'paid']),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

// Create a new invoice
export async function createInvoice(formData: FormData) {
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];

  const insertQuery = `
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;

  const values = [customerId, amountInCents, status, date];

  try {
    const result = await query(insertQuery, values);
    revalidatePath('/dashboard/invoices'); // Revalidate the invoice page cache
    redirect('/dashboard/invoices'); // Redirect to invoices page
    return result.rows[0]; // Return the newly inserted invoice
  } catch (error) {
    console.error('Error inserting invoice:', error);
    throw new Error('Could not create the invoice.');
  }
}

const UpdateInvoice = z.object({
  customerId: z.string(),
  amount: z.number(), // This expects a number
  status: z.enum(['pending', 'paid']),
});

export async function updateInvoice(id: string, formData: FormData) {
  // Convert form data to a plain object
  const formObject: { [key: string]: string | undefined } = {};
  
  formData.forEach((value, key) => {
    formObject[key] = value as string;
  });

  // Ensure amount is converted to a number
  const amount = parseFloat(formObject['amount'] ?? 'NaN');
  
  // Parse the form data with the correct types
  const { customerId, status } = UpdateInvoice.parse({
    customerId: formObject['customerId'],
    amount: isNaN(amount) ? 0 : amount, // Handle NaN by providing a default value
    status: formObject['status'],
  });

  const amountInCents = amount * 100;

  await query(
    `
    UPDATE invoices
    SET customer_id = $1, amount = $2, status = $3
    WHERE id = $4
    `,
    [customerId, amountInCents, status, id]
  );

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
  const deleteQuery = `
    DELETE FROM invoices
    WHERE id = $1
  `;

  try {
    await query(deleteQuery, [id]);
    revalidatePath('/dashboard/invoices');
    return { message: 'Deleted Invoice' };
  } catch (error) {
    console.error('Database Error:', error);
    return { message: 'Database Error: Failed to Delete Invoice.' };
  }
}

// Handle user authentication
export async function authenticate(
  prevState: string | undefined,
  formData: FormData | undefined, // Ensure formData can be undefined
) {
  if (!formData) {
    return 'Form data is missing.';
  }

  try {
    const formObject: { [key: string]: string } = {};

    if (formData instanceof FormData) {
      formData.forEach((value, key) => {
        formObject[key] = value as string;
      });
    } else {
      return 'Invalid form data.';
    }

    const response = await signIn('credentials', {
      redirect: false,
      ...formObject,
    });

    if (response?.error) {
      return response.error;
    }

    return undefined; // Success, no error message
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}
