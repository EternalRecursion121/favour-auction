<script lang="ts">
    import type { Auction, User } from '$lib/types';
    
    export let currentAuction: Auction | null;
    export let user: User;
</script>

{#if currentAuction && !currentAuction.active && currentAuction.winningBidder}
    <div class="card">
        <div class="card-header">
            <h2 class="text-lg font-bold" style="color: var(--accent-green);">
                Auction Completed
            </h2>
        </div>
        <div class="card-content">
            {#if currentAuction.item && currentAuction.winningBidder}
                <div class="p-4 rounded mb-4" style="background-color: var(--bg-tertiary);">
                    <h3 class="text-lg font-bold">{currentAuction.item.title}</h3>
                    <p class="text-sm mb-4" style="color: var(--text-secondary);">Offered by {currentAuction.item.seller.name}</p>
                    
                    <div class="p-4 rounded" style="background-color: var(--accent-purple);">
                        <p class="text-center">
                            <span class="font-bold">{currentAuction.winningBidder.name}</span> 
                            won with a bid of 
                            <span class="font-bold font-mono">{currentAuction.currentPrice}</span> points
                        </p>
                    </div>
                </div>
                
                {#if currentAuction.winningBidder.id === user.id}
                    <div class="p-3 rounded text-center" style="background-color: var(--accent-green);">
                        <p class="font-bold">Congratulations! You won this item.</p>
                    </div>
                {:else if currentAuction.item.seller.id === user.id}
                    <div class="p-3 rounded text-center" style="background-color: var(--accent-green);">
                        <p class="font-bold">Your item was sold for <span class="font-mono">{currentAuction.currentPrice}</span> points!</p>
                    </div>
                {/if}
            {:else}
                <p class="p-4 text-center" style="color: var(--text-secondary);">
                    Auction completed, but details are not available.
                </p>
            {/if}
        </div>
    </div>
{/if} 