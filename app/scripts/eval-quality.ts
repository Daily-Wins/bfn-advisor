/**
 * LLM response quality evaluation for K2K3.ai.
 *
 * Sends questions to the live API, then uses a judge LLM to score
 * each response against expert ground truth on 4 dimensions.
 *
 * Usage:
 *   OPENROUTER_API_KEY=sk-... npx tsx scripts/eval-quality.ts [local|prod]
 *
 * Output: per-question scores + aggregate quality metrics.
 */

import { parseSSE } from '../src/lib/sse-parser';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  console.error('Missing OPENROUTER_API_KEY environment variable');
  process.exit(1);
}

const BASE_URL = process.argv[2] === 'prod'
  ? 'https://app-daily-wins.vercel.app'
  : 'http://localhost:5174';

const JUDGE_MODEL = 'anthropic/claude-sonnet-4';

// ─── Evaluation dataset ────────────────────────────────────────────

interface EvalCase {
  id: number;
  name: string;
  question: string;
  groundTruth: string;        // Expert reference answer (key facts)
  requiredPunkts: string[];   // Punkt numbers that MUST be cited
  forbiddenClaims: string[];  // Statements that indicate hallucination
  regulation: string;         // Regulation to send with the question
}

const EVAL_SET: EvalCase[] = [
  {
    id: 1,
    name: 'Periodiseringsgräns',
    question: 'Måste jag periodisera en faktura på 4 000 kr?',
    groundTruth: `Nej, du behöver inte periodisera. Enligt K2 punkt 2.4 behöver ett företag inte periodisera inkomster och utgifter som understiger 7 000 kronor. Eftersom fakturan är på 4 000 kr understiger den gränsen. Detta är ett allmänt råd (bindande). Gränsen gäller per faktura/post, inte totalt.`,
    requiredPunkts: ['2.4'],
    forbiddenClaims: ['5 000 kronor', 'halva prisbasbeloppet'],
    regulation: 'K2',
  },
  {
    id: 2,
    name: 'Avskrivning inventarier K2',
    question: 'Hur skriver jag av inventarier enligt K2?',
    groundTruth: `Inventarier skrivs av linjärt över nyttjandeperioden enligt K2 punkt 10.25. Nyttjandeperioden bestäms individuellt men får som schablon sättas till 5 år (punkt 10.27). Avskrivning ska påbörjas den månad tillgången tas i bruk. Inventarier av mindre värde (under ett halvt prisbasbelopp, punkt 10.5) får kostnadsföras direkt.`,
    requiredPunkts: ['10.25', '10.27'],
    forbiddenClaims: ['komponentavskrivning'],
    regulation: 'K2',
  },
  {
    id: 3,
    name: 'K2 vs K3 leasing',
    question: 'Vad är skillnaden mellan K2 och K3 för leasing?',
    groundTruth: `I K2 redovisas alla leasingavtal som operationella — leasingavgiften kostnadsförs linjärt. I K3 (kapitel 20) klassificeras leasing som finansiell eller operationell. Finansiell leasing redovisas som tillgång och skuld i balansräkningen hos leasetagaren, med avskrivning och ränta. Operationell leasing kostnadsförs linjärt även i K3.`,
    requiredPunkts: [],
    forbiddenClaims: [],
    regulation: 'K2K3',
  },
  {
    id: 4,
    name: 'Fusion helägt dotterbolag',
    question: 'Hur redovisas en fusion av ett helägt dotterbolag?',
    groundTruth: `Vid fusion av helägt dotterbolag (absorption) övertar moderbolaget alla tillgångar och skulder. Enligt BFNAR 2020:5 värderas övertagna tillgångar och skulder till koncernmässiga värden. Fusionsdifferensen (skillnad mellan andelarnas redovisade värde och nettotillgångarna) redovisas mot eget kapital. Fusionen redovisas på den dag registrering sker.`,
    requiredPunkts: [],
    forbiddenClaims: ['kapitel 37', 'K3 kapitel 37'],
    regulation: 'Fusioner',
  },
  {
    id: 5,
    name: 'Arkivering 7 år',
    question: 'Hur länge måste jag spara bokföringen?',
    groundTruth: `Räkenskapsinformation ska bevaras i 7 år efter utgången av det kalenderår då räkenskapsåret avslutades, enligt 7 kap. 2 § bokföringslagen (BFL). Informationen ska vara tillgänglig i Sverige och bevaras i varaktigt läsbar form.`,
    requiredPunkts: [],
    forbiddenClaims: ['10 år', '5 år'],
    regulation: 'Bokföring',
  },
  {
    id: 6,
    name: 'BRF nyckeltal',
    question: 'Vilka nyckeltal ska en BRF redovisa?',
    groundTruth: `Enligt BFNAR 2023:1 ska en bostadsrättsförening redovisa fem nyckeltal: (1) årsavgift per kvadratmeter, (2) skuldsättning per kvadratmeter, (3) sparande per kvadratmeter, (4) räntekänslighet, (5) energikostnad per kvadratmeter. Nyckeltalen ska redovisas i förvaltningsberättelsen som flerårsöversikt.`,
    requiredPunkts: [],
    forbiddenClaims: [],
    regulation: 'BRF',
  },
  {
    id: 7,
    name: 'Gränsvärden K2/K3',
    question: 'Vilka gränsvärden avgör om jag ska använda K2 eller K3?',
    groundTruth: `Ett företag som överskrider minst två av tre gränsvärden under vart och ett av de två senaste räkenskapsåren räknas som större och måste använda K3: (1) medelantal anställda > 50, (2) balansomslutning > 40 miljoner kr, (3) nettoomsättning > 80 miljoner kr. Mindre företag kan välja K2 eller K3.`,
    requiredPunkts: [],
    forbiddenClaims: ['25 anställda'],
    regulation: 'Gränsvärden',
  },
  {
    id: 8,
    name: 'Inventarier mindre värde',
    question: 'Hur stort belopp får jag direktavdra för inventarier enligt K2?',
    groundTruth: `Enligt K2 punkt 10.5 får inventarier av mindre värde kostnadsföras direkt om anskaffningsvärdet understiger ett halvt prisbasbelopp med tillägg för ej avdragsgill moms. Prisbasbeloppet 2025 är 58 800 kr, så gränsen är 29 400 kr. Gäller per tillgång, men tillgångar som ingår i en större investering eller har naturligt samband ska bedömas sammantaget.`,
    requiredPunkts: ['10.5'],
    forbiddenClaims: ['25 000 kronor'],
    regulation: 'K2',
  },
  {
    id: 9,
    name: 'Händelser efter balansdagen',
    question: 'Hur hanteras händelser efter balansdagen enligt K2?',
    groundTruth: `Enligt K2 punkt 2.11 ska händelser efter balansdagen som bekräftar förhållanden som förelåg på balansdagen beaktas. Punkt 2.11A anger att händelser som inte bekräftar förhållanden på balansdagen inte ska påverka resultat- eller balansräkningen men kan behöva upplysas om i förvaltningsberättelsen.`,
    requiredPunkts: ['2.11'],
    forbiddenClaims: [],
    regulation: 'K2',
  },
  {
    id: 10,
    name: 'Uppskjuten skatt i K2',
    question: 'Hur redovisas uppskjuten skatt enligt K2?',
    groundTruth: `K2 tillåter inte redovisning av uppskjuten skatt. Uppskjuten skatt är ett K3-koncept (kapitel 29). I K2 redovisas enbart aktuell skatt. Obeskattade reserver redovisas brutto i K2 (utan uppdelning i uppskjuten skatteskuld och eget kapital).`,
    requiredPunkts: [],
    forbiddenClaims: ['punkt 29', 'temporär skillnad'],
    regulation: 'K2',
  },
  {
    id: 11,
    name: 'Egenupparbetad immateriell',
    question: 'Får jag aktivera egenupparbetade immateriella tillgångar?',
    groundTruth: `I K2 är det som huvudregel inte tillåtet att aktivera egenupparbetade immateriella tillgångar — de ska kostnadsföras. I K3 (kapitel 18) kan egenupparbetade immateriella tillgångar aktiveras om utvecklingsutgifterna uppfyller sex specifika kriterier i punkt 18.12 (bl.a. teknisk genomförbarhet, avsikt att slutföra, förmåga att använda/sälja).`,
    requiredPunkts: [],
    forbiddenClaims: [],
    regulation: 'K2K3',
  },
  {
    id: 12,
    name: 'Nedskrivning finansiell tillgång',
    question: 'Måste jag skriva ned en aktiepost som tappat 15% i värde enligt K2?',
    groundTruth: `Enligt K2 punkt 11.20 behöver nedskrivning inte göras om värdenedgången understiger det lägsta av 25 000 kronor och 10 procent av eget kapital vid årets ingång. Men nedskrivning ska alltid göras om det sammanlagda värdet på alla finansiella anläggningstillgångar understiger redovisat värde med mer än dessa gränser. Grundregeln i ÅRL 4 kap 5 § är att nedskrivning ska ske om värdenedgången kan antas vara bestående, men K2 ger en förenklingsregel med fasta gränsvärden.`,
    requiredPunkts: ['11.20'],
    forbiddenClaims: [],
    regulation: 'K2',
  },
  {
    id: 13,
    name: 'Koncernbidrag K2',
    question: 'Hur redovisas koncernbidrag i K2?',
    groundTruth: `Enligt K2 kapitel 19 redovisas koncernbidrag som lämnas som en kostnad och koncernbidrag som erhålls som en intäkt. Mottagande företag redovisar det som bokslutsdisposition. Koncernbidraget ska redovisas samma räkenskapsår som det avser.`,
    requiredPunkts: [],
    forbiddenClaims: [],
    regulation: 'K2',
  },
  {
    id: 14,
    name: 'Avsättning 20 000 kr',
    question: 'Måste jag göra en avsättning för en garantiförpliktelse på 20 000 kr enligt K2?',
    groundTruth: `Enligt K2 punkt 16.6 behöver ett företag inte göra en avsättning om det sammanlagda beloppet av samtliga avsättningar inte överstiger 25 000 kr. Om den enda avsättningen är 20 000 kr (under gränsen) behöver den inte redovisas separat.`,
    requiredPunkts: ['16.6'],
    forbiddenClaims: [],
    regulation: 'K2',
  },
  {
    id: 15,
    name: 'Komponentavskrivning K3',
    question: 'Hur fungerar komponentavskrivning enligt K3?',
    groundTruth: `Enligt K3 kapitel 17 ska materiella anläggningstillgångar delas upp i komponenter med väsentligt olika nyttjandeperioder, och varje komponent ska skrivas av separat. Typiskt exempel: en byggnad delas i stomme, tak, fasad, installationer etc. Vid utbyte av en komponent utrangeras den gamla och den nya aktiveras. Nyttjandeperiod och avskrivningsmetod ska omprövas om förutsättningarna förändras.`,
    requiredPunkts: [],
    forbiddenClaims: [],
    regulation: 'K3',
  },
];

// ─── Judge prompt ──────────────────────────────────────────────────

const JUDGE_SYSTEM_PROMPT = `Du är en expert-granskare av svar från en svensk redovisningsrådgivare (K2K3.ai).

Du bedömer ett AI-genererat svar mot ett facit (expert ground truth).

Bedöm på dessa 4 dimensioner, varje poäng 1-5:

## KORREKTHET (1-5)
Är sakinnehållet korrekt? Stämmer belopp, regler och principer?
1 = Helt fel, 2 = Mestadels fel, 3 = Delvis rätt med väsentliga fel,
4 = Rätt med mindre brister, 5 = Helt korrekt

## PUNKTREFERENSER (1-5)
Citeras rätt punktnummer? Hittas alla krav-punkter?
1 = Inga/felaktiga punkter, 2 = Enstaka rätt, 3 = Hälften rätt,
4 = De flesta rätt, 5 = Alla korrekta punkter citerade

## HALLUCINATION (1-5)
Förekommer påhittade regler, felaktiga punktnummer, eller fel belopp?
1 = Allvarliga hallucinationer, 2 = Flera påhittade fakta,
3 = Enstaka tvivelaktigt påstående, 4 = Allt verifierbart,
5 = Helt fritt från hallucination

## FULLSTÄNDIGHET (1-5)
Besvaras frågan tillräckligt för en redovisningskonsult?
1 = Obesvarat, 2 = Ytligt, 3 = Grundläggande men saknar viktiga detaljer,
4 = Bra svar med de flesta relevanta aspekter, 5 = Komplett och användbart

Svara EXAKT i detta JSON-format (inga andra kommentarer):
{
  "correctness": <1-5>,
  "citations": <1-5>,
  "hallucination": <1-5>,
  "completeness": <1-5>,
  "notes": "<kort motivering, max 100 ord>"
}`;

// ─── API helpers ───────────────────────────────────────────────────

let sessionCookies = '';

async function initSession(): Promise<void> {
  try {
    const csrfResp = await fetch(BASE_URL + '/auth/csrf', { redirect: 'follow' });
    if (csrfResp.ok) {
      const cookies = csrfResp.headers.getSetCookie?.() || [];
      sessionCookies = cookies.map(c => c.split(';')[0]).join('; ');
    }
  } catch {
    // Auth not available — continue without session cookies
  }
}

async function askQuestion(question: string, regulation: string = 'auto'): Promise<{ text: string; sources: string[] }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sessionCookies && sessionCookies.length > 0) headers['Cookie'] = sessionCookies;

  const response = await fetch(BASE_URL + '/api/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify({ message: question, regulation }),
  });

  if (!response.ok) {
    throw new Error('HTTP ' + response.status);
  }

  const reader = response.body!.getReader();
  let fullText = '';
  let sources: string[] = [];

  for await (const payload of parseSSE(reader)) {
    try {
      const data = JSON.parse(payload);
      if (data.content) fullText += data.content;
      if (data.done && Array.isArray(data.sources)) sources = data.sources;
    } catch { /* skip */ }
  }

  return { text: fullText, sources };
}

interface JudgeScores {
  correctness: number;
  citations: number;
  hallucination: number;
  completeness: number;
  notes: string;
}

async function judgeAnswer(
  question: string,
  answer: string,
  evalCase: EvalCase
): Promise<JudgeScores> {
  const userMessage = [
    `## Fråga\n${question}`,
    `## AI-svar att bedöma\n${answer}`,
    `## Facit (expert ground truth)\n${evalCase.groundTruth}`,
    evalCase.requiredPunkts.length > 0
      ? `## Krav-punkter som MÅSTE citeras\n${evalCase.requiredPunkts.join(', ')}`
      : '',
    evalCase.forbiddenClaims.length > 0
      ? `## Förbjudna påståenden (hallucination-indikatorer)\n${evalCase.forbiddenClaims.join(', ')}`
      : '',
  ].filter(Boolean).join('\n\n');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://k2k3.ai',
      'X-Title': 'K2K3.ai Eval',
    },
    body: JSON.stringify({
      model: JUDGE_MODEL,
      messages: [
        { role: 'system', content: JUDGE_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 512,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    throw new Error(`Judge API error: ${response.status}`);
  }

  const data = await response.json() as {
    choices: { message: { content: string } }[];
  };
  const raw = data.choices[0].message.content;

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Judge did not return valid JSON: ' + raw.slice(0, 200));
  }

  return JSON.parse(jsonMatch[0]) as JudgeScores;
}

// ─── Main ──────────────────────────────────────────────────────────

async function runEval() {
  console.log('K2K3.ai Quality Evaluation');
  console.log('Target: ' + BASE_URL);
  console.log('Judge: ' + JUDGE_MODEL);
  console.log('='.repeat(70));
  console.log('');

  await initSession();

  const results: {
    id: number;
    name: string;
    scores: JudgeScores;
    sources: string[];
  }[] = [];
  const errors: string[] = [];

  for (const evalCase of EVAL_SET) {
    process.stdout.write(`[${evalCase.id}/${EVAL_SET.length}] ${evalCase.name} [${evalCase.regulation}] ... `);

    try {
      const answer = await askQuestion(evalCase.question, evalCase.regulation);
      const scores = await judgeAnswer(evalCase.question, answer.text, evalCase);

      const avg = (scores.correctness + scores.citations + scores.hallucination + scores.completeness) / 4;
      const status = avg >= 4 ? 'GOOD' : avg >= 3 ? 'OK' : 'POOR';

      console.log(
        `${status} (C:${scores.correctness} P:${scores.citations} H:${scores.hallucination} F:${scores.completeness} = ${avg.toFixed(1)})`
      );

      if (scores.notes) {
        console.log(`  ${scores.notes}`);
      }

      results.push({ id: evalCase.id, name: evalCase.name, scores, sources: answer.sources });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      console.log(`ERROR: ${msg}`);
      errors.push(`${evalCase.id}: ${msg}`);
    }
  }

  // ─── Summary ───────────────────────────────────────────────────

  console.log('');
  console.log('='.repeat(70));
  console.log('QUALITY SUMMARY');
  console.log('='.repeat(70));

  if (results.length === 0) {
    console.log('No results to summarize.');
    process.exit(1);
  }

  const avg = (dim: keyof Omit<JudgeScores, 'notes'>) =>
    results.reduce((sum, r) => sum + r.scores[dim], 0) / results.length;

  const correctness = avg('correctness');
  const citations = avg('citations');
  const hallucination = avg('hallucination');
  const completeness = avg('completeness');
  const overall = (correctness + citations + hallucination + completeness) / 4;

  console.log('');
  console.log(`  Korrekthet:       ${correctness.toFixed(2)} / 5`);
  console.log(`  Punktreferenser:  ${citations.toFixed(2)} / 5`);
  console.log(`  Hallucination:    ${hallucination.toFixed(2)} / 5`);
  console.log(`  Fullständighet:   ${completeness.toFixed(2)} / 5`);
  console.log(`  ─────────────────────────`);
  console.log(`  TOTALT:           ${overall.toFixed(2)} / 5`);
  console.log('');

  // Flagged answers (any dimension < 3)
  const flagged = results.filter(r =>
    r.scores.correctness < 3 ||
    r.scores.citations < 3 ||
    r.scores.hallucination < 3 ||
    r.scores.completeness < 3
  );

  if (flagged.length > 0) {
    console.log(`FLAGGED (${flagged.length} answers with score < 3 on any dimension):`);
    for (const f of flagged) {
      const dims: string[] = [];
      if (f.scores.correctness < 3) dims.push(`correctness=${f.scores.correctness}`);
      if (f.scores.citations < 3) dims.push(`citations=${f.scores.citations}`);
      if (f.scores.hallucination < 3) dims.push(`hallucination=${f.scores.hallucination}`);
      if (f.scores.completeness < 3) dims.push(`completeness=${f.scores.completeness}`);
      console.log(`  #${f.id} ${f.name}: ${dims.join(', ')}`);
    }
    console.log('');
  }

  if (errors.length > 0) {
    console.log(`ERRORS (${errors.length}):`);
    for (const e of errors) {
      console.log(`  ${e}`);
    }
  }

  console.log(`\nEvaluated: ${results.length}/${EVAL_SET.length}`);

  // Exit with failure if overall quality is below threshold
  if (overall < 3.5) {
    console.log('\nFAIL: Overall quality below 3.5 threshold');
    process.exit(1);
  }

  console.log('\nPASS: Quality meets threshold (>= 3.5)');
}

runEval();
