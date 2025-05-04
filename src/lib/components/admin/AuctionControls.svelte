<script lang="ts">
	export let itemsRemaining = 0;
	
	function handleResetAuction() {
		// Would call API to reset auction
		console.log('Reset auction');
	}
	
	function handleNextItem() {
		// Would call API to move to next item
		console.log('Next item');
	}
</script>

<div class="card">
	<div class="card-header">
		<h2 class="text-xl font-bold" style="color: var(--accent-blue);">Auction Controls</h2>
	</div>
	
	<div class="card-content">
		<div class="flex items-center justify-between mb-4">
			<span style="color: var(--text-secondary);">Items Remaining:</span>
			<span class="font-medium text-lg numeric">{itemsRemaining}</span>
		</div>
		
		<div class="space-y-3">
			<button 
				class="w-full btn btn-blue font-mono"
				on:click={handleNextItem}
			>
				NEXT ITEM
			</button>
			
			<button 
				class="w-full font-mono"
				style="background-color: var(--accent-red); color: white; border-radius: 4px; padding: 0.5rem 1rem; font-weight: 500; font-size: 14px; transition: all 0.2s ease; border: none; letter-spacing: 0.01em;"
				on:click={handleResetAuction}
			>
				RESET AUCTION
			</button>
		</div>
	</div>
</div>