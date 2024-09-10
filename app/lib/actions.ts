'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

export async function authenticate(
  prevState: string | undefined,
  formData: FormData | undefined, // Ensure formData can be undefined
) {
  if (!formData) {
    return 'Form data is missing.';
  }

  try {
    // Convert FormData to a plain object
    const formObject: { [key: string]: string } = {};
    
    // Check if formData is an instance of FormData
    if (formData instanceof FormData) {
      formData.forEach((value, key) => {
        formObject[key] = value as string;
      });
    } else {
      return 'Invalid form data.';
    }

    // Call signIn with the form data
    const response = await signIn('credentials', {
      redirect: false, // Adjust if you want automatic redirection
      ...formObject,
    });

    // Log the response for debugging
    console.log('Sign-in response:', response);

    if (response?.error) {
      return response.error;
    }

    // Handle success case
    return undefined; // No error message means success
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
