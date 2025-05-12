<script lang="ts">
	import { onMount } from 'svelte';
	import type { ChartDataPoint } from '$lib/types';
	
	export let data: ChartDataPoint[] = [];
	export let title = 'Price History';
	
	let chart: any;
	let chartContainer: HTMLElement;
	
	function formatData(points: ChartDataPoint[]) {
		return points.map(point => {
			const timestamp = point.timestamp || point.time || point.x;
			const price = point.price || point.y || 0;
			
			return {
				x: typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp,
				y: price
			};
		});
	}
	
	onMount(() => {
		// Initialize chart with sample data
		const now = new Date();
		data = [
			{ timestamp: now.getTime() - 400000, price: 10 },
			{ timestamp: now.getTime() - 300000, price: 15 },
			{ timestamp: now.getTime() - 200000, price: 25 },
			{ timestamp: now.getTime() - 100000, price: 30 },
			{ timestamp: now.getTime(), price: 40 }
		];
		
		// TODO: Initialize chart library
	});
</script>

<div class="price-chart">
	<h3>{title}</h3>
	<div class="chart-container" bind:this={chartContainer}>
		<!-- Chart will be rendered here -->
	</div>
</div>

<style>
	.price-chart {
		padding: 1rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
	
	.chart-container {
		width: 100%;
		height: 300px;
		margin-top: 1rem;
	}
</style>