import { json } from '@sveltejs/kit';
import { getUserBalanceHistory } from '../../../../lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  try {
    const userId = parseInt(params.id, 10);

    if (isNaN(userId)) {
      return json({ error: true, message: 'User ID must be a valid number.', code: 'INVALID_INPUT' }, { status: 400 });
    }

    const balanceHistory = await getUserBalanceHistory(userId);

    if (!balanceHistory) {
      // This case might not be hit if getUserBalanceHistory always returns an array (empty or not)
      // Depending on db function, it might return null if user not found, or just empty array.
      // For now, assume it returns array. API spec doesn't specify 404 for user not found here, just for items/auctions.
      // If user doesn't exist, balance history will be empty. Client can interpret.
    }
    
    // Response should be: [{ timestamp, balance, reason, itemId, itemTitle? }]
    // itemTitle is optional in the API spec, but db.ts provides it.
    return json(balanceHistory);

  } catch (e: any) {
    console.error(`Error in /api/users/${params.id}/balance-history GET:`, e);
    return json({ error: true, message: 'Internal server error.', code: 'INTERNAL_ERROR', details: e.message }, { status: 500 });
  }
}; 