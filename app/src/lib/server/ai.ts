import { OPENROUTER_API_KEY } from '$env/static/private';

export const LLM_MODEL = 'anthropic/claude-sonnet-4.6';

const BASE_RULES = `REGLER:
1. Du har EXAKTA utdrag ur BFN:s regelverk nedan. Basera dina svar på denna text.
2. Citera exakt punktnummer (t.ex. "enligt punkt 10.27") från texten nedan.
3. Om du inte hittar en specifik punkt i texten, säg det — gissa aldrig punktnummer.
4. Belopp och gränsvärden i texten nedan är UPPDATERADE (2025). Om du minns ett annat belopp från din träning, lita på texten nedan.
5. Ange regeltyp: lagtext (tvingande), allmänt råd (bindande), kommentar (vägledande).
6. Svara koncist på svenska. Använd rubriker och punktlistor.
7. STRIKT KÄLLBINDNING: Citera ENDAST punktnummer som förekommer ordagrant i KONTEXT-sektionen nedan. Om ett punktnummer du vill citera inte finns i KONTEXT — cite det inte. Hitta aldrig på punktnummer, även om du "minns" dem från din träning.
8. INGET UTANFÖR KONTEXT: Nämn inte regler, belopp, nyckeltal eller principer som inte finns i KONTEXT. Om frågan berör något som inte täcks av KONTEXT, säg tydligt "Detta omfattas inte av den hämtade regeltexten — jag kan inte svara säkert."`;

const REGULATION_INSTRUCTIONS: Record<string, string> = {
  'K2': `Du svarar ENBART utifrån K2-regelverket (BFNAR 2016:10). Nämn INTE K3-regler om inte användaren uttryckligen ber om jämförelse. Kontrollera särskilda regler per företagsform.`,
  'K3': `Du svarar ENBART utifrån K3-regelverket (BFNAR 2012:1). Nämn INTE K2-regler om inte användaren uttryckligen ber om jämförelse.`,
  'K2K3': `Användaren vill JÄMFÖRA K2 och K3. Presentera skillnader och likheter tydligt. Använd en jämförande struktur med rubriker för varje regelverk.`,
  'Bokföring': `Du svarar utifrån bokföringsreglerna (BFNAR 2013:2). Fokusera på löpande bokföring, verifikationer, arkivering och tidpunkter.`,
  'Fusioner': `Du svarar utifrån fusionsreglerna (BFNAR 2020:5). Fokusera på redovisning av fusioner, fusionsdifferens och värdering.`,
  'BRF': `Du svarar utifrån reglerna för bostadsrättsföreningars årsredovisning (BFNAR 2023:1). Fokusera på nyckeltal, kassaflödesanalys och förvaltningsberättelse.`,
  'Årsbokslut': `Du svarar utifrån reglerna för årsbokslut (BFNAR 2017:3). OBS: Belopp och gränsvärden kan skilja sig från K2.`,
  'Gränsvärden': `Du svarar utifrån gränsvärdena i BFNAR 2006:11. Fokusera på storleksgränser för företag och koncerner.`,
  'K1 Enskilda': `Du svarar utifrån K1 för enskilda näringsidkare (BFNAR 2006:1). Fokusera på förenklat årsbokslut.`,
  'K1 Ideella': `Du svarar utifrån K1 för ideella föreningar (BFNAR 2010:1). Fokusera på förenklat årsbokslut.`,
};

export function buildSystemPrompt(regulation: string, context: string): string {
  const regInstruction = REGULATION_INSTRUCTIONS[regulation]
    || 'Om frågan berör jämförelse K2/K3, jämför de relevanta reglerna. Kontrollera särskilda regler per företagsform.';

  return `Du är K2K3.ai — en svensk redovisningsrådgivare.

${BASE_RULES}
${regInstruction}

${context}`;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function streamCompletion(
  context: string,
  messages: ChatMessage[],
  regulation: string = 'auto',
): Promise<ReadableStream> {
  const systemMessage = buildSystemPrompt(regulation, context);

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://k2k3.ai',
      'X-Title': 'K2K3.ai',
    },
    body: JSON.stringify({
      model: LLM_MODEL,
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
