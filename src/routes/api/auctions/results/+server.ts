import { json } from '@sveltejs/kit';
import { getAuctionResults } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  try {
    const results = await getAuctionResults();
    if (results) {
      return json(results);
    } else {
      // Return an empty array if there are no results, which is a valid state
      return json([]); 
    }
  } catch (error) {
    console.error('Error fetching auction results:', error);
    // Consider returning a more specific error to the client if appropriate
    return json({ message: 'Failed to fetch auction results' }, { status: 500 });
  }
}; 