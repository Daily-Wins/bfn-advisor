<script lang="ts">
  import { marked } from 'marked';

  let { role, content, sources = [], question = '', streaming = false }: {
    role: 'user' | 'assistant';
    content: string;
    sources?: string[];
    question?: string;
    streaming?: boolean;
  } = $props();

  const html = $derived(
    role === 'assistant' ? marked.parse(content, { async: false }) as string : content
  );

  let vote = $state<'up' | 'down' | null>(null);
  let showFeedback = $state(false);
  let feedbackText = $state('');
  let feedbackSent = $state(false);

  async function sendFeedback(type: 'up' | 'down') {
    vote = type;
    if (type === 'down') {
      showFeedback = true;
    } else {
      await submitFeedback(type, '');
    }
  }

  async function submitFeedback(type: 'up' | 'down', text: string) {
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vote: type,
          feedback: text,
          question,
          answer: content,
          sources,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch {
      // Silently fail — feedback is best-effort
    }
    feedbackSent = true;
    showFeedback = false;
  }

  function handleFeedbackSubmit() {
    submitFeedback('down', feedbackText);
  }
</script>

<div class="flex {role === 'user' ? 'justify-end' : 'justify-start'} mb-4">
  <div class="max-w-[85%] {role === 'user'
    ? 'bg-zinc-800 rounded-2xl rounded-br-md px-4 py-3'
    : 'bg-transparent'}">
    {#if role === 'user'}
      <p class="text-zinc-100 text-[15px]">{content}</p>
    {:else}
      <div class="prose text-[15px] text-zinc-300">
        {@html html}
      </div>

      {#if sources.length > 0}
        <div class="mt-3 pt-3 border-t border-zinc-800">
          <span class="text-[10px] text-zinc-600 uppercase tracking-wide mb-1.5 block">Sökta källor</span>
          <div class="flex flex-wrap gap-2">
            {#each sources as source}
              <span class="text-[11px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 font-medium">
                {source}
              </span>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Feedback (hidden during streaming) -->
      {#if content.length > 0 && !streaming}
        <div class="mt-3 flex items-center gap-1">
          {#if feedbackSent}
            <span class="text-xs text-zinc-500">Tack för din feedback!</span>
          {:else}
            <span class="text-[10px] text-zinc-600 mr-1">Var detta hjälpsamt?</span>
            <button
              onclick={() => sendFeedback('up')}
              class="p-1.5 rounded-md hover:bg-zinc-800 transition-colors {vote === 'up' ? 'text-green-400' : 'text-zinc-500 hover:text-zinc-300'}"
              title="Bra svar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>
            </button>
            <button
              onclick={() => sendFeedback('down')}
              class="p-1.5 rounded-md hover:bg-zinc-800 transition-colors {vote === 'down' ? 'text-red-400' : 'text-zinc-500 hover:text-zinc-300'}"
              title="Fel i svaret"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/></svg>
            </button>
          {/if}
        </div>

        {#if showFeedback}
          <div class="mt-2 p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
            <p class="text-xs text-zinc-400 mb-2">Vad var fel? (valfritt)</p>
            <textarea
              bind:value={feedbackText}
              placeholder="T.ex. Fel punktnummer, fel belopp, saknar info om..."
              class="w-full bg-zinc-850 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 resize-none"
              rows="2"
            ></textarea>
            <div class="flex gap-2 mt-2">
              <button
                onclick={handleFeedbackSubmit}
                class="px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-md transition-colors"
              >
                Skicka
              </button>
              <button
                onclick={() => { showFeedback = false; feedbackSent = true; }}
                class="px-3 py-1 text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
              >
                Hoppa över
              </button>
            </div>
          </div>
        {/if}
      {/if}
    {/if}
  </div>
</div>
