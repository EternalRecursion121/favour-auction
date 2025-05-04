<script lang="ts">
	import { onMount } from 'svelte';
	import type { ChartDataPoint } from '$lib/types';
	
	export let data: Array<ChartDataPoint | { timestamp?: string; time?: string; price?: number }> = []; // Price history data from API
	
	// Processed data for the chart
	interface ProcessedChartPoint {
		timestamp: Date | string | null;
		price: number;
		x: number;
		y: number;
	}
	
	let chartData: ProcessedChartPoint[] = [];
	let chartElement: HTMLElement;
	let maxPrice = 0;
	let minPrice = 0;
	let chartWidth = 0;
	let chartHeight = 0;

	// Update the processed data whenever raw data changes
	$: {
		if (data?.length) {
			// Make sure we're working with timestamp/price format data
			const processedData = data.map(point => {
				return {
					timestamp: point.timestamp || point.time || point.x,
					price: point.price || point.y || 0,
					x: 0, // Will be calculated
					y: 0, // Will be calculated
				};
			}).sort((a, b) => {
				// Sort by timestamp
				const timeA = typeof a.timestamp === 'string' ? new Date(a.timestamp) : a.timestamp;
				const timeB = typeof b.timestamp === 'string' ? new Date(b.timestamp) : b.timestamp;
				return timeA.getTime() - timeB.getTime();
			});
			
			if (processedData.length > 0) {
				// Find min/max values for calculations
				maxPrice = Math.max(...processedData.map(p => p.price));
				minPrice = Math.min(...processedData.map(p => p.price));
				
				// Add 10% padding to the top so chart isn't flush with container
				const range = maxPrice - minPrice;
				const paddedMax = maxPrice + (range * 0.1);
				
				// Convert actual data to chart coordinates
				chartData = processedData.map((point, index) => {
					return {
						...point,
						// X is percentage across the chart based on position in the sequence
						x: (index / (processedData.length - 1 || 1)) * 100,
						// Y is percentage from bottom based on price
						y: minPrice === paddedMax 
							? 50 // If all prices are the same, center it
							: 100 - ((point.price - minPrice) / (paddedMax - minPrice) * 100)
					};
				});
			} else {
				chartData = [];
			}
		} else {
			chartData = [];
		}
	}
	
	// Calculate the SVG path for line
	function getLinePath() {
		if (chartData.length === 0) return '';
		if (chartData.length === 1) {
			// If only one point, draw a horizontal line
			const y = chartData[0].y;
			return `M0,${y} L100,${y}`;
		}
		
		// Build the SVG path
		return chartData
			.map((point, i) => {
				return i === 0 
					? `M${point.x},${point.y}` // Start point
					: `L${point.x},${point.y}`; // Line to next point
			})
			.join(' ');
	}
	
	// Format time for data points
	function formatTime(timestamp: Date | string | null): string {
		if (!timestamp) return '';
		const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}
	
	// For development/testing, provide sample data if none is given
	onMount(() => {
		if (data?.length === 0) {
			// This will only be used when no real data is provided
			const now = new Date();
			data = [
				{ timestamp: now.getTime() - 400000, price: 10 },
				{ timestamp: now.getTime() - 300000, price: 15 },
				{ timestamp: now.getTime() - 200000, price: 25 },
				{ timestamp: now.getTime() - 100000, price: 30 },
				{ timestamp: now.getTime(), price: 40 }
			];
		}
	});
	
	// Handle resize to adjust chart when container changes size
	function handleResize(node: HTMLElement) {
		const resizeObserver = new ResizeObserver(entries => {
			for (let entry of entries) {
				chartWidth = entry.contentRect.width;
				chartHeight = entry.contentRect.height;
			}
		});
		
		resizeObserver.observe(node);
		
		return {
			destroy() {
				resizeObserver.disconnect();
			}
		};
	}
</script>

<div class="card">
	<div class="card-header">
		<h2 class="text-xl font-bold" style="color: var(--accent-teal);">Price History</h2>
	</div>
	
	<div class="card-content">
		<!-- Chart container -->
		<div 
			bind:this={chartElement}
			use:handleResize
			class="rounded-lg h-64 flex items-center justify-center relative"
			style="background-color: var(--bg-tertiary);"
		>
			{#if chartData.length > 0}
				<!-- Line graph -->
				<svg class="absolute inset-0 w-full h-full p-4">
					<!-- Price axis labels -->
					<text x="10" y="20" style="fill: var(--text-secondary); font-size: 12px;">{maxPrice} pts</text>
					{#if maxPrice !== minPrice}
						<text x="10" y="95%" style="fill: var(--text-secondary); font-size: 12px;">{minPrice} pts</text>
					{/if}
					
					<!-- Grid lines (optional) -->
					<line x1="0" y1="10%" x2="100%" y2="10%" stroke="rgba(255,255,255,0.1)" stroke-dasharray="4" />
					<line x1="0" y1="50%" x2="100%" y2="50%" stroke="rgba(255,255,255,0.1)" stroke-dasharray="4" />
					<line x1="0" y1="90%" x2="100%" y2="90%" stroke="rgba(255,255,255,0.1)" stroke-dasharray="4" />
					
					<!-- The actual line chart -->
					<path 
						d={getLinePath()} 
						fill="none" 
						stroke="var(--accent-blue)" 
						stroke-width="2"
						vector-effect="non-scaling-stroke"
					/>
					
					<!-- Data points -->
					{#each chartData as point, i}
						<circle 
							cx={`${point.x}%`} 
							cy={`${point.y}%`} 
							r="4"
							fill="var(--accent-teal)"
							stroke="var(--bg-tertiary)"
							stroke-width="1.5"
						>
							<title>{formatTime(point.timestamp)}: {point.price} points</title>
						</circle>
					{/each}
				</svg>
			{:else}
				<p class="w-full text-center" style="color: var(--text-secondary);">No price data available</p>
			{/if}
		</div>
		
		<div class="mt-4 text-right">
			<p class="text-sm" style="color: var(--text-secondary);">
				Current Highest Bid: <span class="font-bold numeric" style="color: var(--accent-orange);">{data.length ? ((data[data.length - 1] as any).price || (data[data.length - 1] as any).y || 0) : 0} points</span>
			</p>
		</div>
	</div>
</div>