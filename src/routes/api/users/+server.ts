import { json } from '@sveltejs/kit';
import { createUser, getUserByName } from '../../../lib/server/db';
import type { RequestHandler } from './$types';
import { getAllUsers } from '$lib/server/db';
import type { User } from '$lib/types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return json({ error: true, message: 'User name is required and must be a string.', code: 'INVALID_INPUT' }, { status: 400 });
    }

    let user = await getUserByName(name);
    if (!user) {
      user = await createUser(name);
    }
    
    // The user object from db functions should match the API spec response
    // { id, name, balance, itemsSold, itemsBought }
    return json(user, { status: user ? 200 : 201 }); // 200 if found, 201 if created

  } catch (e: any) {
    // Catch if request.json() fails or other errors
    if (e instanceof SyntaxError) {
      return json({ error: true, message: 'Invalid JSON in request body.', code: 'INVALID_INPUT' }, { status: 400 });
    }
    console.error('Error in /api/users POST:', e);
    return json({ error: true, message: 'Internal server error.', code: 'INTERNAL_ERROR', details: e.message }, { status: 500 });
  }
}; 

export const GET: RequestHandler = async () => {
    try {
        const users: Pick<User, 'id' | 'name' | 'balance'>[] = await getAllUsers();
        return json(users);
    } catch (error) {
        console.error('Error fetching users for admin:', error);
        return json(
            { success: false, message: 'Failed to retrieve users.' },
            { status: 500 }
        );
    }
};