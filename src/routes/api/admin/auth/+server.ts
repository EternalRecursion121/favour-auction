import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/admin/auth
// As requested, this is public and always returns authenticated: true
export const GET: RequestHandler = async () => {
  return json({ authenticated: true });
};

// POST /api/admin/auth
// As requested, this is public and always returns authenticated: true without checking password.
export const POST: RequestHandler = async ({ request }) => {
  try {
    // Optionally, you could still expect a password in the body for API compatibility,
    // but just not validate it.
    // const body = await request.json();
    // const { password } = body;
    // console.log('Admin login attempt (password not checked):', password ? 'password provided' : 'no password provided');
    return json({ authenticated: true });
  } catch (e: any) {
    if (e instanceof SyntaxError) {
      return json({ error: true, message: 'Invalid JSON in request body.', code: 'INVALID_INPUT' }, { status: 400 });
    }
    console.error('Error in /api/admin/auth POST:', e);
    return json({ error: true, message: 'Internal server error.', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}; 