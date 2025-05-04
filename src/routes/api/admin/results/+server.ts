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
      
      return results.map(r => ({
        id: r.id,
        item: {
          id: r.item_id,
          title: r.item_title,
          description: r.item_description
        },
        seller: {
          id: r.seller_id,
          name: r.seller_name
        },
        buyer: {
          id: r.buyer_id,
          name: r.buyer_name
        },
        price: r.price,
        auctionType: r.auction_type,
        completedAt: r.completed_at
      }));
    },
    { adminRequired: true }
  );
}