<script lang="ts">
    import PriceChart from './PriceChart.svelte';
    import type { Auction, User, ChartDataPoint, AuctionConfig } from '$lib/types';
    
    export let currentAuction: Auction | null;
    export let user: User;
    export let priceHistory: ChartDataPoint[];
    export let auctionConfig: AuctionConfig | null;
    export let onPlaceBid: (amount: number) => void;
    
    let bidAmount = 0;
    let bidMessage = '';
    let bidStatus: 'success' | 'error' | '' = '';
    let isBidding = false;

    // Format auction type for display
    function formatAuctionType(type: string | null): string {
        if (!type) return '';

        const types: Record<string, string> = {
            'english': 'English Auction (ascending)',
            'dutch': 'Dutch Auction (descending)',
            'firstprice': 'First Price Sealed Bid',
            'vikrey': 'Vikrey Auction (second price)',
            'chinese': 'Chinese Auction',
            'penny': 'Penny Auction'
        };

        return types[type] || String(type);
    }

    // Calculate time remaining in human-readable format
    function formatTimeRemaining(seconds: number | null | undefined): string {
        if (seconds === null || seconds === undefined) return 'Unknown';
        if (seconds <= 0) return 'Ended';

        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        }
        return `${remainingSeconds}s`;
    }

    async function handleBid() {
        try {
            isBidding = true;
            bidMessage = '';
            bidStatus = '';

            // Call the provided bid handler
            const result = await onPlaceBid(bidAmount);

            // Set success message and status
            if (result && result.success) {
                bidStatus = 'success';
                bidMessage = 'Bid placed successfully!';
                bidAmount = 0; // Reset bid amount on success

                // Clear message after a delay
                setTimeout(() => {
                    if (bidStatus === 'success') {
                        bidMessage = '';
                        bidStatus = '';
                    }
                }, 5000);
            } else {
                bidStatus = 'error';
                bidMessage = result?.message || 'Failed to place bid. Please try again.';
            }
        } catch (error) {
            console.error('Error placing bid:', error);
            bidStatus = 'error';
            bidMessage = 'Error placing bid. Please try again.';
        } finally {
            isBidding = false;
        }
    }
</script>

{#if currentAuction && currentAuction.active}
    <div class="card">
        <div class="card-header flex justify-between items-center">
            <h2 class="text-lg font-bold" style="color: var(--accent-blue);">
                Current Auction
            </h2>
            <div class="flex items-center gap-2">
                <span class="badge badge-blue font-mono text-xs">
                    {currentAuction.auctionType}
                </span>
                <span class="text-xs font-mono" style="color: var(--text-secondary);">
                    {formatTimeRemaining(currentAuction.timeRemaining)}
                </span>
            </div>
        </div>
        <div class="card-content">
            <div class="p-4 mb-4 rounded" style="background-color: var(--bg-tertiary);">
                {#if currentAuction.item}
                    <h3 class="text-lg font-bold">{currentAuction.item.title}</h3>
                    <p class="text-sm mb-2" style="color: var(--text-secondary);">Offered by {currentAuction.item.seller.name}</p>
                    <p class="text-sm">{currentAuction.item.description}</p>
                {:else}
                    <p class="text-sm" style="color: var(--text-secondary);">No item information available</p>
                {/if}
            </div>
            
            <div class="mb-4 flex justify-between">
                <div>
                    <p class="text-sm font-medium mb-1">Current Price:</p>
                    <p class="text-xl font-bold font-mono" style="color: var(--accent-orange);">{currentAuction.currentPrice} points</p>
                </div>
                
                {#if currentAuction.winningBidder && currentAuction.auctionType !== 'firstprice' && currentAuction.auctionType !== 'vikrey'}
                    <div>
                        <p class="text-sm font-medium mb-1">Current Winner:</p>
                        <p class="text-lg font-bold" style="color: var(--accent-purple);">
                            {currentAuction.winningBidder.id === user.id ? 'You' : currentAuction.winningBidder.name}
                        </p>
                    </div>
                {/if}
            </div>
            
            <!-- Bidding UI -->
            <div class="mt-6">
                <h3 class="text-lg font-bold mb-2" style="color: var(--accent-purple);">
                    Place Your Bid
                </h3>
                
                <div class="text-sm mb-2 font-mono" style="color: var(--text-secondary);">
                    {#if currentAuction.auctionType === 'english'}
                        <p>Minimum bid: <span class="numeric">{currentAuction.currentPrice + 1}</span> points</p>
                    {:else if currentAuction.auctionType === 'dutch'}
                        <p>Current offer: <span class="numeric">{currentAuction.currentPrice}</span> points (automatically decreasing)</p>
                    {:else if ['firstprice', 'vikrey'].includes(currentAuction.auctionType)}
                        <p>Enter your sealed bid amount:</p>
                    {:else if currentAuction.auctionType === 'penny'}
                        <p>Current price: <span class="numeric">{currentAuction.currentPrice}</span> points (increases by <span class="numeric">{auctionConfig?.pennyAuctionConfig?.incrementAmount || 1}</span> when you bid)</p>
                    {/if}
                </div>
                
                <form on:submit|preventDefault={handleBid} class="flex gap-2">
                    <input
                        type="number"
                        bind:value={bidAmount}
                        min={currentAuction.auctionType === 'english' ? currentAuction.currentPrice + 1 : 1}
                        class="flex-1 p-2 numeric"
                        placeholder="Amount"
                        disabled={isBidding}
                    />
                    <button
                        type="submit"
                        class="py-2 px-6 btn btn-purple font-mono"
                        disabled={!bidAmount || user.balance < bidAmount || isBidding}
                    >
                        {#if isBidding}
                            BIDDING...
                        {:else}
                            BID
                        {/if}
                    </button>
                </form>

                {#if bidMessage}
                    <div class="mt-2 p-2 rounded text-sm" style={`background-color: ${bidStatus === 'success' ? 'var(--accent-green)' : 'var(--accent-red)'}; color: white;`}>
                        {bidMessage}
                    </div>
                {/if}
                
                {#if user.balance < bidAmount}
                    <p class="text-xs mt-1 font-mono" style="color: var(--accent-red);">
                        You don't have enough points for this bid.
                    </p>
                {/if}
            </div>
            
            <!-- Price History Chart -->
            {#if priceHistory.length > 0 && ['english', 'dutch', 'penny'].includes(currentAuction.auctionType)}
                <div class="mt-6">
                    <h3 class="text-lg font-bold mb-2" style="color: var(--accent-teal);">
                        Price History
                    </h3>
                    <PriceChart data={priceHistory} />
                </div>
            {/if}
            
            <!-- Bid History -->
            {#if currentAuction.bids && currentAuction.bids.length > 0 && !['firstprice', 'vikrey'].includes(currentAuction.auctionType)}
                <div class="mt-6">
                    <h3 class="text-lg font-bold mb-2" style="color: var(--accent-orange);">
                        Bid History
                    </h3>
                    <div class="max-h-40 overflow-y-auto">
                        <table class="w-full text-sm">
                            <thead class="text-xs font-mono" style="color: var(--text-secondary);">
                                <tr>
                                    <th class="text-left py-1">BIDDER</th>
                                    <th class="text-right py-1">AMOUNT</th>
                                    <th class="text-right py-1">TIME</th>
                                </tr>
                            </thead>
                            <tbody>
                                {#each currentAuction.bids as bid}
                                    <tr class="border-t border-gray-700">
                                        <td class="py-1" style="color: var(--accent-purple);">
                                            {bid.userId === user.id ? 'You' : bid.userName}
                                        </td>
                                        <td class="text-right py-1 numeric" style="color: var(--accent-orange);">{bid.amount}</td>
                                        <td class="text-right py-1 text-xs" style="color: var(--text-secondary);">
                                            {new Date(bid.timestamp).toLocaleTimeString()}
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                </div>
            {/if}
        </div>
    </div>
{:else}
    <div class="card flex flex-col items-center justify-center p-10 min-h-60">
        <h2 class="text-xl font-bold mb-4" style="color: var(--accent-blue);">
            No Active Auction
        </h2>
        <p style="color: var(--text-secondary);">
            Waiting for the admin to start the next auction...
        </p>
        <div class="mt-4 font-mono">
            <span class="text-2xl font-mono blink" style="color: var(--accent-purple);">_</span>
        </div>
    </div>
{/if} 