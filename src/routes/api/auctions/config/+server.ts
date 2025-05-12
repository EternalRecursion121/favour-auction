import { getCurrentAuctionConfig } from '$lib/server/db';
import { apiHandler, createError } from '$lib/server/error';

export async function GET() {
  return apiHandler(
    {},
    async () => {
      const config = await getCurrentAuctionConfig();

      if (!config || typeof config.auction_type === 'undefined') {
        throw createError('INTERNAL_ERROR', 'Auction configuration is missing or invalid');
      }

      return {
        auctionType: config.auction_type,
        allowNewItems: config.allow_new_items,
        pennyAuctionConfig: {
          incrementAmount: config.penny_increment,
          timeExtension: config.penny_time_extension,
          minimumTimeRemaining: config.penny_min_time
        }
      };
    }
  );
}