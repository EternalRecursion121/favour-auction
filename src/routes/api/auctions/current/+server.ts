import { getAuctionState } from '$lib/server/auction';
import { getBidsForItem, getItemById, getUserByName } from '$lib/server/db';
import { apiHandler, createError } from '$lib/server/error';

export async function GET() {
  return apiHandler(
    {},
    async () => {
      const auctionState = getAuctionState();
      
      if (!auctionState.active || !auctionState.itemId) {
        return {
          active: false,
          item: null,
          message: 'No auction is currently active'
        };
      }
      
      // Get item details
      const item = await getItemById(auctionState.itemId);
      if (!item) {
        throw createError('NOT_FOUND', 'Current auction item not found');
      }
      
      // Get bid information
      const bids = await getBidsForItem(item.id);
      
      // Get winning bidder info if there is one
      let winningBidder = null;
      if (auctionState.highestBidderId) {
        try {
          // The error might be that userById is returning a number but getUserById expects a string
          // Fix by properly converting the ID to a string
          const userId = typeof auctionState.highestBidderId === 'number'
            ? auctionState.highestBidderId
            : parseInt(auctionState.highestBidderId.toString(), 10);

          // Check for NaN
          if (!isNaN(userId)) {
            const user = await getUserByName(userId.toString());
            if (user) {
              winningBidder = {
                id: user.id,
                name: user.name
              };
            }
          }
        } catch (error) {
          console.error('Error fetching winning bidder:', error);
          // Don't fail the request, just log the error and proceed without winningBidder info
        }
      }
      
      // Calculate time remaining if an end time is set
      let timeRemaining = null;
      if (auctionState.endTime) {
        timeRemaining = Math.max(0, 
          Math.ceil((auctionState.endTime.getTime() - Date.now()) / 1000)
        );
      }
      
      return {
        active: auctionState.active,
        item: {
          id: item.id,
          title: item.title,
          description: item.description,
          seller: {
            id: item.seller_id,
            name: item.seller_name
          }
        },
        auctionType: auctionState.auctionType,
        startTime: auctionState.startTime,
        endTime: auctionState.endTime,
        currentPrice: auctionState.highestBid,
        winningBidder,
        // For sealed auctions, only show bids to admin
        bids: ['firstprice', 'vikrey'].includes(auctionState.auctionType) ? [] : bids.map(bid => ({
          userId: bid.user_id,
          userName: bid.user_name,
          amount: bid.amount,
          timestamp: bid.timestamp
        })),
        timeRemaining,
        bidHistory: auctionState.priceHistory.map(p => ({
          timestamp: p.timestamp,
          price: p.price
        }))
      };
    }
  );
}