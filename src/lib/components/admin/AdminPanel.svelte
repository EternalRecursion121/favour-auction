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
	
	onMount(() => {
		// Would fetch initial data from database here
		itemsRemaining = 5; // Placeholder
	});
</script>

<div class="min-h-screen bg-gray-900 text-white p-6">
	<div class="max-w-7xl mx-auto">
		<header class="mb-8">
			<h1 class="text-3xl font-bold">Favour Auction Admin</h1>
			<p class="text-gray-400">Control and monitor the auction progress</p>
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