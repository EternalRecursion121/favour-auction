import { db } from '$lib/server/db';
import { getFinalPrice, processBid } from '$lib/server/auction';
import { getUserBalance, recordBalanceChange, recordBid, updateUserBalance } from '$lib/server/db';
import { apiHandler, createError } from '$lib/server/error';
import { bidSchema } from '$lib/server/schema';

export async function POST({ request }) {
  return apiHandler(
    { request },
    async () => {
      const body = await request.json();
      const { userId, itemId, amount } = bidSchema.parse(body);
      
      // Check user balance
      const balance = await getUserBalance(userId);
      if (balance < amount) {
        throw createError(
          'INSUFFICIENT_BALANCE', 
          'Not enough balance to place this bid'
        );
      }
      
      // Process the bid based on auction type
      const bidResult = await processBid(userId, itemId, amount);

      if (!bidResult || !bidResult.accepted) {
        // Return a standardized error format
        return {
          success: false,
          accepted: false,
          message: bidResult?.message || 'Bid not accepted'
        };
      }
      
      // Start a transaction to ensure atomicity
      await db.query('BEGIN');
      
      try {
        // Record the bid
        await recordBid(userId, itemId, amount);
        
        // For immediate deduction auctions (like Dutch or Penny),
        // update the user's balance right away
        if (['dutch', 'penny', 'chinese'].includes(bidResult.auctionType) || bidResult.auctionEnded) {
          const finalPrice = await getFinalPrice(userId);
          if (finalPrice > 0) {
            const newBalance = balance - finalPrice;
            await updateUserBalance(userId, newBalance, db);
            await recordBalanceChange(userId, newBalance, 'bid', itemId, db);
            bidResult.newBalance = newBalance;
          }
        }
        
        await db.query('COMMIT');
        return bidResult;
      } catch (error) {
        await db.query('ROLLBACK');
        console.error('Transaction failed:', error);
        throw createError('INTERNAL_ERROR', 'Failed to process bid');
      }
    }
  );
}