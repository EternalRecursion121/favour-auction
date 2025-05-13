<script lang="ts">
    import PriceChart from './PriceChart.svelte';
    import type { Auction, User, ChartDataPoint, AuctionConfig, BidResult, Bid } from '$lib/types';
    import { onDestroy } from 'svelte'; // onMount is no longer needed for fetching
    
    export let currentAuction: Auction | null;
    export let user: User;
    // export let priceHistory: ChartDataPoint[]; // Removed, will derive from currentAuction.bidHistory
    export let auctionConfig: AuctionConfig | null;
    export let onPlaceBid: (itemId: number, amount: number) => Promise<BidResult | null>; // Modified signature
    
    let bidAmount = 0;
    let bidMessage = '';
    let bidStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
    let isBidding = false; // Renamed from bidStatus === 'loading' for clarity in disabled state

    // Reactive declaration for priceHistory derived from currentAuction
    let priceHistoryForChart: ChartDataPoint[] = [];
    $: {
        if (currentAuction && currentAuction.bidHistory) {
            priceHistoryForChart = currentAuction.bidHistory.map((bid: Bid) => ({
                time: new Date(bid.timestamp).getTime(),
                value: bid.amount
            }));
        } else {
            priceHistoryForChart = [];
        }
    }

    // Format auction type for display
    function formatAuctionType(type: string | null | undefined): string {
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
        if (seconds === null || seconds === undefined) return 'N/A';
        if (seconds <= 0) return 'Ended';

        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        }
        return `${remainingSeconds}s`;
    }

    async function handleSubmitBid() {
        if (!currentAuction?.item || !user) return;
        
        isBidding = true;
        bidStatus = 'loading';
        bidMessage = '';
        
        try {
            // Call the onPlaceBid prop provided by the parent
            const result = await onPlaceBid(currentAuction.item.id, bidAmount);
            
            if (result && result.accepted) {
                bidStatus = 'success';
                bidMessage = result.message || 'Bid placed successfully!';
                // The parent component will be responsible for updating currentAuction and user balance if needed,
                // as this component now relies on props for that data.
                // For example, parent can refetch auction data and user data upon successful bid.
                setTimeout(() => {
                    if (bidStatus === 'success') {
                         bidMessage = '';
                         bidStatus = 'idle';
                    }
                }, 3000);

            } else {
                bidStatus = 'error';
                bidMessage = result?.message || 'Failed to place bid. Please try again.';
            }
        } catch (error: any) {
            bidStatus = 'error';
            bidMessage = error.message || 'Client error: Failed to place bid.';
            console.error('Failed to place bid via onPlaceBid:', error);
        } finally {
            isBidding = false;
            if (bidStatus !== 'success') { // Keep error message visible longer
                 setTimeout(() => {
                    if (bidStatus === 'error') { // only clear if still error
                         bidMessage = '';
                         bidStatus = 'idle';
                    }
                }, 5000);
            }
        }
    }

    // onDestroy(() => {
    //     // Clear any intervals if they were used (not needed anymore)
    // });

</script>

{#if currentAuction && currentAuction.active}
    <div class="card">
        <div class="card-header flex justify-between items-center">
            <h2 class="text-lg font-bold" style="color: var(--accent-blue);">
                Current Auction
            </h2>
            <div class="flex items-center gap-2">
                <span class="badge badge-blue font-mono text-xs">
                    {formatAuctionType(currentAuction.auctionType)}
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
            
            <div class="mt-6">
                <h3 class="text-lg font-bold mb-2" style="color: var(--accent-purple);">
                    Place Your Bid
                </h3>
                
                <div class="text-sm mb-2 font-mono" style="color: var(--text-secondary);">
                    {#if currentAuction.auctionType === 'english'}
                        <p>Minimum bid: <span class="numeric">{currentAuction.currentPrice + (auctionConfig?.pennyAuctionConfig?.incrementAmount || 1)}</span> points</p>
                    {:else if currentAuction.auctionType === 'dutch'}
                        <p>Current offer: <span class="numeric">{currentAuction.currentPrice}</span> points (bid to accept)</p>
                    {:else if ['firstprice', 'vikrey'].includes(currentAuction.auctionType)}
                        <p>Enter your sealed bid amount:</p>
                    {:else if currentAuction.auctionType === 'penny'}
                        <p>Bid <span class="numeric">{auctionConfig?.pennyAuctionConfig?.incrementAmount || 1}</span> point{(auctionConfig?.pennyAuctionConfig?.incrementAmount || 1) > 1 ? 's' : ''} to increase price to <span class="numeric">{currentAuction.currentPrice + (auctionConfig?.pennyAuctionConfig?.incrementAmount || 1)}</span></p>
                    {/if}
                </div>
                
                <form on:submit|preventDefault={handleSubmitBid} class="flex gap-2">
                    <input
                        type="number"
                        bind:value={bidAmount}
                        min={currentAuction.auctionType === 'english' ? currentAuction.currentPrice + (auctionConfig?.pennyAuctionConfig?.incrementAmount || 1) : 1}
                        step={currentAuction.auctionType === 'penny' ? (auctionConfig?.pennyAuctionConfig?.incrementAmount || 1) : 1}
                        class="flex-1 p-2 numeric"
                        placeholder="Amount"
                        disabled={isBidding || !currentAuction.active || (currentAuction.auctionType === 'penny' && user.balance < (auctionConfig?.pennyAuctionConfig?.incrementAmount || 1) )}
                        required
                    />
                    <button
                        type="submit"
                        class="py-2 px-6 btn btn-purple font-mono"
                        disabled={isBidding || !currentAuction.active || (currentAuction.auctionType !== 'penny' && (!bidAmount || user.balance < bidAmount)) || (currentAuction.auctionType === 'penny' && user.balance < (auctionConfig?.pennyAuctionConfig?.incrementAmount || 1))}
                    >
                        {#if isBidding}
                            BIDDING...
                        {:else}
                            BID
                        {/if}
                    </button>
                </form>

                {#if bidMessage}
                    <div class="mt-2 p-2 rounded text-sm text-center" style="background-color: ${bidStatus === 'success' ? 'var(--accent-green)' : 'var(--accent-red)'}; color: ${bidStatus === 'success' ? 'var(--text-primary)' : 'white'};">
                        {bidMessage}
                    </div>
                {/if}
                
                {#if currentAuction.auctionType !== 'penny' && user.balance < bidAmount && bidAmount > 0}
                    <p class="text-xs mt-1 font-mono" style="color: var(--accent-red);">
                        You don't have enough points for this bid. Current balance: {user.balance}
                    </p>
                {:else if currentAuction.auctionType === 'penny' && user.balance < (auctionConfig?.pennyAuctionConfig?.incrementAmount || 1)}
                     <p class="text-xs mt-1 font-mono" style="color: var(--accent-red);">
                        You don't have enough points to bid. Cost: {auctionConfig?.pennyAuctionConfig?.incrementAmount || 1}. Balance: {user.balance}
                    </p>
                {/if}
            </div>
            
            {#if priceHistoryForChart.length > 0 && ['english', 'dutch', 'penny'].includes(currentAuction.auctionType)}
                <div class="mt-6">
                    <h3 class="text-lg font-bold mb-2" style="color: var(--accent-teal);">
                        Price History
                    </h3>
                    <PriceChart data={priceHistoryForChart} />
                </div>
            {/if}
            
            {#if currentAuction.bids && currentAuction.bids.length > 0 && !['firstprice', 'vikrey'].includes(currentAuction.auctionType)}
                <div class="mt-6">
                    <h3 class="text-lg font-bold mb-2" style="color: var(--accent-orange);">
                        Bid History
                    </h3>
                    <div class="max-h-40 overflow-y-auto bg-bg-secondary p-2 rounded">
                        <table class="w-full text-sm">
                            <thead class="text-xs font-mono" style="color: var(--text-secondary);">
                                <tr>
                                    <th class="text-left py-1 px-2">BIDDER</th>
                                    <th class="text-right py-1 px-2">AMOUNT</th>
                                    <th class="text-right py-1 px-2">TIME</th>
                                </tr>
                            </thead>
                            <tbody>
                                {#each currentAuction.bids as bid (bid.id || bid.timestamp + '-' + bid.amount)}
                                    <tr class="border-t border-bg-primary">
                                        <td class="py-1 px-2" style="color: var(--accent-purple);">
                                            {bid.userId === user.id ? 'You' : bid.userName}
                                        </td>
                                        <td class="text-right py-1 px-2 numeric" style="color: var(--accent-orange);">{bid.amount}</td>
                                        <td class="text-right py-1 px-2 text-xs" style="color: var(--text-secondary);">
                                            {new Date(bid.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit'})}
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
    <div class="card flex flex-col items-center justify-center p-10 min-h-[20rem] text-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-12 h-12 mb-4 text-text-tertiary opacity-50">
            <path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clip-rule="evenodd" />
        </svg>
        <h2 class="text-xl font-bold mb-2" style="color: var(--accent-blue);">
            No Active Auction
        </h2>
        <p style="color: var(--text-secondary);">
            Please wait for the admin to start the next auction.
        </p>
        <div class="mt-6 font-mono animate-pulse text-sm" style="color: var(--accent-purple);">
            ( •_•)
            <br>
            ( •_•)>⌐■-■
            <br>
            (⌐■_■)
        </div>
    </div>
{/if} 