<script lang="ts">
	import PriceChart from '$lib/components/shared/PriceChart.svelte';
	import type { ChartDataPoint } from '$lib/types';
	
	export let data: ChartDataPoint[] = [];
	export let title = 'Price History';
	export let height = '280px';
</script>

<PriceChart {data} {title} {height} isAdmin={true} />