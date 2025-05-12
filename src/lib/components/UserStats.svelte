<script lang="ts">
    import type { User, BalanceHistoryEntry } from '$lib/types';
    
    export let user: User;
    export let userItems: number;
    export let remainingItems: number;
    export let balanceHistory: BalanceHistoryEntry[];
    
    let showBalanceHistory = false;
</script>

<div class="card">
    <div class="card-header">
        <h2 class="text-lg font-bold" style="color: var(--accent-teal);">
            Your Stats
        </h2>
    </div>
    <div class="card-content">
        <div class="space-y-2">
            <p>Balance: <span class="font-bold numeric">{user.balance}</span> points</p>
            <p>Items Bought: <span class="font-bold numeric">{user.itemsBought || 0}</span></p>
            <p>Items Sold: <span class="font-bold numeric">{user.itemsSold || 0}</span></p>
            <p>Your Items Remaining: <span class="font-bold numeric">{userItems}</span></p>
            <p>Total Items Remaining: <span class="font-bold numeric">{remainingItems}</span></p>
        </div>
        
        <div class="mt-4">
            <button 
                on:click={() => showBalanceHistory = !showBalanceHistory}
                class="text-sm font-mono"
                style="color: var(--accent-purple);"
            >
                {showBalanceHistory ? '[ - ]' : '[ + ]'} Balance History
            </button>
            
            {#if showBalanceHistory && balanceHistory.length > 0}
                <div class="mt-2 max-h-40 overflow-y-auto">
                    <table class="w-full text-sm">
                        <thead class="text-xs" style="color: var(--text-secondary);">
                            <tr>
                                <th class="text-left py-1">Date</th>
                                <th class="text-right py-1">Balance</th>
                                <th class="text-right py-1">Reason</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each balanceHistory as entry}
                                <tr class="border-t border-gray-700">
                                    <td class="py-1">{new Date(entry.timestamp).toLocaleDateString()}</td>
                                    <td class="text-right py-1 numeric">{entry.balance}</td>
                                    <td class="text-right py-1 capitalize">{entry.reason}</td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {:else if showBalanceHistory}
                <p class="text-sm mt-2" style="color: var(--text-secondary);">
                    No balance history yet.
                </p>
            {/if}
        </div>
    </div>
</div> 