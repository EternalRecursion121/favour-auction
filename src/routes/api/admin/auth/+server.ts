import { ADMIN_PASSWORD } from '$env/static/private';
import { apiHandler, createError } from '$lib/server/error';
import { adminAuthSchema } from '$lib/server/schema';

export async function GET({ cookies }) {
  return apiHandler(
    { cookies },
    async () => {
      // Check if admin is authenticated via cookie
      const isAdmin = cookies.get('admin_authenticated') === 'true';

      return {
        authenticated: isAdmin
      };
    }
  );
}

export async function POST({ request, cookies }) {
  return apiHandler(
    { request, cookies },
    async () => {
      const body = await request.json();
      const { password } = adminAuthSchema.parse(body);

      if (password !== ADMIN_PASSWORD) {
        throw createError('UNAUTHORIZED', 'Invalid admin password');
      }

      // Set a cookie to indicate admin auth
      cookies.set('admin_authenticated', 'true', {
        path: '/',
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 // 24 hours
      });

      return {
        authenticated: true
      };
    }
  );
}