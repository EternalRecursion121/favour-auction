import { apiHandler, createError } from '$lib/server/error';
import { getUnsoldItems } from '$lib/server/db';
import { startAuction } from '$lib/server/auction';

export async function POST({ cookies }) {
  return apiHandler(
    { cookies },
    async () => {
      // Check admin auth
      const isAdmin = cookies.get('admin_authenticated') === 'true';
      if (!isAdmin) {
        throw createError('UNAUTHORIZED', 'Admin authentication required');
      }
      
      // Get the next available item
      const items = await getUnsoldItems();
      
      if (!items || items.length === 0) {
        return {
          success: false,
          message: 'No items available to auction',
          remainingItems: 0
        };
      }
      
      // Start the auction with the first available item
      const firstItem = items[0];
      
      try {
        const auctionData = await startAuction(firstItem.id);
        
        return {
          success: true,
          message: 'Auction started successfully',
          item: {
            id: firstItem.id,
            title: firstItem.title,
            description: firstItem.description,
            seller: {
              id: firstItem.seller_id,
              name: firstItem.seller_name || 'Unknown'
            }
          },
          remainingItems: items.length - 1,
          auctionType: auctionData.auctionType
        };
      } catch (error) {
        console.error('Failed to start auction:', error);
        throw createError('INTERNAL_ERROR', 'Failed to start auction');
      }
    }
  );
}