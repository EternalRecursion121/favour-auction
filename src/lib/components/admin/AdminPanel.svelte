<script lang="ts">
	import { onMount } from 'svelte';
	import type { AuctionConfig, ChartDataPoint, AuctionResult } from '$lib/types';
	import AuctionControls from './AuctionControls.svelte';
	import PriceChart from './PriceChart.svelte';
	import AuctionResults from './AuctionResults.svelte';

	let auctionConfig: AuctionConfig | null = null;
	let itemsRemaining = 0;
	let error: string | null = null;
	let pollInterval: ReturnType<typeof setInterval>;
	let priceHistory: ChartDataPoint[] = [];
	let auctionResults: AuctionResult[] = [];

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
			await fetchAuctionResults();
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

	async function fetchAuctionResults() {
		try {
			const response = await fetch('/api/auctions/results');
			if (!response.ok) {
				if (response.status === 404) {
					auctionResults = [];
					return;
				}
				throw new Error('Failed to fetch auction results');
			}
			auctionResults = await response.json();
		} catch (e) {
			error = e instanceof Error ? e.message : 'An error occurred fetching results';
		}
	}

	onMount(() => {
		fetchConfig();
		pollInterval = setInterval(async () => {
			await fetchItemsCount();
			await fetchPriceHistory();
			await fetchAuctionResults();
		}, 1000);

		return () => {
			if (pollInterval) {
				clearInterval(pollInterval);
			}
		};
	});

	async function handleReset() {
		await fetchConfig();
	}
</script>

<div class="admin-panel p-4 bg-bg-primary min-h-screen">
	<h1 class="text-2xl font-bold mb-4" style="color: var(--accent-teal);">Admin Panel</h1>

	{#if error}
		<div class="error bg-red-900 text-white p-3 rounded mb-4">{error}</div>
	{/if}

	<div class="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
		<div class="col-span-full lg:col-span-1">
			<AuctionControls {itemsRemaining} {auctionConfig} on:reset={handleReset} />
		</div>

		<div class="col-span-full lg:col-span-1">
			<div class="card mb-6">
				<div class="card-header">
					<h2 class="text-xl font-bold" style="color: var(--accent-orange);">Price History</h2>
				</div>
				<div class="card-content">
					<PriceChart data={priceHistory} />
				</div>
			</div>
		</div>

		<div class="col-span-full">
			<AuctionResults results={auctionResults} />
		</div>
	</div>
</div>

<style>
	.error {
		margin: 1rem 0;
	}

	/* Add responsive padding */
	@media (max-width: 768px) {
		.admin-panel {
			padding: 0.75rem;
		}
	}
</style>