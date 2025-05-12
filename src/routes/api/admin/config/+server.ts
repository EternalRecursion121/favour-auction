import { json } from '@sveltejs/kit';
import { updateAuctionConfig, getCurrentAuctionConfig } from '$lib/server/db';
import { apiHandler, createError } from '$lib/server/error';
import { auctionConfigSchema } from '$lib/server/schema';
import type { AuctionConfig } from '$lib/types';

// GET handler to fetch current configuration
export async function GET(event) {
	return apiHandler(
		event,
		async () => {
			const config = await getCurrentAuctionConfig();
			if (!config || typeof config.auction_type === 'undefined') {
				throw createError('INTERNAL_ERROR', 'Auction configuration is missing or invalid');
			}

			// Map DB fields to AuctionConfig type and return directly
			const responseConfig: AuctionConfig = {
				auctionType: config.auction_type,
				allowNewItems: config.allow_new_items,
				pennyAuctionConfig: {
					incrementAmount: config.penny_increment,
					timeExtension: config.penny_time_extension,
					minimumTimeRemaining: config.penny_min_time
				}
			};
			
			return responseConfig; // Return raw config object
		},
		{ adminRequired: true } // Ensure admin check is enforced by handler
	);
}

// PUT handler to update configuration
export async function PUT({ request, cookies }) {
  return apiHandler(
    { request, cookies },
    async () => {
      // Check admin auth (manual check retained for example, but could rely on apiHandler)
      const isAdmin = cookies.get('admin_authenticated') === 'true';
      if (!isAdmin) {
        throw createError('UNAUTHORIZED', 'Admin authentication required');
      }

      const body = await request.json();
      const { auctionType, allowNewItems, pennyAuctionConfig } = auctionConfigSchema.parse(body);

      const configData = await updateAuctionConfig(
        auctionType,
        allowNewItems,
        pennyAuctionConfig?.incrementAmount,
        pennyAuctionConfig?.timeExtension,
        pennyAuctionConfig?.minimumTimeRemaining
      );

	  // Note: PUT still returns the wrapped response, which is fine as the component only checks response.ok
      return {
        success: true,
        config: {
          auctionType: configData.auction_type,
          allowNewItems: configData.allow_new_items,
          pennyAuctionConfig: {
            incrementAmount: configData.penny_increment,
            timeExtension: configData.penny_time_extension,
            minimumTimeRemaining: configData.penny_min_time
          }
        }
      };
    },
    // Add adminRequired here for consistency, though manual check exists
    { adminRequired: true }
  );
}