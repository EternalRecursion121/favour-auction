<script lang="ts">
	let auctionType = 'english';
	let allowNewItems = true;
	let pennyAuctionConfig = {
		incrementAmount: 1,
		timeExtension: 10, // seconds
		minimumTimeRemaining: 30 // seconds
	};
	
	let configSuccess = false;
	let configMessage = '';
	
	async function handleSaveConfig() {
		try {
			const response = await fetch('/api/admin/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					auctionType,
					allowNewItems,
					pennyAuctionConfig
				})
			});

			if (response.ok) {
				configSuccess = true;
				configMessage = 'Configuration updated successfully!';
				
				// Clear success message after 3 seconds
				setTimeout(() => {
					configSuccess = false;
					configMessage = '';
				}, 3000);
			} else {
				const error = await response.json();
				configSuccess = false;
				configMessage = error.message || 'Failed to update configuration';
			}
		} catch (error) {
			console.error('Failed to update config:', error);
			configSuccess = false;
			configMessage = 'Failed to update configuration';
		}
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
				<div class="space-y-4 p-4 rounded" style="background-color: var(--bg-tertiary);">
					<h3 class="font-bold" style="color: var(--accent-purple);">Penny Auction Settings</h3>
					
					<div>
						<label for="incrementAmount" class="block text-sm font-medium mb-1">
							Increment Amount (points)
						</label>
						<input 
							type="number" 
							id="incrementAmount" 
							class="w-full px-3 py-2"
							bind:value={pennyAuctionConfig.incrementAmount}
							min="1"
						/>
					</div>
					
					<div>
						<label for="timeExtension" class="block text-sm font-medium mb-1">
							Time Extension (seconds)
						</label>
						<input 
							type="number" 
							id="timeExtension" 
							class="w-full px-3 py-2"
							bind:value={pennyAuctionConfig.timeExtension}
							min="1"
						/>
					</div>
					
					<div>
						<label for="minimumTime" class="block text-sm font-medium mb-1">
							Minimum Time Remaining (seconds)
						</label>
						<input 
							type="number" 
							id="minimumTime" 
							class="w-full px-3 py-2"
							bind:value={pennyAuctionConfig.minimumTimeRemaining}
							min="1"
						/>
					</div>
				</div>
			{/if}
			
			<button 
				on:click={handleSaveConfig}
				class="w-full py-2 px-4 btn btn-teal font-mono"
			>
				SAVE CONFIGURATION
			</button>

			{#if configMessage}
				<div class="mt-4 p-3 rounded text-center" style="background-color: {configSuccess ? 'var(--accent-green)' : 'var(--accent-red)'};">
					<p class="font-bold">{configMessage}</p>
				</div>
			{/if}
		</div>
	</div>
</div>