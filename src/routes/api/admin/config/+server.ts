import { updateAuctionConfig } from '$lib/server/db';
import { apiHandler, createError } from '$lib/server/error';
import { auctionConfigSchema } from '$lib/server/schema';

export async function PUT({ request, cookies }) {
  return apiHandler(
    { request, cookies },
    async () => {
      // Check admin auth
      const isAdmin = cookies.get('admin_authenticated') === 'true';
      if (!isAdmin) {
        throw createError('UNAUTHORIZED', 'Admin authentication required');
      }

      const body = await request.json();
      const { auctionType, allowNewItems, pennyAuctionConfig } = auctionConfigSchema.parse(body);

      const config = await updateAuctionConfig(
        auctionType,
        allowNewItems,
        pennyAuctionConfig?.incrementAmount,
        pennyAuctionConfig?.timeExtension,
        pennyAuctionConfig?.minimumTimeRemaining
      );

      return {
        success: true,
        config: {
          auctionType: config.auction_type,
          allowNewItems: config.allow_new_items,
          pennyAuctionConfig: {
            incrementAmount: config.penny_increment,
            timeExtension: config.penny_time_extension,
            minimumTimeRemaining: config.penny_min_time
          }
        }
      };
    },
    // Removed adminRequired here since we're doing the check manually above
    {}
  );
}