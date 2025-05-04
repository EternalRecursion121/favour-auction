<script lang="ts">
	import { enhance } from '$app/forms';

	export let password = '';
	export let onAuthenticate: (result: boolean) => void;

	let errorMessage = '';
	let isSubmitting = false;
</script>

<div class="flex justify-center items-center min-h-screen" style="background-color: var(--bg-primary);">
	<div class="card w-full max-w-md">
		<div class="card-header">
			<h1 class="text-2xl font-bold" style="color: var(--accent-blue);">Admin Access</h1>
		</div>
		
		<div class="card-content">
			<form method="POST" action="?/validatePassword" use:enhance={() => {
				isSubmitting = true;
				errorMessage = '';
				
				return async ({ result }) => {
					isSubmitting = false;
					
					if (result.type === 'success') {
						if (result.data?.success) {
							onAuthenticate(true);
						} else {
							errorMessage = String(result.data?.message || 'Authentication failed');
						}
					} else {
						errorMessage = 'An error occurred';
					}
				};
			}}>
				<div class="mb-4">
					<label for="password" class="block text-sm font-medium mb-2">Password</label>
					<input
						id="password"
						type="password"
						name="password"
						bind:value={password}
						class="w-full px-3 py-2"
						required
					/>
				</div>
				
				{#if errorMessage}
					<p class="text-sm mb-4" style="color: var(--accent-red);">{errorMessage}</p>
				{/if}
				
				<button
					type="submit"
					disabled={isSubmitting}
					class="w-full btn btn-blue font-mono"
				>
					{isSubmitting ? 'AUTHENTICATING...' : 'LOGIN'}
				</button>
			</form>
		</div>
	</div>
</div>