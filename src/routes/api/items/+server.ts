import { json } from '@sveltejs/kit';
import { getItems, addItem as dbAddItem, getAuctionConfig } from '../../../lib/server/db';
import type { RequestHandler } from './$types';
import type { Item } from '$lib/types';

export const GET: RequestHandler = async () => {
  try {
    const items = await getItems();
    // API Spec: [{ id, title, description, seller: {id, name}, sold, createdAt }]
    // db.getItems() should already return this structure.
    return json(items);
  } catch (e: any) {
    console.error('Error in /api/items GET:', e);
    return json({ error: true, message: 'Internal server error.', code: 'INTERNAL_ERROR', details: e.message }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    // Check auction config if new items are allowed
    const config = await getAuctionConfig();
    if (!config.allowNewItems) {
      return json({ error: true, message: 'Adding new items is currently disabled.', code: 'FORBIDDEN' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, sellerId } = body;

    if (!title || typeof title !== 'string' || !sellerId || typeof sellerId !== 'number') {
      return json({ error: true, message: 'Title (string) and sellerId (number) are required.', code: 'INVALID_INPUT' }, { status: 400 });
    }
    // Description is optional, but if provided, should be a string
    if (description && typeof description !== 'string') {
      return json({ error: true, message: 'Description must be a string if provided.', code: 'INVALID_INPUT' }, { status: 400 });
    }

    const newItem: Item = await dbAddItem(title, description || '', sellerId);
    
    // API Spec: { id, title, description, seller: {id, name}, sold, createdAt }
    // dbAddItem should return this structure.
    return json(newItem, { status: 201 });

  } catch (e: any) {
    if (e instanceof SyntaxError) {
      return json({ error: true, message: 'Invalid JSON in request body.', code: 'INVALID_INPUT' }, { status: 400 });
    }
    console.error('Error in /api/items POST:', e);
    return json({ error: true, message: 'Internal server error.', code: 'INTERNAL_ERROR', details: e.message }, { status: 500 });
  }
}; 