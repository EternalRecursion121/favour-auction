import { getAuctionConfig } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET current auction configuration (public)
export const GET: RequestHandler = async () => {
  try {
    const config = await getAuctionConfig();
    if (config) {
      return json(config);
    } else {
      // This endpoint should ideally always find a config due to initialization
      return json({ message: 'Auction configuration not found. Server may be initializing or encountered an error.' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching auction config:', error);
    return json({ message: 'Failed to fetch auction configuration' }, { status: 500 });
  }
};