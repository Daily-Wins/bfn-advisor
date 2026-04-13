<script lang="ts">
  import Message from './Message.svelte';
  import RegulationSelect from './RegulationSelect.svelte';
  import { signIn } from '@auth/sveltekit/client';

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
  let selectedRegulation = $state('auto');
  let isStreaming = $state(false);
  let questionOffset = $state(0);
  let localQuestionsRemaining = $derived(
    questionsRemaining !== null ? Math.max(0, questionsRemaining - questionOffset) : null,
  );
  let chatContainer: HTMLDivElement;

  // Questions that a standard AI typically answers incorrectly — sourced from e2e test scenarios.
  // These showcase K2K3.ai's advantage over generic AI models.
  const QUESTION_POOL = [
    'Måste jag periodisera en faktura på 4 000 kr?',
    'Hur stort belopp får jag direktavdra för inventarier enligt K2?',
    'Får jag intäktsredovisa ett erhållet förskott på 5 000 kr direkt?',
    'Hur redovisas förvärv av tomträtt med byggnad enligt K2?',
    'Hur skrivs goodwill av om den kommer från en tilläggsköpeskilling?',
    'När får man ompröva en avskrivningsplan enligt K2?',
    'Hur lång nyttjandeperiod har förbättringsutgifter på annans fastighet?',
    'Hur skriver jag av inventarier enligt K2?',
    'Vad är skillnaden mellan K2 och K3 för leasing?',
    'Hur redovisas en fusion av ett helägt dotterbolag?',
    'Vilka nyckeltal ska en BRF redovisa?',
    'Vilka gränsvärden avgör om jag ska använda K2 eller K3?',
    'Hur länge måste jag spara bokföringen?',
  ];

  function pickRandomExamples(pool: string[], count: number): string[] {
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
  }

  const EXAMPLES = pickRandomExamples(QUESTION_POOL, 6);

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
        body: JSON.stringify({ message: msg, history, regulation: selectedRegulation }),
      });

      if (!response.ok) {
        if (response.status === 403) {
          const data = await response.json();
          if (data.error === 'limit_reached') {
            // Remove both the user message and empty assistant message
            messages = messages.slice(0, -2);
            signIn('auth0');
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

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }
</script>

<main class="flex flex-col h-full">
  <!-- Messages -->
  <div bind:this={chatContainer} class="flex-1 overflow-y-auto px-4 {messages.length === 0 ? 'py-2' : 'py-6'}">
    {#if messages.length === 0}
      <!-- Landing state -->
      <div class="flex items-center justify-center h-full overflow-hidden">
        <section class="max-w-2xl w-full px-6">

          <!-- JSON-LD Structured Data -->
          {@html `<script type="application/ld+json">${JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "K2K3.ai",
            "url": "https://k2k3.ai",
            "description": "AI-driven redovisningsrådgivning med exakta punktreferenser till BFN:s regelverk. Täcker K2, K3, bokföring, BRF, fusioner och gränsvärden.",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "SEK",
              "description": "5 gratisfrågor utan registrering"
            },
            "inLanguage": "sv",
            "creator": {
              "@type": "Organization",
              "name": "K2K3.ai"
            },
            "featureList": [
              "AI-rådgivning för K2-regelverket (BFNAR 2016:10)",
              "AI-rådgivning för K3-regelverket (BFNAR 2012:1)",
              "Bokföringsregler (BFNAR 2013:2)",
              "BRF-redovisning (BFNAR 2023:1)",
              "Fusionsredovisning (BFNAR 2020:5)",
              "Gränsvärden (BFNAR 2006:11)",
              "Årsbokslut (BFNAR 2017:3)",
              "Exakta punktreferenser till regelverk"
            ]
          })}</script>`}

          <!-- Hero -->
          <div class="relative text-center mb-8">
            <!-- Ambient glow -->
            <div class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/4 w-[500px] h-[300px] pointer-events-none" aria-hidden="true">
              <div class="absolute inset-0 bg-violet-500/[0.07] rounded-full blur-[100px]"></div>
              <div class="absolute top-1/4 left-1/4 w-1/2 h-1/2 bg-violet-400/[0.05] rounded-full blur-[60px]"></div>
            </div>

            <h1 class="relative text-[3.5rem] sm:text-[5rem] font-black tracking-[-0.05em] leading-none mb-4">
              <span class="bg-gradient-to-b from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">K2K3</span><span class="bg-gradient-to-b from-violet-300 to-violet-500 bg-clip-text text-transparent">.ai</span>
            </h1>

            <p class="relative text-lg sm:text-2xl text-zinc-200 font-semibold leading-snug max-w-xl mx-auto mb-3">
              ChatGPT hittar på punktnummer.<br />Det gör inte vi.
            </p>

            <p class="relative text-base sm:text-lg text-zinc-400 leading-relaxed max-w-lg mx-auto">
              Byggd för redovisningsekonomer som behöver
              <span class="text-zinc-200">rätt svar med rätt referens</span>
              &mdash; inte en kvalificerad gissning.
            </p>
          </div>

          <!-- What makes this different -->
          <div class="flex items-center justify-center gap-x-8 gap-y-2 flex-wrap mb-8 text-sm text-zinc-400">
            <span class="flex items-center gap-2">
              <span class="text-violet-400">&#10003;</span>
              Exakta punktreferenser
            </span>
            <span class="flex items-center gap-2">
              <span class="text-violet-400">&#10003;</span>
              7 regelverk, verifierade
            </span>
            <span class="flex items-center gap-2">
              <span class="text-violet-400">&#10003;</span>
              K2 &middot; K3 &middot; BRF &middot; Fusioner
            </span>
          </div>

          <!-- Example questions -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-5" aria-label="Exempelfrågor">
            {#each EXAMPLES as example}
              <button
                onclick={() => send(example)}
                class="group text-left px-3.5 py-3 rounded-xl border border-zinc-800/40 bg-gradient-to-b from-zinc-900/60 to-zinc-900/20 hover:from-zinc-800/80 hover:to-zinc-800/40 hover:border-zinc-700/60 transition-all duration-200 ease-out"
              >
                <span class="block text-[13px] leading-snug text-zinc-400 group-hover:text-zinc-100 transition-colors duration-200">{example}</span>
                <span class="block mt-1.5 text-[11px] text-violet-400/70 group-hover:text-violet-300 transition-colors duration-200">Fråga &rarr;</span>
              </button>
            {/each}
          </div>

          <!-- Trust + disclaimer compact -->
          <p class="text-center text-[10px] text-zinc-500 leading-relaxed max-w-lg mx-auto">
            BFNAR 2016:10 &middot; 2012:1 &middot; 2017:3 &middot; 2023:1 &middot; 2013:2 &middot; 2020:5 &middot; 2006:11
            <span class="mx-1 text-zinc-700">|</span>
            AI-genererade svar &mdash; <a href="/om" class="text-violet-400/70 hover:text-violet-300 underline underline-offset-2">läs mer</a>
          </p>

        </section>
      </div>
    {:else}
      <div class="max-w-2xl mx-auto">
        {#each messages as msg, i}
          <Message
            role={msg.role}
            content={msg.content}
            sources={msg.sources}
            question={msg.role === 'assistant' && i > 0 ? messages[i - 1]?.content || '' : ''}
            streaming={isStreaming && i === messages.length - 1 && msg.role === 'assistant'}
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
  <footer class="border-t border-zinc-800 bg-zinc-950 px-4 py-4">
    <div class="max-w-2xl mx-auto">
      {#if localQuestionsRemaining !== null}
        <p class="text-xs text-zinc-500 mb-2 text-center">
          {localQuestionsRemaining} av 5 gratisfrågor kvar
        </p>
      {/if}
      <div class="mb-2">
        <RegulationSelect bind:selected={selectedRegulation} />
      </div>
      <form class="flex gap-3" onsubmit={(e) => { e.preventDefault(); send(); }}>
        <label for="chat-input" class="sr-only">Ställ en fråga om K2, K3, bokföring</label>
        <input
          id="chat-input"
          bind:value={input}
          onkeydown={handleKeydown}
          placeholder="Ställ en fråga om K2, K3, bokföring..."
          disabled={isStreaming}
          class="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-[15px] text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 disabled:opacity-50 transition-colors"
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          class="px-5 py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold rounded-xl transition-colors text-sm"
        >
          Skicka
        </button>
      </form>
      <p class="text-[10px] text-zinc-600 text-center mt-2">
        AI-genererade svar &mdash; kan innehålla fel. Ersätter inte professionell rådgivning.
      </p>
    </div>
  </footer>
</main>
