<script lang="ts">
  interface Regulation {
    id: string;
    label: string;
    bfnar: string;
  }

  const REGULATIONS: Regulation[] = [
    { id: 'auto', label: 'Alla regelverk', bfnar: '' },
    { id: 'K2', label: 'K2 Årsredovisning', bfnar: 'BFNAR 2016:10' },
    { id: 'K3', label: 'K3 Årsredovisning', bfnar: 'BFNAR 2012:1' },
    { id: 'K2K3', label: 'Jämför K2 / K3', bfnar: '' },
    { id: 'Årsbokslut', label: 'Årsbokslut', bfnar: 'BFNAR 2017:3' },
    { id: 'Bokföring', label: 'Bokföring', bfnar: 'BFNAR 2013:2' },
    { id: 'BRF', label: 'BRF-upplysningar', bfnar: 'BFNAR 2023:1' },
    { id: 'Fusioner', label: 'Fusioner', bfnar: 'BFNAR 2020:5' },
    { id: 'Gränsvärden', label: 'Gränsvärden', bfnar: 'BFNAR 2006:11' },
    { id: 'K1 Enskilda', label: 'K1 Enskilda', bfnar: 'BFNAR 2006:1' },
    { id: 'K1 Ideella', label: 'K1 Ideella', bfnar: 'BFNAR 2010:1' },
  ];

  let { selected = $bindable('auto') }: { selected: string } = $props();

  let isOpen = $state(false);

  let selectedRegulation = $derived(
    REGULATIONS.find((r) => r.id === selected) ?? REGULATIONS[0],
  );

  let isSpecific = $derived(selected !== 'auto');

  function toggle() {
    isOpen = !isOpen;
  }

  function select(id: string) {
    selected = id;
    isOpen = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!isOpen) return;
    if (event.key === 'Escape') {
      isOpen = false;
    }
  }

  function handleClickOutside(event: MouseEvent) {
    if (!isOpen) return;
    const target = event.target as HTMLElement;
    if (!target.closest('[data-regulation-select]')) {
      isOpen = false;
    }
  }
</script>

<svelte:document onkeydown={handleKeydown} onclick={handleClickOutside} />

<div class="relative" data-regulation-select>
  <!-- Trigger button -->
  <button
    type="button"
    onclick={toggle}
    aria-expanded={isOpen}
    aria-haspopup="listbox"
    aria-label="Välj regelverk"
    class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors duration-200
      {isSpecific
        ? 'bg-violet-600/15 border-violet-500/30 text-violet-300 hover:border-violet-500/50'
        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700/60 hover:text-zinc-300'}"
  >
    <span class="truncate max-w-[140px]">{selectedRegulation.label}</span>
    <svg
      class="w-3 h-3 shrink-0 transition-transform duration-200 {isOpen ? 'rotate-180' : ''}"
      fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  </button>

  <!-- Dropdown (opens upward) -->
  {#if isOpen}
    <div
      role="listbox"
      aria-label="Regelverk"
      class="absolute bottom-full left-0 mb-1.5 w-64 max-h-72 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl shadow-black/40 z-50"
    >
      <div class="py-1">
        {#each REGULATIONS as regulation}
          <button
            type="button"
            role="option"
            aria-selected={regulation.id === selected}
            onclick={() => select(regulation.id)}
            class="w-full text-left px-3 py-2 flex items-center justify-between gap-2 transition-colors duration-150
              {regulation.id === selected
                ? 'bg-violet-600/15 text-violet-300'
                : 'text-zinc-300 hover:bg-zinc-800/70 hover:text-zinc-100'}"
          >
            <div class="min-w-0">
              <span class="block text-xs font-medium truncate">{regulation.label}</span>
              {#if regulation.bfnar}
                <span class="block text-[10px] text-zinc-500 mt-0.5">{regulation.bfnar}</span>
              {/if}
            </div>
            {#if regulation.id === selected}
              <svg class="w-3.5 h-3.5 shrink-0 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>
