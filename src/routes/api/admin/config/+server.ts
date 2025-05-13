import { json } from '@sveltejs/kit';
import { updateAuctionConfig, getAuctionConfig } from '$lib/server/db';
import { apiHandler, createError } from '$lib/server/error';
import { auctionConfigSchema } from '$lib/server/schema';
import type { AuctionConfig } from '$lib/types';
import type { RequestHandler } from './$types';
import { authenticateAdmin } from '$lib/server/auth';

// GET handler to fetch current configuration
export const GET: RequestHandler = async ({ request }) => {
	if (!authenticateAdmin(request)) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}
	try {
		const config = await getAuctionConfig();
		if (config) {
			return json(config);
		} else {
			return json({ message: 'Auction configuration not found' }, { status: 404 });
		}
	} catch (error) {
		console.error('Error fetching auction config:', error);
		return json({ message: 'Failed to fetch auction configuration' }, { status: 500 });
	}
};

// PUT handler to update configuration
export const POST: RequestHandler = async ({ request }) => {
	if (!authenticateAdmin(request)) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}
	try {
		const body = await request.json();
		const { auctionType, allowNewItems, pennyAuctionConfig } = auctionConfigSchema.parse(body);

		const updatedConfig = await updateAuctionConfig(
			auctionType,
			allowNewItems,
			pennyAuctionConfig?.incrementAmount,
			pennyAuctionConfig?.timeExtension,
			pennyAuctionConfig?.minimumTimeRemaining
		);

		if (updatedConfig) {
			return json(updatedConfig);
		} else {
			return json({ message: 'Failed to update auction configuration' }, { status: 500 });
		}
	} catch (error) {
		console.error('Error updating auction config:', error);
		if (error instanceof SyntaxError) {
			return json({ message: 'Invalid request body' }, { status: 400 });
		}
		return json({ message: 'Failed to update auction configuration' }, { status: 500 });
	}
};