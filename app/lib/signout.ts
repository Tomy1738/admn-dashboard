'use server';

import { signOut as authSignOut } from '@/auth';

export async function signOutAndRedirect() {
  await authSignOut(); // Perform the sign-out
  const homeUrl = '/'; // Define the URL to redirect to
  console.log('Redirecting to:', homeUrl); // Log the URL
  return homeUrl;
}