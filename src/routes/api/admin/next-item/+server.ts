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
import type { VercelPoolClient } from '@vercel/postgres';

export async function POST(event) {
  return apiHandler(
    event,
    async () => {
      // End the current auction (if any) and get the result
      const auctionResult = await endAuction();

      if (!auctionResult) {
        // No active auction or no bids, okay to proceed to next item maybe?
        // Or should we throw an error?
        // For now, let's assume we just want to log it and proceed.
        console.log('No active auction result to process for next-item.');
        // Depending on requirements, maybe select the next item logic should be here?
        // Attempt to start the next auction if no auction was concluded
        const items = await getUnsoldItems();
        if (!items || items.length === 0) {
          return { success: false, message: 'No items available to auction.' };
        }
        const nextItem = items[0];
        try {
          await startAuction(nextItem.id);
          return { success: true, message: 'No active auction concluded, started next one.' };
        } catch (startError) {
          console.error('Failed to start next auction after no conclusion:', startError);
          throw createError('INTERNAL_ERROR', 'Failed to start the next auction.');
        }
      }

      // Process the result: mark item sold, update balances, record result
      // Use a transaction
      let client: VercelPoolClient | undefined = undefined;

      try {
        client = await db.connect();
        if (!client) {
          throw new Error('Failed to get database client connection.');
        }
        
        await client.query('BEGIN');

        let nextItemStarted = false;

        if (auctionResult.itemId !== null) {
          // Mark item as sold
          await markItemAsSold(auctionResult.itemId, client);

          // Get item info (needed for seller ID)
          const item = await getItemById(auctionResult.itemId, client);
          if (!item) throw new Error(`Item with ID ${auctionResult.itemId} not found.`);
          if (item.seller_id === null) throw new Error(`Item ${item.id} has no seller ID.`);

          if (auctionResult.winnerId !== null && auctionResult.finalPrice > 0) {
            // Record the auction result
            await recordAuctionResult(
              auctionResult.itemId,
              item.seller_id,
              auctionResult.winnerId,
              auctionResult.finalPrice,
              client
            );

            // Update seller balance
            const sellerBalance = await getUserBalance(item.seller_id, client);
            const newSellerBalance = sellerBalance + auctionResult.finalPrice;
            await updateUserBalance(item.seller_id, newSellerBalance, client);
            await recordBalanceChange(
              item.seller_id,
              newSellerBalance,
              'sell',
              auctionResult.itemId,
              client
            );

            // Buyer balance should have been handled by processBid/endAuction
          } else {
            console.log(`Item ${auctionResult.itemId} ended with no winner or zero price.`);
          }
        } else {
          console.warn('Auction ended but itemId was null.');
        }

        // After processing the ended auction, try to start the next one
        const items = await getUnsoldItems(client); // Use client for transaction consistency
        if (items && items.length > 0) {
          const nextItem = items[0];
          await startAuction(nextItem.id); // Assume startAuction doesn't need the client
          nextItemStarted = true;
        }

        await client.query('COMMIT');
        return { 
          success: true, 
          message: `Auction concluded.${nextItemStarted ? ' Next item started.' : ' No more items.'}` 
        };
      } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Transaction failed in /api/admin/next-item:', error);
        const message = error instanceof Error ? error.message : 'Failed to process auction end and next item.';
        throw createError('INTERNAL_ERROR', message);
      } finally {
        if (client) client.release();
      }
    },
    { adminRequired: true }
  );
}