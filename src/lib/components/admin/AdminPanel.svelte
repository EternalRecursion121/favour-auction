<script lang="ts">
	import { onMount } from 'svelte';
	import type { AuctionConfig, ChartDataPoint } from '$lib/types';
	import AuctionControls from './AuctionControls.svelte';
	import PriceChart from '../PriceChart.svelte';
	import AuctionResults from './AuctionResults.svelte';

	let auctionConfig: AuctionConfig | null = null;
	let itemsRemaining = 0;
	let error: string | null = null;
	let pollInterval: ReturnType<typeof setInterval>;
	let priceHistory: ChartDataPoint[] = [];

	async function fetchConfig() {
		try {
			const response = await fetch('/api/admin/config');
			if (!response.ok) {
				throw new Error('Failed to fetch auction config');
			}
			const data = await response.json();
			auctionConfig = data;
			
			await fetchItemsCount();
			await fetchPriceHistory();
		} catch (e) {
			error = e instanceof Error ? e.message : 'An error occurred';
		}
	}

	async function fetchItemsCount() {
		try {
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

	async function fetchPriceHistory() {
		try {
			const response = await fetch('/api/auctions/price-history');
			if (!response.ok) {
				throw new Error('Failed to fetch price history');
			}
			priceHistory = await response.json();
		} catch (e) {
			error = e instanceof Error ? e.message : 'An error occurred';
		}
	}

	onMount(() => {
		fetchConfig();
		// Poll every 1 second for items count updates
		pollInterval = setInterval(async () => {
			await fetchItemsCount();
			await fetchPriceHistory();
		}, 1000);

		return () => {
			// Cleanup interval when component is destroyed
			if (pollInterval) {
				clearInterval(pollInterval);
			}
		};
	});
</script>

<div class="admin-panel">
	<h2>Admin Panel</h2>
	
	{#if error}
		<div class="error">{error}</div>
	{/if}
	
	<AuctionControls 
		{itemsRemaining}
	/>
	
	<PriceChart data={priceHistory} />
	
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