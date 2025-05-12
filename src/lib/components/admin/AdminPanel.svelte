<script lang="ts">
	import { onMount } from 'svelte';
	import AuctionControls from './AuctionControls.svelte';
	import AuctionConfig from './AuctionConfig.svelte';
	import PriceChart from './PriceChart.svelte';
	import AuctionResults from './AuctionResults.svelte';

	let itemsRemaining = 0;
	let currentAuctionData = {
		type: 'english',
		isActive: false,
		currentItem: null,
		priceHistory: [],
		results: []
	};

	// Fetch the number of remaining items from the server
	async function fetchRemainingItems() {
		try {
			const response = await fetch('/api/items');
			const items = await response.json();

			// Filter to only include unsold items
			const unsoldItems = items.filter(item => !item.sold);
			itemsRemaining = unsoldItems.length;
		} catch (error) {
			console.error('Error fetching items:', error);
			itemsRemaining = 0;
		}
	}

	onMount(() => {
		fetchRemainingItems();

		// Set up a refresh interval (every 5 seconds)
		const intervalId = setInterval(fetchRemainingItems, 5000);

		// Clean up interval on component destruction
		return () => clearInterval(intervalId);
	});
</script>

<div class="min-h-screen p-6" style="background-color: var(--bg-primary);">
	<div class="max-w-7xl mx-auto">
		<header class="mb-8">
			<h1 class="text-3xl font-bold" style="color: var(--accent-blue);">Favour Auction Admin</h1>
			<p style="color: var(--text-secondary);">Control and monitor the auction progress</p>
		</header>
		
		<div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
			<!-- Left Column - Controls -->
			<div class="lg:col-span-4 space-y-6">
				<AuctionControls {itemsRemaining} />
				<AuctionConfig />
			</div>
			
			<!-- Right Column - Data & Visualizations -->
			<div class="lg:col-span-8 space-y-6">
				<PriceChart data={currentAuctionData.priceHistory} />
				<AuctionResults results={currentAuctionData.results} />
			</div>
		</div>
	</div>
</div>