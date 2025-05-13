import { json } from '@sveltejs/kit';
import { getAuctionResults as dbGetAuctionResults } from '../../../../lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  // No authentication check as per user request
  try {
    const results = await dbGetAuctionResults();
    // API Spec for AuctionResult object:
    // { id, item: {id, title, description}, seller: {id, name}, buyer: {id, name}, price, auctionType, completedAt }
    // db.getAuctionResults() is expected to return this structure (with the type cast for item object).
    return json(results);
  } catch (e: any) {
    console.error('Error in /api/admin/results GET:', e);
    return json({ error: true, message: 'Internal server error.', code: 'INTERNAL_ERROR', details: e.message }, { status: 500 });
  }
}; 