import { getItemById, getBidsForItem } from '$lib/server/db';
import { apiHandler, createError } from '$lib/server/error';

export async function GET({ params }) {
  return apiHandler(
    { params },
    async () => {
      const itemId = parseInt(params.id);
      if (isNaN(itemId)) {
        throw createError('INVALID_INPUT', 'Invalid item ID');
      }
      
      const item = await getItemById(itemId);
      if (!item) {
        throw createError('NOT_FOUND', `Item with ID ${itemId} not found`);
      }
      
      // Get bid history for this item
      const bids = await getBidsForItem(itemId);
      
      return {
        id: item.id,
        title: item.title,
        description: item.description,
        seller: {
          id: item.seller_id,
          name: item.seller_name
        },
        sold: item.sold,
        createdAt: item.created_at,
        auctionHistory: bids.map(bid => ({
          userId: bid.user_id,
          userName: bid.user_name,
          amount: bid.amount,
          timestamp: bid.timestamp
        }))
      };
    }
  );
}