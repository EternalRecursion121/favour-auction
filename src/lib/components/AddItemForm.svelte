<script lang="ts">
    export let onAddItem: (title: string, description: string) => void;
    export let onCancel: () => void;
    export let allowNewItems: boolean;

    let newItemTitle = '';
    let newItemDescription = '';
    let isSubmitting = false;
    let submitMessage = '';
    let submitStatus: 'success' | 'error' | '' = '';

    async function handleSubmit() {
        if (!allowNewItems) return;

        try {
            isSubmitting = true;
            submitMessage = '';
            submitStatus = '';

            // Call the provided handler
            await onAddItem(newItemTitle, newItemDescription);

            // Clear the form and show success message
            submitStatus = 'success';
            submitMessage = 'Item submitted successfully!';
            newItemTitle = '';
            newItemDescription = '';

            // Clear success message after a delay
            setTimeout(() => {
                if (submitStatus === 'success') {
                    submitMessage = '';
                    submitStatus = '';
                }
            }, 3000);

        } catch (error) {
            console.error('Error adding item:', error);
            submitStatus = 'error';
            submitMessage = 'Failed to add item. Please try again.';
        } finally {
            isSubmitting = false;
        }
    }
</script>

<div class="card">
    <div class="card-header">
        <h2 class="text-lg font-bold" style="color: var(--accent-green);">
            Add New Item
        </h2>
    </div>
    <div class="card-content">
        <form on:submit|preventDefault={handleSubmit} class="space-y-4">
            <div>
                <label for="itemTitle" class="block text-sm font-medium mb-1">
                    Title
                </label>
                <input
                    type="text"
                    id="itemTitle"
                    bind:value={newItemTitle}
                    class="w-full p-2"
                    placeholder="Item title"
                    required
                    disabled={isSubmitting}
                />
            </div>
            <div>
                <label for="itemDescription" class="block text-sm font-medium mb-1">
                    Description
                </label>
                <textarea
                    id="itemDescription"
                    bind:value={newItemDescription}
                    class="w-full p-2 h-24"
                    placeholder="Describe the favour you're offering..."
                    required
                    disabled={isSubmitting}
                ></textarea>
            </div>
            <div class="flex gap-2">
                <button
                    type="submit"
                    class="flex-1 py-2 px-4 btn btn-green font-mono"
                    disabled={!allowNewItems || isSubmitting}
                >
                    {#if isSubmitting}
                        SUBMITTING...
                    {:else}
                        SUBMIT
                    {/if}
                </button>
                <button
                    type="button"
                    on:click={onCancel}
                    class="py-2 px-4 font-mono"
                    style="background-color: var(--bg-tertiary);"
                    disabled={isSubmitting}
                >
                    CANCEL
                </button>
            </div>

            {#if submitMessage}
                <div class="mt-2 p-2 rounded text-sm text-center"
                     style={`background-color: ${submitStatus === 'success' ? 'var(--accent-green)' : 'var(--accent-red)'}; color: white;`}>
                    {submitMessage}
                </div>
            {/if}
        </form>
        {#if !allowNewItems}
            <p class="text-xs mt-4 font-mono" style="color: var(--accent-red);">
                Adding new items is currently disabled by the admin.
            </p>
        {/if}
    </div>
</div> 