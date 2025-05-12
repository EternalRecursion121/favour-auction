<script lang="ts">
	import { onMount } from 'svelte';
	import type { AuctionConfig } from '$lib/types';
	import AuctionControls from './AuctionControls.svelte';
	import PriceChart from '../PriceChart.svelte';
	import AuctionResults from './AuctionResults.svelte';

	let auctionConfig: AuctionConfig | null = null;
	let itemsRemaining = 0;
	let error: string | null = null;

	async function fetchConfig() {
		try {
			const response = await fetch('/api/admin/config');
			if (!response.ok) {
				throw new Error('Failed to fetch auction config');
			}
			const data = await response.json();
			auctionConfig = data;
			
			// Get items count
			const itemsResponse = await fetch('/api/items');
			if (!itemsResponse.ok) {
				throw new Error('Failed to fetch items');
			}
			const items = await itemsResponse.json();
			
			// Filter to only include unsold items
			const unsoldItems = items.filter((item: { sold: boolean }) => !item.sold);
			itemsRemaining = unsoldItems.length;
		} catch (e) {
			error = e instanceof Error ? e.message : 'An error occurred';
		}
	}

	onMount(fetchConfig);
</script>

<div class="admin-panel">
	<h2>Admin Panel</h2>
	
	{#if error}
		<div class="error">{error}</div>
	{/if}
	
	<AuctionControls 
		{itemsRemaining}
	/>
	
	<PriceChart />
	
	<AuctionResults />
</div>

<style>
	.admin-panel {
		padding: 1rem;
	}
	
	.error {
		color: red;
		margin: 1rem 0;
	}
</style>