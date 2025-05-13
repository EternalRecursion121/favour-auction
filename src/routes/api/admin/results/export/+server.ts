import { getAuctionResults as dbGetAuctionResults } from '../../../../../lib/server/db'; 
import type { RequestHandler } from './$types';
import type { AuctionResult } from '$lib/types'; 

export const GET: RequestHandler = async () => {
  // No authentication check as per user request
  try {
    const results: AuctionResult[] = await dbGetAuctionResults();

    let textOutput = 'Favour Auction Results:\n\n';
    if (results.length === 0) {
      textOutput += 'No auction results found.\n';
    } else {
      results.forEach(result => {
        // Ensure item, seller, buyer objects are correctly accessed as per AuctionResult type
        const itemTitle = typeof result.item === 'object' ? result.item.title : result.item; 
        textOutput += `${result.buyer.name} bought "${itemTitle}" from ${result.seller.name} for ${result.price} points (${result.auctionType})\n`;
      });
    }

    return new Response(textOutput, {
      headers: {
        'Content-Type': 'text/plain'
      }
    });

  } catch (e: any) {
    console.error('Error in /api/admin/results/export GET:', e);
    // Return a plain text error for consistency if possible, or a generic server error status
    return new Response(`Internal server error: ${e.message}`, { status: 500, headers: { 'Content-Type': 'text/plain' } });
  }
};