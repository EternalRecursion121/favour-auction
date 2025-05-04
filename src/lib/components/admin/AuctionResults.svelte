<script lang="ts">
	import { onMount } from 'svelte';
	
	interface AuctionResult {
		id: number;
		item: string;
		seller: string;
		buyer: string;
		price: number;
		auctionType: string;
	}
	
	export let results: AuctionResult[] = [];
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

<div class="card">
	<div class="card-header flex justify-between items-center">
		<h2 class="text-xl font-bold" style="color: var(--accent-purple);">Auction Results</h2>
		
		<button 
			class="py-1 px-3 text-sm font-mono badge badge-purple"
			on:click={copyToClipboard}
		>
			EXPORT
		</button>
	</div>
	
	<div class="card-content">
		{#if results.length > 0}
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y" style="border-color: rgba(255, 255, 255, 0.08);">
					<thead>
						<tr>
							<th class="px-4 py-3 text-left text-xs font-medium font-mono uppercase tracking-wider" style="color: var(--text-secondary);">Item</th>
							<th class="px-4 py-3 text-left text-xs font-medium font-mono uppercase tracking-wider" style="color: var(--text-secondary);">Seller</th>
							<th class="px-4 py-3 text-left text-xs font-medium font-mono uppercase tracking-wider" style="color: var(--text-secondary);">Buyer</th>
							<th class="px-4 py-3 text-left text-xs font-medium font-mono uppercase tracking-wider" style="color: var(--text-secondary);">Price</th>
							<th class="px-4 py-3 text-left text-xs font-medium font-mono uppercase tracking-wider" style="color: var(--text-secondary);">Type</th>
						</tr>
					</thead>
					<tbody class="divide-y" style="border-color: rgba(255, 255, 255, 0.08);">
						{#each results as result (result.id)}
							<tr>
								<td class="px-4 py-3 text-sm">{result.item}</td>
								<td class="px-4 py-3 text-sm" style="color: var(--accent-teal);">{result.seller}</td>
								<td class="px-4 py-3 text-sm" style="color: var(--accent-orange);">{result.buyer}</td>
								<td class="px-4 py-3 text-sm numeric" style="color: var(--accent-purple);">{result.price}</td>
								<td class="px-4 py-3 text-sm" style="color: var(--accent-blue);">{result.auctionType}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="text-center py-8" style="color: var(--text-secondary);">No auction results yet</p>
		{/if}
	</div>
</div>