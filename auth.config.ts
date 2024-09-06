import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');

      if (isOnDashboard) {
        if (isLoggedIn) return true; // Allow access to dashboard if logged in
        return Response.redirect(new URL('/login', nextUrl)); // Redirect to login if not logged in
      } else if (isLoggedIn) {
        return Response.redirect(new URL('/dashboard', nextUrl)); // Redirect to dashboard if logged in and not on dashboard
      }

      return true; // Allow access to other pages if not logged in
    },
  },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;