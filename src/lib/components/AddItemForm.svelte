<script lang="ts">
    export let onAddItem: (title: string, description: string) => void;
    export let onCancel: () => void;
    export let allowNewItems: boolean;
    
    let newItemTitle = '';
    let newItemDescription = '';
</script>

<div class="card">
    <div class="card-header">
        <h2 class="text-lg font-bold" style="color: var(--accent-green);">
            Add New Item
        </h2>
    </div>
    <div class="card-content">
        <form on:submit|preventDefault={() => onAddItem(newItemTitle, newItemDescription)} class="space-y-4">
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
                ></textarea>
            </div>
            <div class="flex gap-2">
                <button 
                    type="submit" 
                    class="flex-1 py-2 px-4 btn btn-green font-mono"
                    disabled={!allowNewItems}
                >
                    SUBMIT
                </button>
                <button 
                    type="button" 
                    on:click={onCancel}
                    class="py-2 px-4 font-mono"
                    style="background-color: var(--bg-tertiary);"
                >
                    CANCEL
                </button>
            </div>
        </form>
        {#if !allowNewItems}
            <p class="text-xs mt-1 font-mono" style="color: var(--accent-red);">
                Adding new items is currently disabled by the admin.
            </p>
        {/if}
    </div>
</div> 