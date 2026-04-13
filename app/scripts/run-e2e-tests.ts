/**
 * Run E2E tests against the live K2K3.ai API.
 * npx tsx scripts/run-e2e-tests.ts [local|prod]
 */

const BASE_URL = process.argv[2] === 'prod'
  ? 'https://app-daily-wins.vercel.app'
  : 'http://localhost:5174';

interface AnswerResult {
  text: string;
  sources: string[];
}

interface TestCase {
  id: number;
  name: string;
  question: string;
  mustContain: string[];      // strings that MUST appear in response
  mustNotContain?: string[];  // strings that must NOT appear
  expectedSources?: string[]; // at least one must appear in actual sources (partial match)
}

const TESTS: TestCase[] = [
  {
    id: 1,
    name: 'Periodiseringsgräns 7000 kr',
    question: 'Måste jag periodisera en faktura på 4 000 kr?',
    mustContain: ['7 000', 'punkt 2.4', 'periodisera'],
    mustNotContain: ['5 000 kronor', '5 000 kr'],
    expectedSources: ['K2 Kap 2'],
  },
  {
    id: 2,
    name: 'Avskrivning inventarier K2',
    question: 'Hur skriver jag av inventarier enligt K2?',
    mustContain: ['punkt 10.2', 'avskrivning', 'nyttjandeperiod'],
    expectedSources: ['K2 Kap 10a'],
  },
  {
    id: 3,
    name: 'K2 vs K3 leasing',
    question: 'Vad är skillnaden mellan K2 och K3 för leasing?',
    mustContain: ['K2', 'K3', 'leasing'],
  },
  {
    id: 4,
    name: 'Fusion dotterbolag',
    question: 'Hur redovisas en fusion av ett helägt dotterbolag?',
    mustContain: ['fusion'],
    mustNotContain: ['kapitel 37'],
    expectedSources: ['Fusioner'],
  },
  {
    id: 5,
    name: 'Arkivering 7 år',
    question: 'Hur länge måste jag spara bokföringen?',
    mustContain: ['7 år'],
    expectedSources: ['Bokföring Kap 8'],
  },
  {
    id: 6,
    name: 'BRF nyckeltal',
    question: 'Vilka nyckeltal ska en BRF redovisa?',
    mustContain: ['årsavgift', 'skuldsättning'],
    expectedSources: ['BRF'],
  },
  {
    id: 7,
    name: 'Gränsvärden K2/K3',
    question: 'Vilka gränsvärden avgör om jag ska använda K2 eller K3?',
    mustContain: ['50', 'anställda'],
    expectedSources: ['Gränsvärden'],
  },
  {
    id: 8,
    name: 'Inventarier mindre värde — prisbasbelopp',
    question: 'Hur stort belopp får jag direktavdra för inventarier enligt K2?',
    mustContain: ['prisbasbelopp', 'punkt 10.5'],
    mustNotContain: ['25 000 kronor'],
    expectedSources: ['K2 Kap 10a'],
  },
  {
    id: 9,
    name: 'Förskottsgräns ny punkt 2.4A',
    question: 'Hur redovisas ett erhållet förskott på 5 000 kr enligt K2? Finns det en beloppsgräns för periodisering?',
    mustContain: ['7 000'],
  },
  {
    id: 10,
    name: 'Tomträtt med byggnad — ny punkt 10.11A',
    question: 'Hur redovisas förvärv av tomträtt med byggnad enligt K2?',
    mustContain: ['10.11'],
  },
  {
    id: 11,
    name: 'Goodwill tilläggsköpeskilling — ny punkt 10.22A',
    question: 'Hur skrivs goodwill av om den kommer från en tilläggsköpeskilling enligt K2?',
    mustContain: ['10.22A'],
  },
  {
    id: 12,
    name: 'Avskrivningsplan omprövning — ändrad 10.26',
    question: 'Enligt K2 punkt 10.26, när får en avskrivningsplan omprövas? Finns det nya regler?',
    mustContain: ['10.26', 'ompröva'],
  },
  {
    id: 13,
    name: 'Förbättringsutgift nyttjandeperiod — punkt 10.28',
    question: 'Hur lång nyttjandeperiod har förbättringsutgifter på annans fastighet enligt K2? Nämn punkt 10.28.',
    mustContain: ['10.28', '10 år', '20 år'],
  },

  // === Praktiska konsultfrågor ===
  {
    id: 14,
    name: 'Kapitalförsäkring uttag — ny punkt 11.13A',
    question: 'Hur redovisas ett uttag ur en kapitalförsäkring enligt K2?',
    mustContain: ['11.13'],
  },
  {
    id: 15,
    name: 'Byte till K2 — ingångsbalansräkning',
    question: 'Vad ska jag tänka på vid byte från K3 till K2? Behöver jag göra en ingångsbalansräkning?',
    mustContain: ['ingångsbalansräkning'],
  },
  {
    id: 16,
    name: 'Avsättning under 25 000 kr',
    question: 'Måste jag göra en avsättning för en garantiförpliktelse på 20 000 kr enligt K2?',
    mustContain: ['16.6'],
    expectedSources: ['K2 Kap 16'],
  },
  {
    id: 17,
    name: 'Nedskrivning finansiell tillgång — gränsvärde',
    question: 'Måste jag skriva ned en aktiepost som tappat 15% i värde enligt K2?',
    mustContain: ['11.20'],
    expectedSources: ['K2 Kap 11'],
  },
  {
    id: 18,
    name: 'Händelser efter balansdagen — ny punkt 2.11A',
    question: 'Hur hanteras händelser efter balansdagen enligt K2?',
    mustContain: ['2.11'],
  },
  {
    id: 19,
    name: 'Leasad bil som köps — ny punkt 10.12',
    question: 'Hur bestäms anskaffningsvärdet när man köper en bil man tidigare leasat enligt K2?',
    mustContain: ['10.12'],
  },
  {
    id: 20,
    name: 'Uppskjuten skatt K3 (ska INTE finnas i K2)',
    question: 'Hur redovisas uppskjuten skatt enligt K2?',
    mustContain: ['K2'],
    mustNotContain: ['punkt 29'],
    expectedSources: ['K2'],
  },
  {
    id: 21,
    name: 'Egenupparbetad immateriell (K2 vs K3)',
    question: 'Får jag aktivera egenupparbetade immateriella tillgångar?',
    mustContain: ['K2', 'K3'],
  },
  {
    id: 22,
    name: 'Koncernbidrag K2',
    question: 'Hur redovisas koncernbidrag i K2?',
    mustContain: ['koncernbidrag'],
  },
  {
    id: 23,
    name: 'Samfällighetsförening uppställningsform — ny punkt 4.36A',
    question: 'Finns det nya regler för samfällighetsföreningars årsredovisning enligt K2?',
    mustContain: ['samfällighetsförening'],
  },
];

async function askQuestion(question: string): Promise<AnswerResult> {
  const response = await fetch(BASE_URL + '/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: question }),
  });

  if (!response.ok) {
    throw new Error('HTTP ' + response.status);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let sources: string[] = [];
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
        if (data.content) fullText += data.content;
        if (data.done && Array.isArray(data.sources)) {
          sources = data.sources;
        }
      } catch { /* skip */ }
    }
  }

  return { text: fullText, sources };
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ');
}

async function runTests() {
  console.log('K2K3.ai E2E Tests');
  console.log('Target: ' + BASE_URL);
  console.log('=' .repeat(60));
  console.log('');

  let passed = 0;
  let failed = 0;
  const failures: string[] = [];
  let sourceChecked = 0;
  let sourceCorrect = 0;
  const sourceWarnings: string[] = [];

  for (const test of TESTS) {
    process.stdout.write('Test ' + test.id + ': ' + test.name + ' ... ');

    try {
      const answer = await askQuestion(test.question);
      const normalized = normalize(answer.text);

      const missing: string[] = [];
      for (const term of test.mustContain) {
        if (!normalized.includes(normalize(term))) {
          missing.push(term);
        }
      }

      const forbidden: string[] = [];
      if (test.mustNotContain) {
        for (const term of test.mustNotContain) {
          if (normalized.includes(normalize(term))) {
            forbidden.push(term);
          }
        }
      }

      if (missing.length === 0 && forbidden.length === 0) {
        console.log('PASS');
        passed++;
      } else {
        console.log('FAIL');
        failed++;
        if (missing.length > 0) {
          const detail = '  Missing: ' + missing.join(', ');
          console.log(detail);
          failures.push('Test ' + test.id + ': ' + detail);
        }
        if (forbidden.length > 0) {
          const detail = '  Forbidden found: ' + forbidden.join(', ');
          console.log(detail);
          failures.push('Test ' + test.id + ': ' + detail);
        }
        console.log('  Answer: ' + answer.text.slice(0, 300).replace(/\n/g, ' '));
      }

      // Source validation (warnings only, does not affect pass/fail)
      if (test.expectedSources) {
        sourceChecked++;
        const missingSource: string[] = [];
        for (const expected of test.expectedSources) {
          const found = answer.sources.some(s =>
            s.toLowerCase().includes(expected.toLowerCase())
          );
          if (!found) missingSource.push(expected);
        }
        if (missingSource.length === 0) {
          sourceCorrect++;
        } else {
          const warning = 'Test ' + test.id + ': expected [' + missingSource.join(', ') + '] but got [' + answer.sources.join(', ') + ']';
          sourceWarnings.push(warning);
          console.log('  SOURCE WARNING: ' + warning);
        }
      }
    } catch (err) {
      console.log('ERROR: ' + (err instanceof Error ? err.message : 'unknown'));
      failed++;
      failures.push('Test ' + test.id + ': ERROR');
    }
  }

  console.log('');
  console.log('=' .repeat(60));
  console.log('Results: ' + passed + '/' + TESTS.length + ' passed, ' + failed + ' failed');

  if (sourceChecked > 0) {
    const warningCount = sourceChecked - sourceCorrect;
    console.log('Source accuracy: ' + sourceCorrect + '/' + sourceChecked + ' correct routing' + (warningCount > 0 ? ' (' + warningCount + ' warnings)' : ''));
  }

  if (failures.length > 0) {
    console.log('');
    console.log('Failures:');
    for (const f of failures) {
      console.log('  ' + f);
    }
  }

  if (sourceWarnings.length > 0) {
    console.log('');
    console.log('Source warnings:');
    for (const w of sourceWarnings) {
      console.log('  ' + w);
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
