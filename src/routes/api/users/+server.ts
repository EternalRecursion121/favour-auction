import { json } from '@sveltejs/kit';
import { getOrCreateUser } from '$lib/server/db';
import { apiHandler, createError } from '$lib/server/error';
import { userSchema } from '$lib/server/schema';

export async function POST({ request }) {
  return apiHandler(
    { request },
    async () => {
      const body = await request.json();
      const { name } = userSchema.parse(body);
      
      if (!name) {
        throw createError('INVALID_INPUT', 'Name is required');
      }
      
      const user = await getOrCreateUser(name);
      
      return {
        id: user.id,
        name: user.name,
        balance: user.balance,
        // These would be calculated from the DB in a real implementation
        itemsSold: 0,
        itemsBought: 0
      };
    }
  );
}

export async function GET() {
  // This endpoint would list all users - only needed for admin
  return json({ message: 'Not implemented' });
}