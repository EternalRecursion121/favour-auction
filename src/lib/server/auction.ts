import { getAuctionConfig, getBidsForItem, getItemById } from './db';

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

  const config = await getAuctionConfig();
  if (!config) {
    // Decide how to handle missing config: throw error or default?
    // For now, let's throw, as it implies a critical setup issue.
    throw new Error('Auction configuration not found. Cannot start auction.');
  }
  
  let auctionType = config.auctionType; // Use config.auctionType
  if (auctionType === 'random') {
    const types = ['english', 'dutch', 'firstprice', 'vikrey', 'chinese', 'penny'];
    auctionType = types[Math.floor(Math.random() * types.length)];
  }

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

  if (auctionType === 'dutch') {
    const initialPrice = 100;
    const decreaseInterval = 10000;
    const decreaseAmount = 5;
    
    currentAuction.highestBid = initialPrice;
    currentAuction.priceHistory = [{ timestamp: new Date(), price: initialPrice }];
    
    function decreasePrice() {
      if (!currentAuction.active) return;
      const newPrice = Math.max(0, currentAuction.highestBid - decreaseAmount);
      currentAuction.highestBid = newPrice;
      currentAuction.priceHistory.push({ timestamp: new Date(), price: newPrice });
      if (newPrice > 0) {
        auctionTimer = setTimeout(decreasePrice, decreaseInterval);
      } else {
        currentAuction.active = false;
        currentAuction.endTime = new Date();
      }
    }
    auctionTimer = setTimeout(decreasePrice, decreaseInterval);
  }
  
  if (['firstprice', 'vikrey'].includes(auctionType)) {
    const duration = 60 * 1000;
    const endTime = new Date(Date.now() + duration);
    currentAuction.endTime = endTime;
    auctionTimer = setTimeout(() => endAuction(), duration);
  }
  
  if (auctionType === 'penny') {
    // Ensure pennyAuctionConfig exists and has the property
    if (!config.pennyAuctionConfig || typeof config.pennyAuctionConfig.minimumTimeRemaining === 'undefined') {
        throw new Error('Penny auction configuration for minimumTimeRemaining is missing.');
    }
    const duration = config.pennyAuctionConfig.minimumTimeRemaining * 1000; // Use config.pennyAuctionConfig.minimumTimeRemaining
    currentAuction.endTime = new Date(Date.now() + duration);
    auctionTimer = setTimeout(() => endAuction(), duration);
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
  if (!currentAuction.active || currentAuction.itemId !== itemId) {
    throw new Error('No active auction for this item');
  }
  
  const config = await getAuctionConfig();
  if (!config) {
    throw new Error('Auction configuration not found. Cannot process bid.');
  }
  
  switch (currentAuction.auctionType) {
    case 'english': {
      if (bidAmount <= currentAuction.highestBid) {
        return { accepted: false, message: 'Bid must be higher than current highest bid' };
      }
      currentAuction.highestBid = bidAmount;
      currentAuction.highestBidderId = userId;
      currentAuction.priceHistory.push({ timestamp: new Date(), price: bidAmount });
      return { accepted: true, newPrice: bidAmount };
    }
    case 'dutch': {
      const acceptedPrice = currentAuction.highestBid;
      currentAuction.highestBidderId = userId;
      endAuction();
      return { accepted: true, newPrice: acceptedPrice, auctionEnded: true };
    }
    case 'firstprice': {
      if (bidAmount > currentAuction.highestBid) {
        currentAuction.highestBid = bidAmount;
        currentAuction.highestBidderId = userId;
      }
      return { accepted: true, message: 'Bid accepted' };
    }
    case 'vikrey': {
      const previousHighestBid = currentAuction.highestBid;
      if (bidAmount > currentAuction.highestBid) {
        currentAuction.priceHistory.push({ timestamp: new Date(), price: previousHighestBid });
        currentAuction.highestBid = bidAmount;
        currentAuction.highestBidderId = userId;
      }
      return { accepted: true, message: 'Bid accepted' };
    }
    case 'penny': {
      if (!config.pennyAuctionConfig || typeof config.pennyAuctionConfig.incrementAmount === 'undefined') {
        throw new Error('Penny auction configuration for incrementAmount is missing.');
      }
      const minIncrement = config.pennyAuctionConfig.incrementAmount; // Use config.pennyAuctionConfig.incrementAmount
      
      if (bidAmount < currentAuction.highestBid + minIncrement) {
        return { accepted: false, message: `Bid must be at least ${minIncrement} points higher than current bid` };
      }
      
      currentAuction.highestBid = bidAmount;
      currentAuction.highestBidderId = userId;
      currentAuction.priceHistory.push({ timestamp: new Date(), price: bidAmount });
      
      if (currentAuction.endTime) {
        if (!config.pennyAuctionConfig || typeof config.pennyAuctionConfig.timeExtension === 'undefined') {
            throw new Error('Penny auction configuration for timeExtension is missing.');
        }
        const timeExtension = config.pennyAuctionConfig.timeExtension; // Use config.pennyAuctionConfig.timeExtension
        const newEndTime = new Date(Math.max(currentAuction.endTime.getTime(), Date.now() + (timeExtension * 1000)));
        currentAuction.endTime = newEndTime;
        
        if (auctionTimer) clearTimeout(auctionTimer);
        const timeRemaining = newEndTime.getTime() - Date.now();
        auctionTimer = setTimeout(() => endAuction(), timeRemaining);
        
        return { accepted: true, newPrice: bidAmount, timeRemaining: Math.ceil(timeRemaining / 1000) };
      }
      return { accepted: true, newPrice: bidAmount };
    }
    case 'chinese': {
      if (bidAmount <= 0) {
        return { accepted: false, message: 'Bid must be greater than zero' };
      }
      if (bidAmount > currentAuction.highestBid) {
        currentAuction.highestBid = bidAmount;
        currentAuction.highestBidderId = userId;
      }
      return { accepted: true, message: 'Bid accepted' };
    }
    default:
      throw new Error(`Unsupported auction type: ${currentAuction.auctionType}`);
  }
}

export async function getFinalPrice(userId: number): Promise<number> {
  if (!currentAuction.itemId) {
    throw new Error('No auction data available');
  }
  const bids = await getBidsForItem(currentAuction.itemId);
  switch (currentAuction.auctionType) {
    case 'english':
    case 'dutch':
    case 'firstprice':
    case 'penny':
      return currentAuction.highestBidderId === userId ? currentAuction.highestBid : 0;
    case 'vikrey': {
      if (currentAuction.highestBidderId !== userId) return 0;
      const sortedBids = [...bids].sort((a, b) => b.amount - a.amount);
      if (sortedBids.length <= 1) return 1;
      const secondHighestBid = sortedBids.find(bid => bid.user_id !== userId);
      return secondHighestBid ? secondHighestBid.amount : 1;
    }
    case 'chinese': {
      const userBid = bids.find(bid => bid.user_id === userId);
      return userBid ? userBid.amount : 0;
    }
    default:
      throw new Error(`Unsupported auction type: ${currentAuction.auctionType}`);
  }
}