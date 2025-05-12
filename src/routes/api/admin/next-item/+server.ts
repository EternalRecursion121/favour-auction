import { startAuction, endAuction, getAuctionState } from '$lib/server/auction';
import { 
  db, 
  getUnsoldItems, 
  markItemAsSold, 
  recordAuctionResult, 
  updateUserBalance, 
  recordBalanceChange, 
  getUserBalance, 
  getItemById
} from '$lib/server/db';
import { apiHandler, createError } from '$lib/server/error';

export async function POST({ cookies }) {
  return apiHandler(
    { cookies },
    async () => {
      // Check admin auth
      const isAdmin = cookies.get('admin_authenticated') === 'true';
      if (!isAdmin) {
        throw createError('UNAUTHORIZED', 'Admin authentication required');
      }

      // End current auction if there is one
      const currentAuction = getAuctionState();
      if (currentAuction.active && currentAuction.itemId) {
        try {
          const auctionResult = endAuction();

          if (auctionResult && auctionResult.winnerId) {
            // Process the auction result in a transaction
            await db.query('BEGIN');

          try {
            // Mark item as sold
            await markItemAsSold(auctionResult.itemId, db);

            // Get item info
            const item = await getItemById(auctionResult.itemId);

            // Record the auction result
            await recordAuctionResult(
              auctionResult.itemId,
              item.seller_id,
              auctionResult.winnerId,
              auctionResult.finalPrice,
              auctionResult.auctionType,
              db
            );

            // Update seller balance
            const sellerBalance = await getUserBalance(item.seller_id);
            const newSellerBalance = sellerBalance + auctionResult.finalPrice;
            await updateUserBalance(item.seller_id, newSellerBalance, db);
            await recordBalanceChange(
              item.seller_id,
              newSellerBalance,
              'sell',
              auctionResult.itemId,
              db
            );

            await db.query('COMMIT');
          } catch (error) {
            await db.query('ROLLBACK');
            console.error('Transaction failed:', error);
            throw createError('INTERNAL_ERROR', 'Failed to process auction result');
          }
        }
        } catch (error) {
          console.error('Error ending auction:', error);
          // Don't fail the whole operation if we can't end the current auction
          // Just log the error and continue with starting a new auction
        }
      }

      // Get the next unsold item
      const items = await getUnsoldItems();

      if (!items || items.length === 0) {
        return {
          success: true,
          message: 'No more items available',
          remainingItems: 0
        };
      }

      // Start the auction for the next item
      const nextItem = items[0];

      try {
        await startAuction(nextItem.id);
      } catch (error) {
        console.error('Failed to start auction:', error);
        throw createError('INTERNAL_ERROR', 'Failed to start auction for next item');
      }

      return {
        success: true,
        item: {
          id: nextItem.id,
          title: nextItem.title,
          description: nextItem.description,
          seller: {
            id: nextItem.seller_id,
            name: nextItem.seller_name || 'Unknown'
          }
        },
        remainingItems: items.length - 1
      };
    },
    // Removed adminRequired here since we're doing the check manually above
    {}
  );
}