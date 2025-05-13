import { json } from '@sveltejs/kit';
import { getCurrentAuction } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  try {
    const currentAuction = await getCurrentAuction();

    if (!currentAuction) {
      // API spec says: Returns 404 if no auction is currently active
      // However, the response for current auction also has an "active": "boolean" field.
      // Let's assume db.getCurrentAuction() returns null if no *active* auction row exists.
      // The API spec for the success case shows an object that itself contains "active: boolean".
      // It might be better to always return an object, with active: false if no auction.
      // For now, strictly following "Returns 404 if no auction is currently active".
      // And if an auction object IS returned, it should reflect its active status from db.
       return json({ error: true, message: 'No active auction found.', code: 'NOT_FOUND' }, { status: 404 });
    }

    // API Spec for success:
    // { active, item: {id, title, desc, seller}, auctionType, startTime, endTime, currentPrice, winningBidder, bids, timeRemaining, bidHistory }
    // db.getCurrentAuction() should provide this structure.
    return json(currentAuction);

  } catch (e: any) {
    console.error('Error in /api/auctions/current GET:', e);
    return json({ error: true, message: 'Internal server error.', code: 'INTERNAL_ERROR', details: e.message }, { status: 500 });
  }
};