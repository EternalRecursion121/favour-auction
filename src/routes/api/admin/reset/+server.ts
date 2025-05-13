import { json } from '@sveltejs/kit';
import { resetAuction } from '../../../lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => {
  // No authentication check as per user request
  try {
    const success = await resetAuction();
    if (success) {
      return json({ success: true, message: 'Auction reset successfully.' });
    } else {
      return json({ success: false, message: 'Failed to reset auction.', error: true, code: 'RESET_FAILED' }, { status: 500 });
    }
  } catch (e: any) {
    console.error('Error in /api/admin/reset POST:', e);
    return json({ success: false, message: 'Internal server error.', error: true, code: 'INTERNAL_ERROR', details: e.message }, { status: 500 });
  }
}; 