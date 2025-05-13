import { json } from '@sveltejs/kit';
import { getItemByIdWithHistory } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  try {
    const itemId = parseInt(params.id, 10);

    if (isNaN(itemId)) {
      return json({ error: true, message: 'Item ID must be a valid number.', code: 'INVALID_INPUT' }, { status: 400 });
    }

    const itemDetails = await getItemByIdWithHistory(itemId);

    if (!itemDetails) {
      return json({ error: true, message: 'Item not found.', code: 'NOT_FOUND' }, { status: 404 });
    }
    
    // API Spec: { id, title, description, seller: {id, name}, sold, createdAt, auctionHistory: [{userId, userName, amount, timestamp}] }
    // db.getItemByIdWithHistory should return this structure.
    return json(itemDetails);

  } catch (e: any) {
    console.error(`Error in /api/items/${params.id} GET:`, e);
    return json({ error: true, message: 'Internal server error.', code: 'INTERNAL_ERROR', details: e.message }, { status: 500 });
  }
};