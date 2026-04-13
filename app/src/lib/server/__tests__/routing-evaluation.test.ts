/**
 * Routing golden set evaluation test for K2K3.ai.
 *
 * Tests the keyword router's accuracy against a curated set of realistic
 * Swedish accounting questions with known correct routing targets.
 * Purpose: detect routing regressions when modifying router keywords or logic.
 *
 * Note: The keyword router matches on exact substring matches against a
 * predefined keyword list. Questions without matching keywords will return
 * empty results — the semantic router layer handles those cases in production.
 * This test focuses on questions that SHOULD match via keywords.
 */

import { describe, it, expect } from 'vitest';
import { routeQuestion } from '../router';

interface GoldenCase {
  question: string;
  expectedFiles: string[];
  expectedRegulation?: string;
  description: string;
}

// ─── K2 questions ──────────────────────────────────────────────────

const k2Cases: GoldenCase[] = [
  {
    question: 'Hur fungerar periodisering i K2?',
    expectedFiles: ['02-redovisningsprinciper.md'],
    expectedRegulation: 'K2',
    description: 'Accrual (periodisering) routes to K2 Ch 2 accounting principles',
  },
  {
    question: 'Hur skriver jag av inventarier enligt K2?',
    expectedFiles: ['10a-anläggningstillgångar-anskaffning-avskrivning.md'],
    expectedRegulation: 'K2',
    description: 'Depreciation of equipment routes to K2 Ch 10a',
  },
  {
    question: 'Hur stort belopp får jag direktavdra för inventarier av mindre värde enligt K2?',
    expectedFiles: ['10a-anläggningstillgångar-anskaffning-avskrivning.md'],
    expectedRegulation: 'K2',
    description: 'Direct deduction threshold routes to K2 Ch 10a',
  },
  {
    question: 'Hur skrivs goodwill av enligt K2?',
    expectedFiles: ['10a-anläggningstillgångar-anskaffning-avskrivning.md'],
    expectedRegulation: 'K2',
    description: 'Goodwill depreciation routes to K2 Ch 10a',
  },
  {
    question: 'Hur redovisas kapitalförsäkring enligt K2?',
    expectedFiles: ['08-finansiella-poster.md', '11-finansiella-anläggningstillgångar.md'],
    expectedRegulation: 'K2',
    description: 'Capital insurance routes to K2 Ch 8 or Ch 11',
  },
  {
    question: 'Hur fungerar garantiavsättning enligt K2?',
    expectedFiles: ['16-avsättningar.md'],
    expectedRegulation: 'K2',
    description: 'Guarantee provision routes to K2 Ch 16 provisions',
  },
  {
    question: 'Hur redovisas nedskrivning av aktie anläggningstillgång i K2?',
    expectedFiles: ['11-finansiella-anläggningstillgångar.md'],
    expectedRegulation: 'K2',
    description: 'Share impairment routes to K2 Ch 11 financial fixed assets',
  },
  {
    question: 'Hur hanteras händelse efter balansdag enligt K2?',
    expectedFiles: ['02-redovisningsprinciper.md'],
    expectedRegulation: 'K2',
    description: 'Events after balance sheet date routes to K2 Ch 2',
  },
  {
    question: 'Hur redovisas koncernbidrag i K2?',
    expectedFiles: ['19-koncern-intresseföretag.md'],
    expectedRegulation: 'K2',
    description: 'Group contributions routes to K2 Ch 19',
  },
  {
    question: 'Vilka noter krävs i en K2-årsredovisning?',
    expectedFiles: ['18-noter.md'],
    expectedRegulation: 'K2',
    description: 'K2 disclosure notes routes to K2 Ch 18',
  },
  {
    question: 'Hur redovisas en leverantörsskuld i K2?',
    expectedFiles: ['17-skulder.md'],
    expectedRegulation: 'K2',
    description: 'Trade payable routes to K2 Ch 17 liabilities',
  },
  {
    question: 'Vad ska förvaltningsberättelsen innehålla?',
    expectedFiles: ['05-förvaltningsberättelsen.md'],
    description: 'Management report contents routes to K2 Ch 5',
  },
  {
    question: 'Hur redovisas varulager enligt K2?',
    expectedFiles: ['12-varulager.md'],
    expectedRegulation: 'K2',
    description: 'Inventory recognition routes to K2 Ch 12',
  },
  {
    question: 'Hur fungerar avskrivning av byggnader i K2?',
    expectedFiles: ['10a-anläggningstillgångar-anskaffning-avskrivning.md'],
    expectedRegulation: 'K2',
    description: 'Building depreciation routes to K2 Ch 10a',
  },
  {
    question: 'Hur redovisas eget kapital och periodiseringsfond i K2?',
    expectedFiles: ['15-eget-kapital.md'],
    expectedRegulation: 'K2',
    description: 'Equity and tax allocation reserves routes to K2 Ch 15',
  },
  {
    question: 'Hur fungerar byte regelverk till K2?',
    expectedFiles: ['20-byte-till-detta-allmänna-råd.md'],
    expectedRegulation: 'K2',
    description: 'Switching regulations routes to K2 Ch 20',
  },
  {
    question: 'Vad gäller för kundfordran och osäker fordran?',
    expectedFiles: ['13-kortfristiga-fordringar.md'],
    description: 'Doubtful receivables routes to K2 Ch 13',
  },
  {
    question: 'Hur redovisas intäkt vid uppdrag på löpande räkning?',
    expectedFiles: ['06a-rörelseintäkter-grundregler.md'],
    description: 'Revenue on running account routes to K2 Ch 6a',
  },
];

// ─── K3 questions ──────────────────────────────────────────────────

const k3Cases: GoldenCase[] = [
  {
    question: 'Vad är komponentavskrivning?',
    expectedFiles: ['17-materiella-anläggningstillgångar.md'],
    expectedRegulation: 'K3',
    description: 'Component depreciation routes to K3 Ch 17',
  },
  {
    question: 'Hur fungerar successiv vinstavräkning k3?',
    expectedFiles: ['23-intäkter.md'],
    expectedRegulation: 'K3',
    description: 'Percentage of completion routes to K3 Ch 23 revenue',
  },
  {
    question: 'Hur redovisas uppskjuten skatt?',
    expectedFiles: ['29-inkomstskatter.md'],
    expectedRegulation: 'K3',
    description: 'Deferred tax routes to K3 Ch 29 income taxes',
  },
  {
    question: 'Får jag aktivera egenupparbetad immateriell tillgång k3?',
    expectedFiles: ['18-immateriella-tillgångar.md'],
    expectedRegulation: 'K3',
    description: 'Internally developed intangibles routes to K3 Ch 18',
  },
  {
    question: 'Hur fungerar leasing k3?',
    expectedFiles: ['20-leasingavtal.md'],
    expectedRegulation: 'K3',
    description: 'Leasing in K3 routes to K3 Ch 20 lease agreements',
  },
  {
    question: 'Hur redovisas ett rörelseförvärv enligt K3?',
    expectedFiles: ['19-rörelseförvärv-goodwill.md'],
    expectedRegulation: 'K3',
    description: 'Business combination routes to K3 Ch 19',
  },
  {
    question: 'Hur fungerar nedskrivning k3 och kassagenererande enhet?',
    expectedFiles: ['27-nedskrivningar.md'],
    expectedRegulation: 'K3',
    description: 'CGU impairment routes to K3 Ch 27 impairments',
  },
  {
    question: 'Hur redovisas pension k3 och förmånsbestämd plan?',
    expectedFiles: ['28-ersättningar-anställda.md'],
    expectedRegulation: 'K3',
    description: 'Pension accounting routes to K3 Ch 28',
  },
];

// ─── Cross-regulation questions ────────────────────────────────────

const crossCases: GoldenCase[] = [
  {
    question: 'Vad är skillnaden mellan leasing kostnad K2 och leasing k3?',
    expectedFiles: ['07-rörelsekostnader.md', '20-leasingavtal.md'],
    description: 'K2 vs K3 leasing should return results from both regulations',
  },
  {
    question: 'Vilka gränsvärden avgör om jag ska använda K2 eller K3?',
    expectedFiles: ['01-allmant-rad.md'],
    description: 'Size thresholds route to Gransvarden regulation',
  },
  {
    question: 'Egenupparbetad immateriell tillgång — vad gäller?',
    expectedFiles: ['18-immateriella-tillgångar.md', '10a-anläggningstillgångar-anskaffning-avskrivning.md'],
    description: 'Capitalizing internally developed intangibles returns results',
  },
];

// ─── Other regulation questions ────────────────────────────────────

const otherCases: GoldenCase[] = [
  {
    question: 'Hur redovisas en fusion av ett helägt dotterbolag?',
    expectedFiles: ['02-redovisning-fusion.md'],
    expectedRegulation: 'Fusioner',
    description: 'Subsidiary merger routes to Fusioner Ch 2',
  },
  {
    question: 'Hur länge måste jag spara bokföring enligt arkivering?',
    expectedFiles: ['08-arkivering.md'],
    expectedRegulation: 'Bokföring',
    description: 'Record retention routes to Bokforing Ch 8 archiving',
  },
  {
    question: 'Vad är en verifikation?',
    expectedFiles: ['05-verifikationer.md'],
    expectedRegulation: 'Bokföring',
    description: 'Voucher definition routes to Bokforing Ch 5',
  },
  {
    question: 'Vilka nyckeltal gäller för brf upplysning och bostadsrättsförening?',
    expectedFiles: ['04-fleraarsoversikt.md'],
    description: 'BRF key metrics routes to BRF Ch 4',
  },
  {
    question: 'Hur fungerar nedströmsfusion?',
    expectedFiles: ['03-nedströmsfusion.md'],
    expectedRegulation: 'Fusioner',
    description: 'Downstream merger routes to Fusioner Ch 3',
  },
  {
    question: 'Vilka regler gäller för löpande bokföring?',
    expectedFiles: ['02-löpande-bokföring.md'],
    expectedRegulation: 'Bokföring',
    description: 'Ongoing bookkeeping rules routes to Bokforing Ch 2',
  },
];

// ─── All cases combined ────────────────────────────────────────────

const ALL_CASES: GoldenCase[] = [...k2Cases, ...k3Cases, ...crossCases, ...otherCases];

// ─── Shared assertion ──────────────────────────────────────────────

function assertGoldenCase({ question, expectedFiles, expectedRegulation }: GoldenCase): void {
  const results = routeQuestion(question);
  const resultFiles = results.map((r) => r.file);
  const hasExpected = expectedFiles.some((f) => resultFiles.includes(f));
  expect(
    hasExpected,
    `Expected one of [${expectedFiles.join(', ')}] in results [${resultFiles.join(', ')}]`,
  ).toBe(true);
  if (expectedRegulation) {
    expect(results[0]?.regulation).toBe(expectedRegulation);
  }
}

// ─── Test suites ───────────────────────────────────────────────────

describe('Routing golden set evaluation', () => {
  describe('K2 questions', () => {
    it.each(k2Cases)('$description', assertGoldenCase);
  });

  describe('K3 questions', () => {
    it.each(k3Cases)('$description', assertGoldenCase);
  });

  describe('Cross-regulation questions', () => {
    it.each(crossCases)('$description', assertGoldenCase);
  });

  describe('Other regulation questions', () => {
    it.each(otherCases)('$description', assertGoldenCase);
  });

  // ─── Accuracy summary ─────────────────────────────────────────────

  describe('accuracy summary', () => {
    it('achieves at least 80% routing accuracy', () => {
      let correct = 0;
      const failures: string[] = [];

      for (const c of ALL_CASES) {
        const results = routeQuestion(c.question);
        const resultFiles = results.map((r) => r.file);
        if (c.expectedFiles.some((f) => resultFiles.includes(f))) {
          correct++;
        } else {
          failures.push(
            `MISS: "${c.question}" -> got [${resultFiles.join(', ')}], expected one of [${c.expectedFiles.join(', ')}]`,
          );
        }
      }

      const accuracy = correct / ALL_CASES.length;
      console.log(`\nRouting accuracy: ${correct}/${ALL_CASES.length} (${(accuracy * 100).toFixed(1)}%)`);
      if (failures.length > 0) {
        console.log('Failures:');
        for (const f of failures) {
          console.log(`  ${f}`);
        }
      }

      expect(accuracy).toBeGreaterThanOrEqual(0.8);
    });
  });
});
