import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { query } from './app/lib/db'; // Adjust the path as needed
import type { User } from '@/app/lib/definitions';

// Function to get the user from the database
async function getUser(email: string): Promise<User | undefined> {
  try {
    const result = await query<User>('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0]; // Return the first row from the query result
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}

export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "user@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Ensure credentials are available
        if (!credentials?.email || !credentials?.password) {
          console.log("Missing email or password");
          return null;
        }
    
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);
    
        if (!parsedCredentials.success) {
          console.log('Invalid input format', parsedCredentials.error);
          return null;
        }
    
        const { email, password } = parsedCredentials.data;
        const user = await getUser(email);
    
        if (!user) {
          console.log("No user found for email:", email);
          return null;
        }
    
        const passwordsMatch = await bcrypt.compare(password, user.password);
        if (!passwordsMatch) {
          console.log("Password does not match for user:", email);
          return null;
        }
    
        return user;
      }
    }),
    
  ],
});
