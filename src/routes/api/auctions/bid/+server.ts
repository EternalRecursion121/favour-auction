import { db } from '$lib/server/db';
import { getFinalPrice, processBid } from '$lib/server/auction';
import { getUserBalance, recordBalanceChange, recordBid, updateUserBalance } from '$lib/server/db';
import { apiHandler, createError } from '$lib/server/error';
import { bidSchema } from '$lib/server/schema';
import type { BidResult } from '$lib/types';
import type { VercelPoolClient } from '@vercel/postgres';

export async function POST({ request }) {
  return apiHandler(
    { request },
    async () => {
      const body = await request.json();
      const { userId, itemId, amount } = bidSchema.parse(body);
      
      const balance = await getUserBalance(userId);
      if (balance < amount) {
        throw createError('INSUFFICIENT_BALANCE', 'Not enough balance');
      }
      
      const bidResult = (await processBid(userId, itemId, amount)) as BidResult;

      if (!bidResult || !bidResult.accepted) {
        return {
          success: false,
          accepted: false,
          message: bidResult?.message || 'Bid not accepted'
        };
      }
      
      let client: VercelPoolClient | undefined = undefined;
      try {
        const maybeClient = await db.connect();
        if (!maybeClient) throw new Error('Failed to connect to database.');
        client = maybeClient as VercelPoolClient;
        await client.query('BEGIN');
        
        await recordBid(userId, itemId, amount);
        
        if (
          ['dutch', 'penny', 'chinese'].includes(bidResult.auctionType || '') ||
          bidResult.auctionEnded
        ) {
          const finalPrice = await getFinalPrice(userId);
          if (finalPrice > 0) {
            const currentBalance = await getUserBalance(userId);
            if (currentBalance < finalPrice) {
              throw createError('INSUFFICIENT_BALANCE', 'Balance changed');
            }
            const newBalance = currentBalance - finalPrice;
            await updateUserBalance(userId, newBalance);
            await recordBalanceChange(userId, newBalance, 'bid', itemId);
            bidResult.newBalance = newBalance;
          }
        }
        
        await client.query('COMMIT');
        return bidResult;
      } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Transaction failed in /api/auctions/bid:', error);
        if (error && typeof error === 'object' && 'code' in error && error.code === 'INSUFFICIENT_BALANCE') {
          throw error;
        }
        const message = error instanceof Error ? error.message : 'Failed to process bid.';
        throw createError('INTERNAL_ERROR', message);
      } finally {
        if (client) client.release();
      }
    }
  );
}