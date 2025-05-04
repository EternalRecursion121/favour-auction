<script lang="ts">
	import { enhance } from '$app/forms';

	export let password = '';
	export let onAuthenticate: (result: boolean) => void;

	let errorMessage = '';
	let isSubmitting = false;
</script>

<div class="flex justify-center items-center min-h-screen bg-gray-900">
	<div class="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md">
		<h1 class="text-2xl font-bold text-white mb-6 text-center">Admin Access</h1>
		
		<form method="POST" action="?/validatePassword" use:enhance={() => {
			isSubmitting = true;
			errorMessage = '';
			
			return async ({ result }) => {
				isSubmitting = false;
				
				if (result.type === 'success') {
					if (result.data?.success) {
						onAuthenticate(true);
					} else {
						errorMessage = result.data?.message || 'Authentication failed';
					}
				} else {
					errorMessage = 'An error occurred';
				}
			};
		}}>
			<div class="mb-4">
				<label for="password" class="block text-sm font-medium text-gray-300 mb-2">Password</label>
				<input
					id="password"
					type="password"
					name="password"
					bind:value={password}
					class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
					required
				/>
			</div>
			
			{#if errorMessage}
				<p class="text-red-400 text-sm mb-4">{errorMessage}</p>
			{/if}
			
			<button
				type="submit"
				disabled={isSubmitting}
				class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
			>
				{isSubmitting ? 'Authenticating...' : 'Login'}
			</button>
		</form>
	</div>
</div>