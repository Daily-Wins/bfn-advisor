<script lang="ts">
  import Message from './Message.svelte';
  import AuthModal from './AuthModal.svelte';
  import { invalidateAll } from '$app/navigation';

  interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    sources?: string[];
  }

  let {
    user,
    questionsRemaining,
  }: {
    user: { id: string; email: string } | null;
    questionsRemaining: number | null;
  } = $props();

  let messages: ChatMessage[] = $state([]);
  let input = $state('');
  let isStreaming = $state(false);
  let showAuthModal = $state(false);
  let questionOffset = $state(0);
  let localQuestionsRemaining = $derived(
    questionsRemaining !== null ? Math.max(0, questionsRemaining - questionOffset) : null,
  );
  let chatContainer: HTMLDivElement;

  const EXAMPLES = [
    'Hur skriver jag av inventarier enligt K2?',
    'Vad är skillnaden mellan K2 och K3 för leasing?',
    'Måste jag periodisera en faktura på 4 000 kr?',
    'Hur redovisas en fusion av ett helägt dotterbolag?',
    'Vilka nyckeltal ska en BRF redovisa?',
    'Hur länge måste jag spara bokföringen?',
  ];

  function scrollToBottom() {
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  async function send(text?: string) {
    const msg = text || input.trim();
    if (!msg || isStreaming) return;

    input = '';
    messages = [...messages, { role: 'user', content: msg }];
    isStreaming = true;

    // Add empty assistant message for streaming
    messages = [...messages, { role: 'assistant', content: '', sources: [] }];
    const assistantIdx = messages.length - 1;

    try {
      const history = messages.slice(0, -2).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history }),
      });

      if (!response.ok) {
        if (response.status === 403) {
          const data = await response.json();
          if (data.error === 'limit_reached') {
            // Remove both the user message and empty assistant message
            messages = messages.slice(0, -2);
            showAuthModal = true;
            return;
          }
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              messages[assistantIdx].content += data.content;
              messages = [...messages]; // trigger reactivity
              scrollToBottom();
            }
            if (data.done && data.sources) {
              messages[assistantIdx].sources = data.sources;
              messages = [...messages];
            }
          } catch {
            // Skip
          }
        }
      }

      if (questionsRemaining !== null) {
        questionOffset++;
      }
    } catch (err) {
      messages[assistantIdx].content = `Fel: ${err instanceof Error ? err.message : 'Okänt fel'}. Kontrollera att OPENROUTER_API_KEY är satt.`;
      messages = [...messages];
    } finally {
      isStreaming = false;
      scrollToBottom();
    }
  }

  async function handleAuthSuccess() {
    showAuthModal = false;
    await invalidateAll();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }
</script>

<div class="flex flex-col h-full">
  <!-- Messages -->
  <div bind:this={chatContainer} class="flex-1 overflow-y-auto px-4 py-6">
    {#if messages.length === 0}
      <!-- Empty state with examples -->
      <div class="max-w-2xl mx-auto mt-12">
        <div class="text-center mb-10">
          <h1 class="text-4xl font-extrabold mb-2">
            K2K3<span class="text-violet-400">.ai</span>
          </h1>
          <p class="text-zinc-500 text-lg">
            Svensk redovisningsrådgivning med exakta punktreferenser
          </p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {#each EXAMPLES as example}
            <button
              onclick={() => send(example)}
              class="text-left px-4 py-3 rounded-xl border border-zinc-800 hover:border-violet-500/40 hover:bg-zinc-900 transition-colors text-sm text-zinc-400 hover:text-zinc-200"
            >
              {example}
            </button>
          {/each}
        </div>
      </div>
    {:else}
      <div class="max-w-2xl mx-auto">
        {#each messages as msg, i}
          <Message
            role={msg.role}
            content={msg.content}
            sources={msg.sources}
            question={msg.role === 'assistant' && i > 0 ? messages[i - 1]?.content || '' : ''}
          />
        {/each}
        {#if isStreaming}
          <div class="flex items-center gap-2 text-zinc-500 text-sm ml-1">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"></span>
            Analyserar regelverket...
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Input -->
  <div class="border-t border-zinc-800 bg-zinc-950 px-4 py-4">
    <div class="max-w-2xl mx-auto">
      {#if localQuestionsRemaining !== null}
        <p class="text-xs text-zinc-500 mb-2 text-center">
          {localQuestionsRemaining} av 5 gratisfrågor kvar
        </p>
      {/if}
      <div class="flex gap-3">
        <input
          bind:value={input}
          onkeydown={handleKeydown}
          placeholder="Ställ en fråga om K2, K3, bokföring..."
          disabled={isStreaming}
          class="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-[15px] text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 disabled:opacity-50 transition-colors"
        />
        <button
          onclick={() => send()}
          disabled={isStreaming || !input.trim()}
          class="px-5 py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold rounded-xl transition-colors text-sm"
        >
          Skicka
        </button>
      </div>
    </div>
  </div>
</div>

{#if showAuthModal}
  <AuthModal
    onclose={() => (showAuthModal = false)}
    onsuccess={handleAuthSuccess}
  />
{/if}
