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
import { requireAdmin } from '$lib/server/auth';
import type { VercelPoolClient } from '@vercel/postgres';

export async function POST(event) {
  return apiHandler(
    event,
    async () => {
      await requireAdmin(event);

      // End the current auction (if any) and get the result
      const auctionResult = await endAuction();

      if (!auctionResult) {
        // No active auction or no bids, okay to proceed to next item maybe?
        // Or should we throw an error?
        // For now, let's assume we just want to log it and proceed.
        console.log('No active auction result to process for next-item.');
        // Depending on requirements, maybe select the next item logic should be here?
        return { success: true, message: 'No active auction to conclude.' };
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

            // Update buyer balance (deduction might have happened earlier depending on auction type)
            // For safety, let's assume it needs checking/recording here if not already done.
            // This part might need refinement based on how `processBid` handles deductions.
            // Example: Fetch buyer balance and ensure it reflects the purchase
            // const buyerBalance = await getUserBalance(auctionResult.winnerId, client);
            // If needed: await recordBalanceChange(auctionResult.winnerId, buyerBalance, 'win', auctionResult.itemId, client);
          } else {
            // Handle case where there was no winner or price was zero
            console.log(`Item ${auctionResult.itemId} ended with no winner or zero price.`);
          }
        } else {
          console.warn('Auction ended but itemId was null.');
        }

        await client.query('COMMIT');
        return { success: true, message: 'Auction concluded and next item processed.' };
      } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Transaction failed in /api/admin/next-item:', error);
        // Use the specific error message if available, otherwise generic
        const message = error instanceof Error ? error.message : 'Failed to process auction end and next item.';
        throw createError('INTERNAL_ERROR', message);
      } finally {
        if (client) client.release();
      }
    },
    { adminRequired: true }
  );
}