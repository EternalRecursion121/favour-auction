import { getAllItems, createItem, getAuctionConfig } from '$lib/server/db';
import { apiHandler, createError } from '$lib/server/error';
import { itemSchema } from '$lib/server/schema';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  try {
    const items = await getAllItems();
    return json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    return json({ message: 'Failed to fetch items' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {


  try {
    const config = await getAuctionConfig();
    if (!config?.allowNewItems) {
      return json({ message: 'Adding new items is currently disabled' }, { status: 403 });
    }

    const body = await request.json();
    if (!body.title || !body.sellerId) {
      return json({ message: 'Missing required fields: title and sellerId' }, { status: 400 });
    }
    

    const newItem = await createItem(body.title, body.description || '', body.sellerId);
    return json(newItem, { status: 201 });

  } catch (error) {
    console.error('Error creating item:', error);
    if (error instanceof SyntaxError) {
        return json({ message: 'Invalid request body' }, { status: 400 });
    }
    return json({ message: 'Failed to create item' }, { status: 500 });
  }
};