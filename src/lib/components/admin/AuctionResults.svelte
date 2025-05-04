<script lang="ts">
	import { onMount } from 'svelte';
	
	export let results = [];
	let exportText = '';
	
	onMount(() => {
		// Sample data
		results = [
			{ id: 1, item: 'Guitar Lesson', seller: 'Sam', buyer: 'Alex', price: 35, auctionType: 'English' },
			{ id: 2, item: 'Cooking Class', seller: 'Jordan', buyer: 'Taylor', price: 42, auctionType: 'Dutch' }
		];
	});
	
	function generateExport() {
		let text = 'Favour Auction Results:\n\n';
		
		results.forEach(r => {
			text += `${r.buyer} bought "${r.item}" from ${r.seller} for ${r.price} points (${r.auctionType})\n`;
		});
		
		exportText = text;
	}
	
	function copyToClipboard() {
		if (!exportText) generateExport();
		
		navigator.clipboard.writeText(exportText)
			.then(() => alert('Copied to clipboard'))
			.catch(err => console.error('Failed to copy: ', err));
	}
</script>

<div class="bg-gray-800 rounded-lg p-6 shadow-lg">
	<div class="flex justify-between items-center mb-4">
		<h2 class="text-xl font-bold">Auction Results</h2>
		
		<button 
			class="py-1 px-3 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800"
			on:click={copyToClipboard}
		>
			Export Results
		</button>
	</div>
	
	{#if results.length > 0}
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-gray-700">
				<thead>
					<tr>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Item</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Seller</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Buyer</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Price</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-700">
					{#each results as result (result.id)}
						<tr>
							<td class="px-4 py-3 text-sm text-gray-300">{result.item}</td>
							<td class="px-4 py-3 text-sm text-gray-300">{result.seller}</td>
							<td class="px-4 py-3 text-sm text-gray-300">{result.buyer}</td>
							<td class="px-4 py-3 text-sm text-gray-300">{result.price}</td>
							<td class="px-4 py-3 text-sm text-gray-300">{result.auctionType}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<p class="text-center text-gray-400 py-8">No auction results yet</p>
	{/if}
</div>