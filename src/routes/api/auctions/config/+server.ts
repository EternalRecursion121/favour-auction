import { json } from '@sveltejs/kit';
import { getAuctionConfig } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  try {
    const config = await getAuctionConfig();
    // API Spec: { auctionType, allowNewItems, pennyAuctionConfig: { incrementAmount, timeExtension, minimumTimeRemaining } }
    // db.getAuctionConfig() should return this structure.
    // Ensure pennyAuctionConfig is an object, not a JSON string, if it comes from DB as string.
    // (Handled in db.ts)
    return json(config);
  } catch (e: any) {
    console.error('Error in /api/auctions/config GET:', e);
    return json({ error: true, message: 'Internal server error.', code: 'INTERNAL_ERROR', details: e.message }, { status: 500 });
  }
};