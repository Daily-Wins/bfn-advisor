import { OPENROUTER_API_KEY } from '$env/static/private';

const SYSTEM_PROMPT = `Du är K2K3.ai — en svensk redovisningsrådgivare.

REGLER:
1. Du har EXAKTA utdrag ur BFN:s regelverk nedan. Basera dina svar på denna text.
2. Citera exakt punktnummer (t.ex. "enligt punkt 10.27") från texten nedan.
3. Om du inte hittar en specifik punkt i texten, säg det — gissa aldrig punktnummer.
4. Belopp och gränsvärden i texten nedan är UPPDATERADE (2025). Om du minns ett annat belopp från din träning, lita på texten nedan.
5. Ange regeltyp: lagtext (tvingande), allmänt råd (bindande), kommentar (vägledande).
6. Svara koncist på svenska. Använd rubriker och punktlistor.
7. Om frågan berör jämförelse K2/K3, jämför de relevanta reglerna från båda regelverken.
8. Kontrollera särskilda regler per företagsform om frågan nämner AB, HB, enskild firma, stiftelse, ideell förening, BRF.`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function streamCompletion(
  context: string,
  messages: ChatMessage[]
): Promise<ReadableStream> {
  const systemMessage = `${SYSTEM_PROMPT}\n\n${context}`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://k2k3.ai',
      'X-Title': 'K2K3.ai',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4.6',
      messages: [
        { role: 'system', content: systemMessage },
        ...messages,
      ],
      stream: true,
      max_tokens: 2048,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${error}`);
  }

  return response.body!;
}
