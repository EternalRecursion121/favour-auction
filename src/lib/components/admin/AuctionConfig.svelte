<script lang="ts">
	let auctionType = 'english';
	let allowNewItems = true;
	let pennyAuctionConfig = {
		incrementAmount: 1,
		timeExtension: 10, // seconds
		minimumTimeRemaining: 30 // seconds
	};
	
	function handleSaveConfig() {
		// Would save config to database/state
		console.log('Config saved', {
			auctionType,
			allowNewItems,
			pennyAuctionConfig
		});
	}
</script>

<div class="card">
	<div class="card-header">
		<h2 class="text-xl font-bold" style="color: var(--accent-teal);">Auction Configuration</h2>
	</div>
	
	<div class="card-content">
		<div class="space-y-4">
			<!-- Auction Type -->
			<div>
				<label for="auctionType" class="block text-sm font-medium mb-2">Auction Type</label>
				<select 
					id="auctionType" 
					class="w-full px-3 py-2"
					bind:value={auctionType}
				>
					<option value="english">English Auction</option>
					<option value="dutch">Dutch Auction</option>
					<option value="firstprice">First Price Sealed</option>
					<option value="vikrey">Vikrey Auction</option>
					<option value="chinese">Chinese Auction</option>
					<option value="penny">Penny Auction</option>
					<option value="random">Random</option>
				</select>
			</div>
			
			<!-- Allow New Items -->
			<div class="flex items-center">
				<input 
					id="allowNewItems" 
					type="checkbox" 
					class="h-4 w-4"
					bind:checked={allowNewItems}
				>
				<label for="allowNewItems" class="ml-2 block text-sm" style="color: var(--text-secondary);">
					Allow new items after auction start
				</label>
			</div>
			
			<!-- Penny Auction Params (conditionally shown) -->
			{#if auctionType === 'penny'}
				<div class="pt-2 border-t" style="border-color: rgba(255, 255, 255, 0.08);">
					<h3 class="text-sm font-medium mb-3" style="color: var(--accent-purple);">Penny Auction Parameters</h3>
					
					<div class="space-y-3">
						<div>
							<label for="increment" class="block text-xs" style="color: var(--text-secondary);">Increment Amount</label>
							<input 
								id="increment" 
								type="number" 
								class="w-full px-3 py-1 numeric"
								bind:value={pennyAuctionConfig.incrementAmount}
								min="1"
							>
						</div>
						
						<div>
							<label for="timeExt" class="block text-xs" style="color: var(--text-secondary);">Time Extension (seconds)</label>
							<input 
								id="timeExt" 
								type="number" 
								class="w-full px-3 py-1 numeric"
								bind:value={pennyAuctionConfig.timeExtension}
								min="1"
							>
						</div>
						
						<div>
							<label for="minTime" class="block text-xs" style="color: var(--text-secondary);">Minimum Time (seconds)</label>
							<input 
								id="minTime" 
								type="number" 
								class="w-full px-3 py-1 numeric"
								bind:value={pennyAuctionConfig.minimumTimeRemaining}
								min="5"
							>
						</div>
					</div>
				</div>
			{/if}
			
			<button 
				class="w-full btn btn-green font-mono mt-2"
				on:click={handleSaveConfig}
			>
				SAVE CONFIGURATION
			</button>
		</div>
	</div>
</div>