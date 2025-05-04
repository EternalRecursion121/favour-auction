import { getUserBalanceHistory } from '$lib/server/db';
import { apiHandler, createError } from '$lib/server/error';

export async function GET({ params }) {
  return apiHandler(
    { params },
    async () => {
      const userId = parseInt(params.id);
      if (isNaN(userId)) {
        throw createError('INVALID_INPUT', 'Invalid user ID');
      }
      
      const history = await getUserBalanceHistory(userId);
      
      return history.map(record => ({
        timestamp: record.timestamp,
        balance: record.balance,
        reason: record.reason,
        itemId: record.item_id,
        itemTitle: record.item_title
      }));
    }
  );
}