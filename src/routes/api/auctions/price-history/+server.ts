import { json, error } from '@sveltejs/kit';
import { getAuctionState } from '$lib/server/auction';
import type { RequestHandler } from './$types';
import type { ChartDataPoint } from '$lib/types';

export const GET: RequestHandler = async () => {
	try {
		const auctionState = getAuctionState();
		let priceHistory: ChartDataPoint[] = [];

		if (auctionState && auctionState.currentAuction && auctionState.currentAuction.bidHistory) {
			priceHistory = auctionState.currentAuction.bidHistory.map(bid => ({
				// Convert timestamp string/Date to milliseconds for the chart's x-axis
				x: new Date(bid.timestamp).getTime(), 
				// Use the price for the y-axis
				y: bid.amount 
			}));
		}

		return json(priceHistory);
	} catch (err) {
		console.error('Error fetching price history:', err);
		throw error(500, 'Failed to fetch price history');
	}
}; 