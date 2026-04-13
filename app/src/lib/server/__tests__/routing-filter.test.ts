import { describe, it, expect } from 'vitest';
import { routeQuestion } from '../router';

describe('routeQuestion with regulation filter', () => {
  // ─── Filtering behavior ────────────────────────────────────────

  describe('filtering behavior', () => {
    it('returns only K2 results when filter is K2', () => {
      const results = routeQuestion('avskrivning', 'K2');
      expect(results.length).toBeGreaterThan(0);
      for (const r of results) {
        expect(r.regulation).toBe('K2');
      }
    });

    it('returns only K3 results when filter is K3', () => {
      const results = routeQuestion('komponentavskrivning', 'K3');
      expect(results.length).toBeGreaterThan(0);
      for (const r of results) {
        expect(r.regulation).toBe('K3');
      }
    });

    it('returns results from multiple regulations when no filter', () => {
      const results = routeQuestion('avsättning k3');
      const regulations = new Set(results.map((r) => r.regulation));
      expect(regulations.size).toBeGreaterThan(1);
    });

    it('returns only Fusioner results when filter is Fusioner', () => {
      const results = routeQuestion('fusion', 'Fusioner');
      expect(results.length).toBeGreaterThan(0);
      for (const r of results) {
        expect(r.regulation).toBe('Fusioner');
      }
    });

    it('returns only Bokföring results when filter is Bokföring', () => {
      const results = routeQuestion('bokföring verifikation', 'Bokföring');
      expect(results.length).toBeGreaterThan(0);
      for (const r of results) {
        expect(r.regulation).toBe('Bokföring');
      }
    });
  });

  // ─── Comparison mode (two regulations) ─────────────────────────

  describe('comparison mode', () => {
    it('returns only K2 or K3 results when filter is K2,K3', () => {
      const results = routeQuestion('avsättning k3', 'K2,K3');
      expect(results.length).toBeGreaterThan(0);
      for (const r of results) {
        expect(['K2', 'K3']).toContain(r.regulation);
      }
    });

    it('returns results from both K2 and K3 when filter is K2,K3', () => {
      const results = routeQuestion('avsättning k3', 'K2,K3');
      const regulations = new Set(results.map((r) => r.regulation));
      expect(regulations.has('K2')).toBe(true);
      expect(regulations.has('K3')).toBe(true);
    });
  });

  // ─── Punkt matching with filter ────────────────────────────────

  describe('punkt matching with filter', () => {
    it('returns punkt match when filter matches the punkt regulation', () => {
      const results = routeQuestion('punkt 10.27', 'K2');
      const punktMatch = results.find((r) => r.score === 1000);
      expect(punktMatch).toBeDefined();
      expect(punktMatch!.regulation).toBe('K2');
    });

    it('excludes punkt match when filter does not match the punkt regulation', () => {
      const results = routeQuestion('punkt 10.27', 'K3');
      const punktMatch = results.find((r) => r.score === 1000);
      expect(punktMatch).toBeUndefined();
    });
  });

  // ─── Edge cases ────────────────────────────────────────────────

  describe('edge cases', () => {
    it('treats "auto" filter same as no filter', () => {
      const autoResults = routeQuestion('avskrivning', 'auto');
      const noFilterResults = routeQuestion('avskrivning');
      expect(autoResults).toEqual(noFilterResults);
    });

    it('treats empty string filter same as no filter', () => {
      const emptyResults = routeQuestion('avskrivning', '');
      const noFilterResults = routeQuestion('avskrivning');
      expect(emptyResults).toEqual(noFilterResults);
    });

    it('returns empty array when no matches in filtered regulation', () => {
      const results = routeQuestion('xyzzy gibberish', 'K2');
      expect(results).toEqual([]);
    });

    it('returns empty array when keyword exists but not in filtered regulation', () => {
      const results = routeQuestion('avskrivning', 'Gränsvärden');
      expect(results).toEqual([]);
    });
  });
});
