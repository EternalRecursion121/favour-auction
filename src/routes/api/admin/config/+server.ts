import { json } from '@sveltejs/kit';
import { updateAuctionConfig, getAuctionConfig } from '../../../../lib/server/db';
import type { RequestHandler } from './$types';
import type { AuctionConfig } from '$lib/types';

export const PUT: RequestHandler = async ({ request }) => {
  // No authentication check as per user request
  try {
    const body = await request.json() as Partial<AuctionConfig>;

    // Validate the incoming configuration.
    // A more robust solution would validate each field type from body according to AuctionConfig type.
    // For example, check that body.auctionType is one of the allowed enum values.

    const currentConfig = await getAuctionConfig(); // This always returns a full config object
    
    // Construct new config, taking values from body if present, else from currentConfig
    const newConfigData: AuctionConfig = {
      auctionType: body.auctionType !== undefined ? body.auctionType : currentConfig.auctionType,
      allowNewItems: body.allowNewItems !== undefined ? body.allowNewItems : currentConfig.allowNewItems,
      pennyAuctionConfig: {
        incrementAmount: body.pennyAuctionConfig?.incrementAmount !== undefined
          ? body.pennyAuctionConfig.incrementAmount
          : currentConfig.pennyAuctionConfig!.incrementAmount,
        timeExtension: body.pennyAuctionConfig?.timeExtension !== undefined
          ? body.pennyAuctionConfig.timeExtension
          : currentConfig.pennyAuctionConfig!.timeExtension,
        minimumTimeRemaining: body.pennyAuctionConfig?.minimumTimeRemaining !== undefined
          ? body.pennyAuctionConfig.minimumTimeRemaining
          : currentConfig.pennyAuctionConfig!.minimumTimeRemaining,
      }
    };

    // Further validation for auctionType enum can be added here if needed.
    const allowedTypes = ['english', 'dutch', 'firstprice', 'vikrey', 'chinese', 'penny', 'random'];
    if (!allowedTypes.includes(newConfigData.auctionType)) {
        return json({ error: true, message: `Invalid auction type. Must be one of: ${allowedTypes.join(', ')}.`, code: 'INVALID_INPUT' }, { status: 400 });
    }

    const updatedConfig = await updateAuctionConfig(newConfigData);

    if (updatedConfig) {
      return json({ success: true, config: updatedConfig });
    } else {
      return json({ success: false, message: 'Failed to update auction configuration.', error: true, code: 'CONFIG_UPDATE_FAILED' }, { status: 500 });
    }

  } catch (e: any) {
    if (e instanceof SyntaxError) {
      return json({ error: true, message: 'Invalid JSON in request body.', code: 'INVALID_INPUT' }, { status: 400 });
    }
    console.error('Error in /api/admin/config PUT:', e);
    return json({ success: false, message: 'Internal server error.', error: true, code: 'INTERNAL_ERROR', details: e.message }, { status: 500 });
  }
}; 