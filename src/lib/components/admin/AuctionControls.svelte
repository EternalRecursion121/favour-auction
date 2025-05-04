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

<div class="bg-gray-800 rounded-lg p-6 shadow-lg">
	<h2 class="text-xl font-bold mb-4">Auction Controls</h2>
	
	<div class="flex items-center justify-between mb-4">
		<span class="text-gray-300">Items Remaining:</span>
		<span class="font-medium text-lg">{itemsRemaining}</span>
	</div>
	
	<div class="space-y-3">
		<button 
			class="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
			on:click={handleNextItem}
		>
			Next Item
		</button>
		
		<button 
			class="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800"
			on:click={handleResetAuction}
		>
			Reset Auction
		</button>
	</div>
</div>