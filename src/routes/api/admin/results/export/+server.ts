import { getAuctionResults } from '$lib/server/db';
import { apiHandler, createError } from '$lib/server/error';

export async function GET({ cookies }) {
  return apiHandler(
    { cookies },
    async () => {
      // Check admin auth
      const isAdmin = cookies.get('admin_authenticated') === 'true';
      if (!isAdmin) {
        throw createError('UNAUTHORIZED', 'Admin authentication required');
      }
      
      const results = await getAuctionResults();
      
      let exportText = 'Favour Auction Results:\n\n';
      
      results.forEach(r => {
        exportText += `${r.buyer_name} bought "${r.item_title}" from ${r.seller_name} for ${r.price} points (${r.auction_type})\n`;
      });
      
      // Return as plain text
      return new Response(exportText, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': 'attachment; filename="auction-results.txt"'
        }
      });
    }
  );
}