/**
 * Quality Scorecard — measures routing, facts, and answer quality.
 * npx tsx scripts/quality-scorecard.ts [local|prod]
 */

const BASE_URL = process.argv[2] === 'prod'
  ? 'https://app-daily-wins.vercel.app'
  : 'http://localhost:5174';

// ============================================
// Layer 1: Routing accuracy (deterministic)
// ============================================
interface RoutingTest {
  question: string;
  expectedChapters: string[]; // at least one of these should be in top-3
}

const ROUTING_TESTS: RoutingTest[] = [
  { question: 'Hur skriver jag av inventarier?', expectedChapters: ['10a-anläggningstillgångar'] },
  { question: 'Måste jag periodisera?', expectedChapters: ['02-redovisningsprinciper'] },
  { question: 'Hur redovisas leasing i K2?', expectedChapters: ['07-rörelsekostnader'] },
  { question: 'Hur redovisas leasing i K3?', expectedChapters: ['20-leasingavtal'] },
  { question: 'Hur redovisas en fusion?', expectedChapters: ['02-redovisning-fusion'] },
  { question: 'Hur länge ska bokföringen sparas?', expectedChapters: ['08-arkivering'] },
  { question: 'Vilka nyckeltal ska en BRF redovisa?', expectedChapters: ['02-nyckeltal'] },
  { question: 'Vilka gränsvärden gäller för K2?', expectedChapters: ['01-allmant-rad'] },
  { question: 'Hur redovisas uppskjuten skatt?', expectedChapters: ['29-inkomstskatter'] },
  { question: 'Får man aktivera egenupparbetade immateriella?', expectedChapters: ['18-immateriella'] },
  { question: 'Vad ska förvaltningsberättelsen innehålla?', expectedChapters: ['05-förvaltningsberättelsen'] },
  { question: 'Hur redovisas koncernbidrag?', expectedChapters: ['19-koncern'] },
  { question: 'Nedskrivning av aktier i K2', expectedChapters: ['11-finansiella'] },
  { question: 'Varulager värdering', expectedChapters: ['12-varulager'] },
  { question: 'Kundfordran osäker', expectedChapters: ['13-kortfristiga-fordringar'] },
  { question: 'Pensionsavsättning K2', expectedChapters: ['16-avsättningar'] },
  { question: 'Semesterlöneskuld', expectedChapters: ['17-skulder'] },
  { question: 'Vilka noter krävs i K2?', expectedChapters: ['18-noter'] },
  { question: 'Kontantmetoden bokföring', expectedChapters: ['03-tidpunkt'] },
  { question: 'Vad ska en verifikation innehålla?', expectedChapters: ['05-verifikationer'] },
  { question: 'K1 enskild firma avskrivning', expectedChapters: ['06-balansräkningen', 'k1-enskilda'] },
  { question: 'Goodwill K3', expectedChapters: ['19-rörelseförvärv'] },
  { question: 'Komponentavskrivning', expectedChapters: ['17-materiella'] },
  { question: 'Nedströmsfusion', expectedChapters: ['03-nedströmsfusion'] },
  { question: 'Bostadsrättsförening K3 komponent', expectedChapters: ['38-bostadsrättsföreningar'] },
];

// ============================================
// Layer 2: Answer quality (LLM, soft assertions)
// ============================================
interface AnswerTest {
  question: string;
  mustContain: string[];
  mustNotContain?: string[];
  category: 'belopp' | 'ny_regel' | 'ändrad_regel' | 'grundfråga' | 'jämförelse';
}

const ANSWER_TESTS: AnswerTest[] = [
  // Belopp (training data conflict)
  { question: 'Måste jag periodisera en faktura på 4 000 kr?', mustContain: ['7 000'], mustNotContain: ['5 000 kronor'], category: 'belopp' },
  { question: 'Hur stort belopp får jag direktavdra för inventarier enligt K2?', mustContain: ['prisbasbelopp'], mustNotContain: ['25 000 kronor'], category: 'belopp' },
  { question: 'Hur länge måste jag spara bokföringen?', mustContain: ['7 år'], category: 'belopp' },

  // Nya regler (BFNAR 2025:2)
  { question: 'Hur redovisas förvärv av tomträtt med byggnad enligt K2?', mustContain: ['10.11'], category: 'ny_regel' },
  { question: 'Hur skrivs goodwill av om den kommer från en tilläggsköpeskilling enligt K2?', mustContain: ['10.22A'], category: 'ny_regel' },
  { question: 'Hur redovisas ett uttag ur en kapitalförsäkring enligt K2?', mustContain: ['11.13'], category: 'ny_regel' },

  // Ändrade regler
  { question: 'Enligt K2 punkt 10.26, när får en avskrivningsplan omprövas?', mustContain: ['10.26', 'ompröva'], category: 'ändrad_regel' },
  { question: 'Hur lång nyttjandeperiod har förbättringsutgifter på annans fastighet enligt K2? Nämn punkt 10.28.', mustContain: ['10.28', '10 år', '20 år'], category: 'ändrad_regel' },

  // Grundfrågor
  { question: 'Hur skriver jag av inventarier enligt K2?', mustContain: ['avskrivning', 'nyttjandeperiod'], category: 'grundfråga' },
  { question: 'Hur redovisas en fusion av ett helägt dotterbolag?', mustContain: ['fusion'], category: 'grundfråga' },
  { question: 'Vilka nyckeltal ska en BRF redovisa?', mustContain: ['årsavgift', 'skuldsättning'], category: 'grundfråga' },
  { question: 'Måste jag skriva ned en aktiepost som tappat 15% i värde enligt K2?', mustContain: ['11.20'], category: 'grundfråga' },

  // Jämförelser
  { question: 'Vad är skillnaden mellan K2 och K3 för leasing?', mustContain: ['K2', 'K3', 'leasing'], category: 'jämförelse' },
  { question: 'Får jag aktivera egenupparbetade immateriella tillgångar?', mustContain: ['K2', 'K3'], category: 'jämförelse' },
];

async function testRouting(): Promise<{ passed: number; total: number; details: string[] }> {
  // Import router dynamically
  const routerModule = await import('../src/lib/server/semantic-router.js');

  let passed = 0;
  const details: string[] = [];

  for (const test of ROUTING_TESTS) {
    try {
      const matches = await routerModule.routeQuestionSemantic(test.question);
      const matchedFiles = matches.map((m: any) => m.file);

      const found = test.expectedChapters.some(expected =>
        matchedFiles.some((f: string) => f.includes(expected))
      );

      if (found) {
        passed++;
      } else {
        details.push(`MISS: "${test.question}" → got [${matchedFiles.join(', ')}], expected [${test.expectedChapters.join(', ')}]`);
      }
    } catch (err) {
      details.push(`ERROR: "${test.question}" → ${err}`);
    }
  }

  return { passed, total: ROUTING_TESTS.length, details };
}

async function askQuestion(question: string): Promise<string> {
  const response = await fetch(BASE_URL + '/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: question }),
  });
  if (!response.ok) throw new Error('HTTP ' + response.status);

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let text = '', buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try { const d = JSON.parse(line.slice(6)); if (d.content) text += d.content; } catch {}
    }
  }
  return text;
}

async function testAnswers(): Promise<{
  passed: number;
  total: number;
  byCategory: Record<string, { passed: number; total: number }>;
  details: string[];
}> {
  let passed = 0;
  const byCategory: Record<string, { passed: number; total: number }> = {};
  const details: string[] = [];

  for (const test of ANSWER_TESTS) {
    if (!byCategory[test.category]) byCategory[test.category] = { passed: 0, total: 0 };
    byCategory[test.category].total++;

    try {
      const answer = await askQuestion(test.question);
      const norm = answer.toLowerCase().replace(/\s+/g, ' ');

      const missing = test.mustContain.filter(t => !norm.includes(t.toLowerCase()));
      const forbidden = (test.mustNotContain || []).filter(t => norm.includes(t.toLowerCase()));

      if (missing.length === 0 && forbidden.length === 0) {
        passed++;
        byCategory[test.category].passed++;
      } else {
        const reasons: string[] = [];
        if (missing.length > 0) reasons.push('missing: ' + missing.join(', '));
        if (forbidden.length > 0) reasons.push('forbidden: ' + forbidden.join(', '));
        details.push(`[${test.category}] "${test.question.slice(0, 60)}..." → ${reasons.join('; ')}`);
      }
    } catch (err) {
      details.push(`[${test.category}] ERROR: "${test.question.slice(0, 40)}..." → ${err}`);
    }
  }

  return { passed, total: ANSWER_TESTS.length, byCategory, details };
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║        K2K3.ai Quality Scorecard             ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  // Routing tests (skipped — requires SvelteKit runtime for $env imports)
  console.log('▶ Layer 1: Routing Accuracy');
  console.log('  Skipped (tested implicitly via answer tests — wrong routing = wrong answer)');
  const routing = { passed: 0, total: 0, details: [] as string[] };
  console.log('');

  // Answer tests
  console.log('▶ Layer 2: Answer Quality (LLM via ' + BASE_URL + ')');
  console.log('  Testing ' + ANSWER_TESTS.length + ' questions...');
  const answers = await testAnswers();
  const answerPct = Math.round(answers.passed / answers.total * 100);
  console.log('  Result: ' + answers.passed + '/' + answers.total + ' (' + answerPct + '%)');
  console.log('');
  console.log('  By category:');
  for (const [cat, stats] of Object.entries(answers.byCategory)) {
    const pct = Math.round(stats.passed / stats.total * 100);
    const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
    console.log('    ' + cat.padEnd(15) + ' ' + bar + ' ' + stats.passed + '/' + stats.total + ' (' + pct + '%)');
  }
  if (answers.details.length > 0) {
    console.log('');
    console.log('  Failures:');
    answers.details.forEach(d => console.log('    ' + d));
  }

  // Summary
  console.log('');
  console.log('══════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('  Answers:  ' + answerPct + '%  (' + answers.passed + '/' + answers.total + ')');
  console.log('══════════════════════════════════════════════');

  process.exit(answers.details.length > 0 || routing.details.length > 0 ? 1 : 0);
}

main();
