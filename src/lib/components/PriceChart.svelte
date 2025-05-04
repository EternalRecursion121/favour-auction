<script lang="ts">
	import type { ChartDataPoint } from '$lib/types';
	
	export let data: ChartDataPoint[] = []; // Price history data: [{x: Date, y: number}]
	
	// Processed data for the chart
	interface ProcessedChartPoint {
		timestamp: Date | string | null;
		price: number;
		x: number;
		y: number;
	}
	
	let chartData: ProcessedChartPoint[] = [];
	let maxPrice = 0;
	let minPrice = 0;

	// Update the processed data whenever raw data changes
	$: {
		if (data?.length) {
			// Make sure we're working with x/y format data
			const processedData = data.map(point => {
				return {
					timestamp: point.x || point.timestamp || null,
					price: point.y || point.price || 0,
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
	
	// Format time for tooltips
	function formatTime(timestamp: Date | string | null): string {
		if (!timestamp) return '';
		const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}
</script>

<div 
	class="rounded-lg h-40 flex items-center justify-center relative"
	style="background-color: var(--bg-tertiary);"
>
	{#if chartData.length > 0}
		<!-- Line graph -->
		<svg class="absolute inset-0 w-full h-full p-4">
			<!-- Price axis labels -->
			<text x="10" y="15" style="fill: var(--text-secondary); font-size: 11px;" class="numeric">{maxPrice}</text>
			{#if maxPrice !== minPrice}
				<text x="10" y="95%" style="fill: var(--text-secondary); font-size: 11px;" class="numeric">{minPrice}</text>
			{/if}
			
			<!-- Grid lines -->
			<line x1="0" y1="25%" x2="100%" y2="25%" stroke="rgba(255,255,255,0.05)" stroke-dasharray="3" />
			<line x1="0" y1="50%" x2="100%" y2="50%" stroke="rgba(255,255,255,0.08)" stroke-dasharray="3" />
			<line x1="0" y1="75%" x2="100%" y2="75%" stroke="rgba(255,255,255,0.05)" stroke-dasharray="3" />
			
			<!-- The actual line chart -->
			<path 
				d={getLinePath()} 
				fill="none" 
				stroke="var(--accent-blue)" 
				stroke-width="2"
				vector-effect="non-scaling-stroke"
			/>
			
			<!-- Data points for important moments (first, last and significant changes) -->
			{#each chartData as point, i}
				{#if i === 0 || i === chartData.length - 1 || (i > 0 && Math.abs(point.price - chartData[i-1].price) > (maxPrice - minPrice) * 0.2)}
					<circle 
						cx={`${point.x}%`} 
						cy={`${point.y}%`} 
						r="3"
						fill="var(--accent-teal)"
						stroke="var(--bg-tertiary)"
						stroke-width="1"
					>
						<title>{formatTime(point.timestamp)}: {point.price} points</title>
					</circle>
				{/if}
			{/each}
			
			<!-- Final price point is highlighted -->
			<circle 
				cx={`${chartData[chartData.length-1].x}%`} 
				cy={`${chartData[chartData.length-1].y}%`} 
				r="4"
				fill="var(--accent-orange)"
				stroke="var(--bg-tertiary)"
				stroke-width="1.5"
			>
				<title>Current: {chartData[chartData.length-1].price} points</title>
			</circle>
		</svg>
	{:else}
		<p class="text-sm" style="color: var(--text-secondary);">No price data available</p>
	{/if}
</div>