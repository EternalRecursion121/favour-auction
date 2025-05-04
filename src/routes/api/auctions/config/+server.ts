import { getCurrentAuctionConfig } from '$lib/server/db';
import { apiHandler } from '$lib/server/error';

export async function GET() {
  return apiHandler(
    {},
    async () => {
      const config = await getCurrentAuctionConfig();
      
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