<script lang="ts">
  import '../app.css';
  import { invalidateAll } from '$app/navigation';
  import AuthModal from '$lib/components/AuthModal.svelte';

  let { children, data } = $props();
  let showAuthModal = $state(false);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    await invalidateAll();
  }

  async function handleAuthSuccess() {
    showAuthModal = false;
    await invalidateAll();
  }
</script>

<svelte:head>
  <title>K2K3.ai — Svensk redovisningsrådgivning</title>
  <meta name="description" content="AI-driven redovisningsrådgivning med exakta punktreferenser till BFN:s regelverk" />
</svelte:head>

<div class="h-screen flex flex-col bg-zinc-950">
  <!-- Header -->
  <header class="flex items-center justify-between px-4 py-2 border-b border-zinc-800/60">
    <span class="text-sm font-bold text-zinc-300">
      K2K3<span class="text-violet-400">.ai</span>
    </span>
    <div class="flex items-center gap-3 text-sm">
      {#if data.user}
        <span class="text-zinc-500">{data.user.email}</span>
        <button
          onclick={handleLogout}
          class="text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          Logga ut
        </button>
      {:else}
        <button
          onclick={() => (showAuthModal = true)}
          class="text-violet-400 hover:text-violet-300 transition-colors"
        >
          Logga in
        </button>
      {/if}
    </div>
  </header>

  {@render children()}
</div>

{#if showAuthModal}
  <AuthModal
    onclose={() => (showAuthModal = false)}
    onsuccess={handleAuthSuccess}
  />
{/if}
