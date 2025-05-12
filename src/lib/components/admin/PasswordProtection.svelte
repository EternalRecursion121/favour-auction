<script lang="ts">
	export let password = '';
	export let onAuthenticate: (result: boolean) => void;

	let errorMessage = '';
	let isSubmitting = false;

	async function handleSubmit() {
		try {
			isSubmitting = true;
			errorMessage = '';

			// Call the API directly to avoid issues with form actions
			const response = await fetch('/api/admin/auth', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ password })
			});

			const data = await response.json();

			if (response.ok && data.authenticated) {
				onAuthenticate(true);
			} else {
				errorMessage = data.message || 'Authentication failed';
			}
		} catch (error) {
			console.error('Error during authentication:', error);
			errorMessage = 'An error occurred during authentication';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="flex justify-center items-center min-h-screen" style="background-color: var(--bg-primary);">
	<div class="card w-full max-w-md">
		<div class="card-header">
			<h1 class="text-2xl font-bold" style="color: var(--accent-blue);">Admin Access</h1>
		</div>

		<div class="card-content">
			<form on:submit|preventDefault={handleSubmit}>
				<div class="mb-4">
					<label for="password" class="block text-sm font-medium mb-2">Password</label>
					<input
						id="password"
						type="password"
						bind:value={password}
						class="w-full px-3 py-2"
						required
						disabled={isSubmitting}
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