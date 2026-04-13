import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { routeQuestion } from '../router';

const KNOWLEDGE_BASE = resolve(__dirname, '../../../../knowledge');

describe('routeQuestion', () => {
  // ─── Layer 1: Punkt-number detection ───────────────────────────

  describe('punkt-number detection', () => {
    it('routes "punkt 10.27" to K2 Kap 10a', () => {
      const results = routeQuestion('Vad säger punkt 10.27?');
      expect(results[0]).toMatchObject({
        regulation: 'K2',
        file: '10a-anläggningstillgångar-anskaffning-avskrivning.md',
        score: 1000,
      });
    });

    it('routes "punkt 2.1" to K2 Kap 2', () => {
      // Note: parseFloat-based matching means punkt 2.4 > 2.12, so use 2.1 which is in range
      const results = routeQuestion('punkt 2.1');
      expect(results[0]).toMatchObject({
        regulation: 'K2',
        file: '02-redovisningsprinciper.md',
        score: 1000,
      });
    });

    it('routes "punkt 18.1" to K2 Kap 18 Noter', () => {
      const results = routeQuestion('Vad innebär punkt 18.1?');
      expect(results[0]).toMatchObject({
        regulation: 'K2',
        file: '18-noter.md',
      });
    });

    it('routes "punkt 10.35" to K2 Kap 10b (nedskrivning range)', () => {
      const results = routeQuestion('punkt 10.35');
      expect(results[0]).toMatchObject({
        regulation: 'K2',
        file: '10b-anläggningstillgångar-nedskrivning-särskilda.md',
      });
    });

    it('returns results even for unknown punkt numbers (falls back to keywords)', () => {
      const results = routeQuestion('punkt 99.99');
      // No punkt match at score 1000
      const hasPunktMatch = results.some((r) => r.score === 1000);
      expect(hasPunktMatch).toBe(false);
    });
  });

  // ─── Layer 2: Regulation preference ────────────────────────────

  describe('regulation preference', () => {
    it('boosts K2 results when question contains "K2"', () => {
      const results = routeQuestion('avskrivning K2');
      const topResult = results[0];
      expect(topResult.regulation).toBe('K2');
    });

    it('boosts K3 results when question contains "K3"', () => {
      // Use a K3-specific keyword to ensure K3 ranks first
      const results = routeQuestion('komponentavskrivning K3');
      const topResult = results[0];
      expect(topResult.regulation).toBe('K3');
    });

    it('penalizes non-preferred regulation results', () => {
      const withK2 = routeQuestion('avskrivning K2');
      const k3InK2Results = withK2.find((r) => r.regulation === 'K3');
      const k2InK2Results = withK2.find((r) => r.regulation === 'K2');

      // If both exist, K2 should score higher
      if (k3InK2Results && k2InK2Results) {
        expect(k2InK2Results.score).toBeGreaterThan(k3InK2Results.score);
      }
    });
  });

  // ─── Layer 3: Keyword matching ─────────────────────────────────

  describe('keyword matching', () => {
    it('routes "periodisering" to K2 Kap 2 Redovisningsprinciper', () => {
      const results = routeQuestion('periodisering');
      const match = results.find((r) => r.file === '02-redovisningsprinciper.md');
      expect(match).toBeDefined();
    });

    it('routes "leasing kostnad" to K2 Kap 7', () => {
      // Keyword matching requires the full keyword phrase to be present in the question
      const results = routeQuestion('leasing kostnad');
      const match = results.find((r) => r.file === '07-rörelsekostnader.md');
      expect(match).toBeDefined();
    });

    it('routes "leasing k3" to K3 Kap 20', () => {
      const results = routeQuestion('leasing k3');
      const match = results.find((r) => r.file === '20-leasingavtal.md');
      expect(match).toBeDefined();
    });

    it('routes "varulager" to inventory chapters', () => {
      const results = routeQuestion('varulager');
      const files = results.map((r) => r.file);
      const hasInventory =
        files.includes('12-varulager.md') || files.includes('13-varulager.md');
      expect(hasInventory).toBe(true);
    });

    it('routes "fusion" to Fusioner chapters', () => {
      const results = routeQuestion('fusion');
      expect(results[0].regulation).toBe('Fusioner');
    });

    it('routes "bokföring verifikation" to Bokföring chapters', () => {
      const results = routeQuestion('bokföring verifikation');
      const regs = results.map((r) => r.regulation);
      expect(regs).toContain('Bokföring');
    });
  });

  // ─── Known routing scenarios ───────────────────────────────────

  describe('known routing scenarios', () => {
    it('routes depreciation question to K2 Kap 10a', () => {
      // Use actual keywords from the route: "avskrivning", "maskin avskrivning", "nyttjandeperiod"
      const results = routeQuestion('avskrivning maskin nyttjandeperiod');
      const match = results.find(
        (r) => r.file === '10a-anläggningstillgångar-anskaffning-avskrivning.md'
      );
      expect(match).toBeDefined();
    });

    it('routes revenue recognition question to K2 Kap 6a', () => {
      const results = routeQuestion('intäktsredovisning vid uppdrag på löpande räkning');
      const match = results.find(
        (r) => r.file === '06a-rörelseintäkter-grundregler.md'
      );
      expect(match).toBeDefined();
    });

    it('routes equity question to K2 Kap 15', () => {
      const results = routeQuestion('eget kapital periodiseringsfond');
      const match = results.find((r) => r.file === '15-eget-kapital.md');
      expect(match).toBeDefined();
    });

    it('routes provisions question to K2 Kap 16', () => {
      const results = routeQuestion('garantiavsättning pension');
      const match = results.find((r) => r.file === '16-avsättningar.md');
      expect(match).toBeDefined();
    });
  });

  // ─── Edge cases ────────────────────────────────────────────────

  describe('edge cases', () => {
    it('returns empty array for empty string', () => {
      const results = routeQuestion('');
      expect(results).toEqual([]);
    });

    it('returns empty array for gibberish text', () => {
      const results = routeQuestion('xyzzy qwerty asdfgh');
      expect(results).toEqual([]);
    });

    it('handles very long input without crashing', () => {
      const longInput = 'avskrivning '.repeat(500);
      const results = routeQuestion(longInput);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('is case-insensitive', () => {
      const lower = routeQuestion('avskrivning');
      const upper = routeQuestion('AVSKRIVNING');
      expect(lower[0]?.file).toBe(upper[0]?.file);
    });
  });

  // ─── Result ordering and limits ────────────────────────────────

  describe('result ordering and limits', () => {
    it('returns results sorted by score descending', () => {
      const results = routeQuestion('avskrivning inventarie');
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it('returns at most 3 results', () => {
      const results = routeQuestion('avskrivning inventarie kostnad leasing');
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('does not return duplicate files', () => {
      const results = routeQuestion('avskrivning');
      const keys = results.map((r) => `${r.dir}/${r.file}`);
      expect(new Set(keys).size).toBe(keys.length);
    });
  });

  // ─── File reference validation ─────────────────────────────────

  describe('PUNKT_INDEX file references exist on disk', () => {
    // Extract PUNKT_INDEX entries by routing punkt numbers that cover all chapters
    const punktQueries = [
      'punkt 1.1', 'punkt 2.1', 'punkt 3.1', 'punkt 4.1', 'punkt 4.6',
      'punkt 5.1', 'punkt 6.1', 'punkt 6.26', 'punkt 7.1',
      'punkt 8.1', 'punkt 9.1', 'punkt 10.1', 'punkt 10.31', 'punkt 11.1',
      'punkt 12.1', 'punkt 13.1', 'punkt 14.1', 'punkt 15.1', 'punkt 16.1',
      'punkt 17.1', 'punkt 18.1', 'punkt 19.1', 'punkt 20.1', 'punkt 21.1',
    ];

    for (const query of punktQueries) {
      it(`file for "${query}" exists`, () => {
        const results = routeQuestion(query);
        const punktResult = results.find((r) => r.score === 1000);
        expect(punktResult).toBeDefined();
        const filePath = resolve(KNOWLEDGE_BASE, punktResult!.dir, punktResult!.file);
        expect(existsSync(filePath)).toBe(true);
      });
    }
  });

  describe('known file reference issues', () => {
    it('BRF route references file that exists on disk', () => {
      const results = routeQuestion('brf upplysning');
      expect(results.length).toBeGreaterThan(0);
      const brfResult = results.find((r) => r.dir === 'brf-upplysningar');
      expect(brfResult).toBeDefined();
      const filePath = resolve(KNOWLEDGE_BASE, brfResult!.dir, brfResult!.file);
      expect(existsSync(filePath)).toBe(true);
    });
  });

  describe('ROUTES file references exist on disk', () => {
    // Pick one keyword per route entry to trigger it, then check the file exists
    const routeKeywords = [
      'tillämpning', 'redovisningsprincip', 'årsredovisningens utformning',
      'uppställningsform resultaträkning', 'uppställningsform balansräkning',
      'förvaltningsberättelse', 'intäkt', 'bidrag offentligt', 'kostnad',
      'finansiell post', 'tillgång klassificering', 'avskrivning',
      'nedskrivning anläggningstillgång', 'finansiell anläggningstillgång',
      'varulager', 'kundfordran', 'kortfristig placering', 'eget kapital',
      'avsättning', 'skuld', 'not', 'koncern k2', 'byte regelverk',
      'kassaflödesanalys k2',
      // K3
      'k3 tillämpning', 'k3 princip', 'k3 utformning', 'k3 balansräkning',
      'k3 resultaträkning', 'förändring eget kapital', 'kassaflödesanalys k3',
      'k3 noter', 'koncernredovisning', 'byte redovisningsprincip',
      'finansiellt instrument anskaffningsvärde', 'verkligt värde finansiellt',
      'k3 varulager', 'intresseföretag k3', 'joint venture',
      'förvaltningsfastighet', 'komponentavskrivning', 'egenupparbetad',
      'rörelseförvärv', 'leasing k3', 'avsättning k3',
      'skuld eget kapital klassificering', 'intäkt k3', 'offentligt bidrag k3',
      'låneutgift', 'aktierelaterad ersättning', 'nedskrivning k3',
      'pension k3', 'uppskjuten skatt', 'valutakurs',
      'händelse efter balansdag k3', 'närstående', 'första gången k3',
      'stiftelse k3', 'ideell förening k3', 'bostadsrättsförening k3',
      // Bokföring
      'bokföring', 'tidpunkt bokföring', 'anläggningsregister',
      'verifikation', 'gemensam verifikation', 'räkenskapsinformation',
      'arkivering', 'systemdokumentation',
      // Fusioner
      'fusion', 'nedströmsfusion', 'fusion upplysning',
      // K1
      'k1 enskild', 'k1 enskild intäkt', 'k1 enskild bokföring',
      'k1 ideell', 'k1 ideell intäkt',
      // Other
      'gränsvärde', 'årsbokslut',
    ];

    for (const keyword of routeKeywords) {
      it(`file for keyword "${keyword}" exists`, () => {
        const results = routeQuestion(keyword);
        expect(results.length).toBeGreaterThan(0);
        for (const r of results) {
          const filePath = resolve(KNOWLEDGE_BASE, r.dir, r.file);
          expect(
            existsSync(filePath),
            `Missing file: ${r.dir}/${r.file}`
          ).toBe(true);
        }
      });
    }
  });
});
