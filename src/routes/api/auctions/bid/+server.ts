import { json } from '@sveltejs/kit';
import { placeBid } from '../../../lib/server/db'; // db.placeBid is currently a placeholder
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { userId, itemId, amount } = body;

    if (typeof userId !== 'number' || typeof itemId !== 'number' || typeof amount !== 'number') {
      return json({ error: true, message: 'userId, itemId, and amount must all be numbers.', code: 'INVALID_INPUT' }, { status: 400 });
    }

    if (amount <= 0) {
        return json({ error: true, message: 'Bid amount must be positive.', code: 'INVALID_INPUT' }, { status: 400 });
    }

    // TODO: db.placeBid needs full implementation including:
    // 1. Check if auction is active for itemId
    // 2. Validate bid (e.g., > currentPrice for English, user balance check)
    // 3. Update user balance (potential deduction or hold)
    // 4. Record bid in bids table
    // 5. Update auction current_price, winning_bidder_id, end_time (if penny auction extension)
    // 6. Record balance history entry
    // All of this should be in a TRANSACTION in db.placeBid

    const bidResult = await placeBid(userId, itemId, amount);

    // API Spec for response: { accepted, newPrice, newBalance, message, timeRemaining? }
    // The current db.placeBid is a placeholder and will not return this structure.
    // This needs to be aligned once db.placeBid is implemented.
    if (bidResult.success) { // Assuming bidResult has a success field from the db function
      return json({
        accepted: true, 
        newPrice: bidResult.newPrice, // Placeholder
        newBalance: bidResult.newBalance, // Placeholder
        message: bidResult.message || 'Bid accepted.', 
        timeRemaining: bidResult.timeRemaining // Placeholder
      });
    } else {
      // Determine appropriate status code based on bidResult.code or message
      // e.g., 400 for invalid bid, 403 for insufficient balance, 404 auction not found/ended
      let statusCode = 400;
      if (bidResult.code === 'INSUFFICIENT_BALANCE') statusCode = 403;
      if (bidResult.code === 'AUCTION_ENDED') statusCode = 400; // Or a specific code like 410 Gone
      if (bidResult.code === 'NOT_FOUND') statusCode = 404;

      return json({ 
        accepted: false, 
        message: bidResult.message || 'Bid rejected.', 
        error: true, 
        code: bidResult.code || 'BID_REJECTED' 
      }, { status: statusCode });
    }

  } catch (e: any) {
    if (e instanceof SyntaxError) {
      return json({ error: true, message: 'Invalid JSON in request body.', code: 'INVALID_INPUT' }, { status: 400 });
    }
    console.error('Error in /api/auctions/bid POST:', e);
    return json({ error: true, message: 'Internal server error.', code: 'INTERNAL_ERROR', details: e.message }, { status: 500 });
  }
}; 