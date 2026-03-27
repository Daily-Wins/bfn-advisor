<script lang="ts">
  import '../app.css';
  import { signIn, signOut } from '@auth/sveltekit/client';

  let { children, data } = $props();
</script>

<svelte:head>
  <title>K2K3.ai — Svensk redovisningsrådgivning med AI</title>
  <meta name="description" content="Ställ frågor om K2, K3, bokföring och BRF-redovisning. Få svar med exakta punktreferenser till BFN:s regelverk. Gratis att testa." />

  <!-- Canonical -->
  <link rel="canonical" href="https://k2k3.ai" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://k2k3.ai" />
  <meta property="og:title" content="K2K3.ai — AI-rådgivare för svensk redovisning" />
  <meta property="og:description" content="Ställ frågor om K2, K3, bokföring och BRF-redovisning. Få svar med exakta punktreferenser till BFN:s regelverk." />
  <meta property="og:image" content="https://k2k3.ai/og-image.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="K2K3.ai — AI-rådgivare för svensk redovisning" />
  <meta property="og:locale" content="sv_SE" />
  <meta property="og:site_name" content="K2K3.ai" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="K2K3.ai — AI-rådgivare för svensk redovisning" />
  <meta name="twitter:description" content="Ställ frågor om K2, K3, bokföring och BRF-redovisning. Få svar med exakta punktreferenser till BFN:s regelverk." />
  <meta name="twitter:image" content="https://k2k3.ai/og-image.png" />
  <meta name="twitter:image:alt" content="K2K3.ai — AI-rådgivare för svensk redovisning" />

  <!-- Additional SEO -->
  <meta name="robots" content="index, follow" />
  <meta name="theme-color" content="#0a0a0b" />
  <meta name="keywords" content="K2, K3, bokföring, redovisning, BFN, BFNAR, årsredovisning, årsbokslut, BRF, AI, rådgivning, Sverige" />
  <link rel="sitemap" href="/sitemap.xml" />
</svelte:head>

<div class="h-screen flex flex-col bg-zinc-950">
  <!-- Header -->
  <header class="flex items-center justify-between px-4 py-2 border-b border-zinc-800/60">
    <nav class="flex items-center gap-3" aria-label="Huvudnavigering">
      <a href="/" class="text-sm font-bold text-zinc-300" aria-label="K2K3.ai - Startsida">
        K2K3<span class="text-violet-400">.ai</span>
      </a>
      <button
        onclick={() => { window.location.href = '/'; }}
        class="text-xs text-zinc-300 hover:text-white transition-colors px-2.5 py-1 rounded-lg border border-zinc-700/60 hover:border-zinc-600 hover:bg-zinc-800/80"
        title="Starta ny chatt"
      >
        + Ny chatt
      </button>
      <a
        href="/om"
        class="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        Om
      </a>
    </nav>
    <div class="flex items-center gap-3 text-sm">
      {#if data.user}
        <span class="text-zinc-500 hidden sm:inline truncate max-w-[200px]">{data.user.email}</span>
        <button
          onclick={() => signOut()}
          class="text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          Logga ut
        </button>
      {:else}
        <button
          onclick={() => signIn('auth0')}
          class="text-violet-400 hover:text-violet-300 transition-colors"
        >
          Logga in
        </button>
      {/if}
    </div>
  </header>

  {@render children()}
</div>
