import { getAuctionState } from '$lib/server/auction';
import { apiHandler } from '$lib/server/error';
import type { Auction, Bid, PriceHistoryEntry, AuctionType } from '$lib/types';
import { getItemById, getUserByName } from '$lib/server/db'; // Import necessary DB functions

export async function GET(event) {
	return apiHandler(event, async () => {
		// Fetch the raw state which might have IDs/timestamps
		const rawAuctionState = await getAuctionState(); 
		
		// If auction is inactive, return a simplified structure matching Auction type
		if (!rawAuctionState.active || rawAuctionState.itemId === null) {
			return {
				active: false,
				item: null,
				auctionType: (rawAuctionState.auctionType || 'english') as AuctionType,
				startTime: null,
				endTime: null,
				currentPrice: 0,
				winningBidder: null,
				bids: [],
				bidHistory: [],
				timeRemaining: null
			} as Auction;
		}

		// Auction is active, fetch related details to build the full Auction object
		const item = await getItemById(rawAuctionState.itemId);
		if (!item) {
			console.error(`Current auction item with ID ${rawAuctionState.itemId} not found!`);
			// Return inactive state as item is missing
			return {
				active: false, item: null, auctionType: (rawAuctionState.auctionType || 'english') as AuctionType, startTime: null, endTime: null,
				currentPrice: 0, winningBidder: null, bids: [], bidHistory: [], timeRemaining: null
			} as Auction;
		}

		// Fetch winning bidder details if ID exists
		let winningBidder = null;
		if (rawAuctionState.highestBidderId !== null) {
			// Assuming highestBidderId corresponds to user ID
			// Note: getUserByName might not be the right function if ID is numeric
			// Need getUserById if available, otherwise adapt.
			// For now, assuming getUserByName works with string ID.
			try {
				const user = await getUserByName(rawAuctionState.highestBidderId.toString());
				if (user) {
					winningBidder = { id: user.id, name: user.name };
				}
			} catch (error) {
				console.error(`Failed to fetch winning bidder (ID: ${rawAuctionState.highestBidderId}):`, error);
			}
		}
		
		// Calculate time remaining
		let timeRemaining: number | null = null;
		if (rawAuctionState.endTime) {
			const endTimeMs = rawAuctionState.endTime.getTime();
			timeRemaining = Math.max(0, Math.ceil((endTimeMs - Date.now()) / 1000));
		}

		// Convert priceHistory to correct type (string timestamp)
		const bidHistory: PriceHistoryEntry[] = (rawAuctionState.priceHistory || []).map((entry: any) => ({
			timestamp: typeof entry.timestamp === 'string' ? entry.timestamp : entry.timestamp?.toISOString?.() ?? '',
			price: entry.price
		}));

		// TODO: Fetch actual bids and bid history if needed for the Auction type
		// const bids: Bid[] = await getBidsForItem(rawAuctionState.itemId);
		// const bidHistory: PriceHistoryEntry[] = rawAuctionState.priceHistory || [];
		const bids: Bid[] = []; // Placeholder

		// Construct the full Auction object
		const currentAuction: Auction = {
			active: true,
			item: {
				id: item.id,
				title: item.title,
				description: item.description,
				seller: {
					id: item.seller_id || 0, // Handle potential null seller_id
					name: item.seller_name || 'Unknown'
				},
				sold: item.sold,
				createdAt: item.created_at
			},
			auctionType: (rawAuctionState.auctionType || 'english') as AuctionType,
			startTime: rawAuctionState.startTime ? rawAuctionState.startTime.toISOString() : null,
			endTime: rawAuctionState.endTime ? rawAuctionState.endTime.toISOString() : null,
			currentPrice: rawAuctionState.highestBid || 0,
			winningBidder: winningBidder,
			bids: bids, // Use fetched/placeholder bids
			bidHistory: bidHistory, // Use fetched/placeholder history
			timeRemaining: timeRemaining
		};

		return currentAuction;
	});
}