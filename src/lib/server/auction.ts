import { getCurrentAuctionConfig, getBidsForItem, getItemById } from './db';

// Current auction state (in-memory)
let currentAuction: {
  active: boolean;
  itemId: number | null;
  startTime: Date | null;
  endTime: Date | null;
  auctionType: string;
  priceHistory: Array<{ timestamp: Date; price: number }>;
  highestBid: number;
  highestBidderId: number | null;
} = {
  active: false,
  itemId: null,
  startTime: null,
  endTime: null,
  auctionType: 'english',
  priceHistory: [],
  highestBid: 0,
  highestBidderId: null,
};

// For penny auctions and dutch auctions, we need a timer
let auctionTimer: NodeJS.Timeout | null = null;

export function getAuctionState() {
  return { ...currentAuction };
}

export async function startAuction(itemId: number) {
  // Clear any existing timers
  if (auctionTimer) {
    clearTimeout(auctionTimer);
    auctionTimer = null;
  }

  const item = await getItemById(itemId);
  if (!item) {
    throw new Error(`Item with ID ${itemId} not found`);
  }

  // Get the auction configuration
  const config = await getCurrentAuctionConfig();
  
  // If it's set to random, pick a random auction type
  let auctionType = config.auction_type;
  if (auctionType === 'random') {
    const types = ['english', 'dutch', 'firstprice', 'vikrey', 'chinese', 'penny'];
    auctionType = types[Math.floor(Math.random() * types.length)];
  }

  // Set initial state based on auction type
  currentAuction = {
    active: true,
    itemId,
    startTime: new Date(),
    endTime: null,
    auctionType,
    priceHistory: [{ timestamp: new Date(), price: 0 }],
    highestBid: 0,
    highestBidderId: null,
  };

  // For Dutch auctions, set the initial price higher and schedule price decreases
  if (auctionType === 'dutch') {
    const initialPrice = 100; // Starting at 100 points
    const decreaseInterval = 10000; // 10 seconds
    const decreaseAmount = 5; // Decrease by 5 points each time
    
    currentAuction.highestBid = initialPrice;
    currentAuction.priceHistory = [{ timestamp: new Date(), price: initialPrice }];
    
    // Schedule the price decreases
    function decreasePrice() {
      if (!currentAuction.active) return;
      
      const newPrice = Math.max(0, currentAuction.highestBid - decreaseAmount);
      currentAuction.highestBid = newPrice;
      currentAuction.priceHistory.push({ timestamp: new Date(), price: newPrice });
      
      if (newPrice > 0) {
        auctionTimer = setTimeout(decreasePrice, decreaseInterval);
      } else {
        // End the auction if price reaches zero with no bids
        currentAuction.active = false;
        currentAuction.endTime = new Date();
      }
    }
    
    auctionTimer = setTimeout(decreasePrice, decreaseInterval);
  }
  
  // For sealed bid auctions, set an end time
  if (['firstprice', 'vikrey'].includes(auctionType)) {
    const duration = 60 * 1000; // 1 minute for demo purposes
    const endTime = new Date(Date.now() + duration);
    currentAuction.endTime = endTime;
    
    auctionTimer = setTimeout(() => {
      endAuction();
    }, duration);
  }
  
  // For penny auctions, set the timer
  if (auctionType === 'penny') {
    const duration = config.penny_min_time * 1000;
    currentAuction.endTime = new Date(Date.now() + duration);
    
    auctionTimer = setTimeout(() => {
      endAuction();
    }, duration);
  }

  return currentAuction;
}

export function endAuction() {
  if (!currentAuction.active) return;
  
  currentAuction.active = false;
  currentAuction.endTime = new Date();
  
  if (auctionTimer) {
    clearTimeout(auctionTimer);
    auctionTimer = null;
  }
  
  return {
    itemId: currentAuction.itemId,
    finalPrice: currentAuction.highestBid,
    winnerId: currentAuction.highestBidderId,
    auctionType: currentAuction.auctionType
  };
}

export async function processBid(userId: number, itemId: number, bidAmount: number) {
  // Ensure the auction is active and for the correct item
  if (!currentAuction.active || currentAuction.itemId !== itemId) {
    throw new Error('No active auction for this item');
  }
  
  // Get the auction configuration
  const config = await getCurrentAuctionConfig();
  
  // Handle bid based on auction type
  switch (currentAuction.auctionType) {
    case 'english': {
      // English auction: must bid higher than current highest bid
      if (bidAmount <= currentAuction.highestBid) {
        return { 
          accepted: false, 
          message: 'Bid must be higher than current highest bid' 
        };
      }
      
      // Update auction state
      currentAuction.highestBid = bidAmount;
      currentAuction.highestBidderId = userId;
      currentAuction.priceHistory.push({ timestamp: new Date(), price: bidAmount });
      
      return { 
        accepted: true, 
        newPrice: bidAmount 
      };
    }
    
    case 'dutch': {
      // Dutch auction: bid accepts the current price, ends the auction
      const acceptedPrice = currentAuction.highestBid;
      
      // Update auction state
      currentAuction.highestBidderId = userId;
      
      // End the auction
      endAuction();
      
      return { 
        accepted: true, 
        newPrice: acceptedPrice,
        auctionEnded: true
      };
    }
    
    case 'firstprice': {
      // First-price sealed bid: store bid, don't reveal if it's the highest
      // Just record the bid, update if it's the highest
      if (bidAmount > currentAuction.highestBid) {
        currentAuction.highestBid = bidAmount;
        currentAuction.highestBidderId = userId;
      }
      
      return { 
        accepted: true, 
        message: 'Bid accepted' 
      };
    }
    
    case 'vikrey': {
      // Vickrey auction: similar to first-price, but winner pays second-highest bid
      const previousHighestBid = currentAuction.highestBid;
      
      if (bidAmount > currentAuction.highestBid) {
        // Store the previous highest as the price the new highest bidder will pay
        currentAuction.priceHistory.push({ timestamp: new Date(), price: previousHighestBid });
        currentAuction.highestBid = bidAmount;
        currentAuction.highestBidderId = userId;
      }
      
      return { 
        accepted: true, 
        message: 'Bid accepted' 
      };
    }
    
    case 'penny': {
      // Penny auction: small increments, timer extension
      const minIncrement = config.penny_increment || 1;
      
      if (bidAmount < currentAuction.highestBid + minIncrement) {
        return { 
          accepted: false, 
          message: `Bid must be at least ${minIncrement} points higher than current bid` 
        };
      }
      
      // Update auction state
      currentAuction.highestBid = bidAmount;
      currentAuction.highestBidderId = userId;
      currentAuction.priceHistory.push({ timestamp: new Date(), price: bidAmount });
      
      // Extend time if needed
      if (currentAuction.endTime) {
        const timeExtension = config.penny_time_extension || 10; // Seconds
        const newEndTime = new Date(Math.max(
          currentAuction.endTime.getTime(),
          Date.now() + (timeExtension * 1000)
        ));
        
        currentAuction.endTime = newEndTime;
        
        // Reset the timer
        if (auctionTimer) {
          clearTimeout(auctionTimer);
        }
        
        const timeRemaining = newEndTime.getTime() - Date.now();
        auctionTimer = setTimeout(() => {
          endAuction();
        }, timeRemaining);
        
        return { 
          accepted: true, 
          newPrice: bidAmount,
          timeRemaining: Math.ceil(timeRemaining / 1000) // in seconds
        };
      }
      
      return { 
        accepted: true, 
        newPrice: bidAmount 
      };
    }
    
    case 'chinese': {
      // Chinese auction: multiple winners possible, all pay their own bids
      // For simplicity, we'll implement it as everyone pays what they bid
      // (in a real app, this would be more complex with a lottery system)
      if (bidAmount <= 0) {
        return { 
          accepted: false, 
          message: 'Bid must be greater than zero' 
        };
      }
      
      // In a Chinese auction, we don't necessarily have a "highest" bidder
      // but we'll record the highest amount for reference
      if (bidAmount > currentAuction.highestBid) {
        currentAuction.highestBid = bidAmount;
        currentAuction.highestBidderId = userId;
      }
      
      return { 
        accepted: true, 
        message: 'Bid accepted'
      };
    }
    
    default:
      throw new Error(`Unsupported auction type: ${currentAuction.auctionType}`);
  }
}

export async function getFinalPrice(userId: number): Promise<number> {
  // This function determines what a user actually pays based on the auction type
  if (!currentAuction.itemId) {
    throw new Error('No auction data available');
  }
  
  // Get all bids for this item to calculate final price
  const bids = await getBidsForItem(currentAuction.itemId);
  
  switch (currentAuction.auctionType) {
    case 'english':
    case 'dutch':
    case 'firstprice':
    case 'penny':
      // User pays their highest bid if they won
      return currentAuction.highestBidderId === userId ? currentAuction.highestBid : 0;
    
    case 'vikrey': {
      // Winner pays the second-highest bid
      if (currentAuction.highestBidderId !== userId) {
        return 0; // Not the winner
      }
      
      // Sort bids by amount descending
      const sortedBids = [...bids].sort((a, b) => b.amount - a.amount);
      
      // If there's only one bid, they pay the minimum
      if (sortedBids.length <= 1) {
        return 1; // Minimum price
      }
      
      // Find the highest bid that's not from the winner
      const secondHighestBid = sortedBids.find(bid => bid.user_id !== userId);
      return secondHighestBid ? secondHighestBid.amount : 1;
    }
    
    case 'chinese': {
      // Every bidder pays their own bid
      const userBid = bids.find(bid => bid.user_id === userId);
      return userBid ? userBid.amount : 0;
    }
    
    default:
      throw new Error(`Unsupported auction type: ${currentAuction.auctionType}`);
  }
}