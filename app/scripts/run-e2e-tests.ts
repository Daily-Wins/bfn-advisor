/**
 * Run E2E tests against the live K2K3.ai API.
 * npx tsx scripts/run-e2e-tests.ts [local|prod]
 */

const BASE_URL = process.argv[2] === 'prod'
  ? 'https://app-daily-wins.vercel.app'
  : 'http://localhost:5174';

/** Cookie jar for maintaining session across requests */
let sessionCookies = '';

interface TestCase {
  id: number;
  name: string;
  question: string;
  mustContain: string[];      // strings that MUST appear in response
  mustNotContain?: string[];  // strings that must NOT appear
}

const TESTS: TestCase[] = [
  {
    id: 1,
    name: 'Periodiseringsgräns 7000 kr',
    question: 'Måste jag periodisera en faktura på 4 000 kr?',
    mustContain: ['7 000', 'punkt 2.4', 'periodisera'],
    // 5 000 kr is correct for Årsbokslut — only forbid if K2 amount is wrong
    mustNotContain: ['5 000 kronor periodisera'],
  },
  {
    id: 2,
    name: 'Avskrivning inventarier K2',
    question: 'Hur skriver jag av inventarier enligt K2?',
    mustContain: ['punkt 10.2', 'avskrivning', 'nyttjandeperiod'],
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
  },
  {
    id: 5,
    name: 'Arkivering 7 år',
    question: 'Hur länge måste jag spara bokföringen?',
    mustContain: ['7 år'],
  },
  {
    id: 6,
    name: 'BRF nyckeltal',
    question: 'Vilka nyckeltal ska en BRF redovisa?',
    mustContain: ['årsavgift', 'skuldsättning'],
  },
  {
    id: 7,
    name: 'Gränsvärden K2/K3',
    question: 'Vilka gränsvärden avgör om jag ska använda K2 eller K3?',
    mustContain: ['50', 'anställda'],
  },
  {
    id: 8,
    name: 'Inventarier mindre värde — prisbasbelopp',
    question: 'Hur stort belopp får jag direktavdra för inventarier enligt K2?',
    mustContain: ['prisbasbelopp', 'punkt 10.5'],
    mustNotContain: ['25 000 kronor'],
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
  },
  {
    id: 17,
    name: 'Nedskrivning finansiell tillgång — gränsvärde',
    question: 'Måste jag skriva ned en aktiepost som tappat 15% i värde enligt K2?',
    mustContain: ['11.20'],
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

/** Initialize session by visiting the homepage to get auth cookies */
async function initSession(): Promise<void> {
  // Auth.js requires a valid CSRF token for POST requests.
  // First, hit the auth session endpoint to get a session cookie.
  const csrfResp = await fetch(BASE_URL + '/auth/csrf', { redirect: 'follow' });
  const cookies = csrfResp.headers.getSetCookie?.() || [];
  sessionCookies = cookies.map(c => c.split(';')[0]).join('; ');

  // If no cookies from csrf, try the session endpoint
  if (!sessionCookies) {
    const sessionResp = await fetch(BASE_URL + '/auth/session', { redirect: 'follow' });
    const sCookies = sessionResp.headers.getSetCookie?.() || [];
    sessionCookies = sCookies.map(c => c.split(';')[0]).join('; ');
  }
}

async function askQuestion(question: string): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sessionCookies) headers['Cookie'] = sessionCookies;

  const response = await fetch(BASE_URL + '/api/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify({ message: question }),
  });

  if (!response.ok) {
    throw new Error('HTTP ' + response.status);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
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
      } catch { /* skip */ }
    }
  }

  return fullText;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ');
}

async function runTests() {
  console.log('K2K3.ai E2E Tests');
  console.log('Target: ' + BASE_URL);
  console.log('=' .repeat(60));
  console.log('');

  // Initialize session cookies (Auth.js CSRF protection)
  await initSession();

  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const test of TESTS) {
    process.stdout.write('Test ' + test.id + ': ' + test.name + ' ... ');

    try {
      const answer = await askQuestion(test.question);
      const normalized = normalize(answer);

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
        // Show first 300 chars of answer for debugging
        console.log('  Answer: ' + answer.slice(0, 300).replace(/\n/g, ' '));
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

  if (failures.length > 0) {
    console.log('');
    console.log('Failures:');
    for (const f of failures) {
      console.log('  ' + f);
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
