<script lang="ts">
    import type { User } from '$lib/types';
    
    export let user: User;
    export let authenticated: boolean;
</script>

<header style="background-color: var(--bg-secondary);" class="p-4 shadow-md">
    <div class="container mx-auto flex justify-between items-center">
        <h1 class="text-2xl font-bold" style="color: var(--accent-blue);">
            Favour Auction
        </h1>
        {#if authenticated}
            <div class="flex items-center gap-4">
                <div class="px-3 py-1 rounded" style="background-color: var(--bg-tertiary);">
                    <span>{user.name}</span>
                </div>
                <div class="badge badge-purple">
                    <span class="numeric">{user.balance}</span> points
                </div>
            </div>
        {/if}
    </div>
</header> 