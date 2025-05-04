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

<div class="bg-gray-800 rounded-lg p-6 shadow-lg">
	<h2 class="text-xl font-bold mb-4">Auction Configuration</h2>
	
	<div class="space-y-4">
		<!-- Auction Type -->
		<div>
			<label for="auctionType" class="block text-sm font-medium text-gray-300 mb-2">Auction Type</label>
			<select 
				id="auctionType" 
				class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
				class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
				bind:checked={allowNewItems}
			>
			<label for="allowNewItems" class="ml-2 block text-sm text-gray-300">
				Allow new items after auction start
			</label>
		</div>
		
		<!-- Penny Auction Params (conditionally shown) -->
		{#if auctionType === 'penny'}
			<div class="pt-2 border-t border-gray-700">
				<h3 class="text-sm font-medium text-gray-300 mb-3">Penny Auction Parameters</h3>
				
				<div class="space-y-3">
					<div>
						<label for="increment" class="block text-xs text-gray-400">Increment Amount</label>
						<input 
							id="increment" 
							type="number" 
							class="w-full px-3 py-1 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
							bind:value={pennyAuctionConfig.incrementAmount}
							min="1"
						>
					</div>
					
					<div>
						<label for="timeExt" class="block text-xs text-gray-400">Time Extension (seconds)</label>
						<input 
							id="timeExt" 
							type="number" 
							class="w-full px-3 py-1 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
							bind:value={pennyAuctionConfig.timeExtension}
							min="1"
						>
					</div>
					
					<div>
						<label for="minTime" class="block text-xs text-gray-400">Minimum Time (seconds)</label>
						<input 
							id="minTime" 
							type="number" 
							class="w-full px-3 py-1 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
							bind:value={pennyAuctionConfig.minimumTimeRemaining}
							min="5"
						>
					</div>
				</div>
			</div>
		{/if}
		
		<button 
			class="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800 mt-2"
			on:click={handleSaveConfig}
		>
			Save Configuration
		</button>
	</div>
</div>