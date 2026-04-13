import { describe, it, expect, vi } from 'vitest';

// Mock $env/static/private before importing the module under test
vi.mock('$env/static/private', () => ({
  OPENROUTER_API_KEY: 'test-key',
}));

import {
  cosineSimilarity,
  detectRegulationBoost,
  matchPunktDirect,
  reciprocalRankFusion,
  type ChapterMatch,
} from '../semantic-router';

// ─── cosineSimilarity ─────────────────────────────────────────────

describe('cosineSimilarity', () => {
  it('returns 1.0 for identical vectors', () => {
    const v = [1, 2, 3, 4, 5];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0);
  });

  it('returns 0.0 for orthogonal vectors', () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.0);
  });

  it('returns -1.0 for anti-parallel vectors', () => {
    const a = [1, 2, 3];
    const b = [-1, -2, -3];
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0);
  });

  it('computes correct value for a known dot product', () => {
    // a = [3, 4], b = [4, 3]
    // dot = 12 + 12 = 24
    // |a| = 5, |b| = 5
    // cosine = 24/25 = 0.96
    const a = [3, 4];
    const b = [4, 3];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.96);
  });

  it('handles high-dimensional vectors (1024-dim)', () => {
    const dim = 1024;
    const a = Array.from({ length: dim }, (_, i) => Math.sin(i));
    const b = Array.from({ length: dim }, (_, i) => Math.cos(i));
    const result = cosineSimilarity(a, b);
    // Just verify it returns a valid number in [-1, 1]
    expect(result).toBeGreaterThanOrEqual(-1.0);
    expect(result).toBeLessThanOrEqual(1.0);
  });
});

// ─── detectRegulationBoost ────────────────────────────────────────

describe('detectRegulationBoost', () => {
  it('returns K2 when question contains "K2"', () => {
    expect(detectRegulationBoost('Vad säger K2 om avskrivning?')).toBe('K2');
  });

  it('returns K3 when question contains "K3"', () => {
    expect(detectRegulationBoost('Hur hanteras leasing i K3?')).toBe('K3');
  });

  it('returns null when both K2 and K3 are present', () => {
    expect(detectRegulationBoost('Skillnad mellan K2 och K3?')).toBeNull();
  });

  it('returns Fusioner for "fusion"', () => {
    expect(detectRegulationBoost('Hur redovisas en fusion?')).toBe('Fusioner');
  });

  it('returns Bokföring for "bokföring"', () => {
    expect(detectRegulationBoost('Regler om bokföring?')).toBe('Bokföring');
  });

  it('returns Bokföring for "bokföringslagen"', () => {
    expect(detectRegulationBoost('Vad säger bokföringslagen?')).toBe('Bokföring');
  });

  it('returns Bokföring for "bokföring årsredovisning" (word boundary prevents match on årsredovisning)', () => {
    // \b does not match before non-ASCII å, so årsredovisning does not trigger the exclusion
    expect(detectRegulationBoost('bokföring årsredovisning')).toBe('Bokföring');
  });

  it('returns null when bokföring and plain redovisning are both present', () => {
    expect(detectRegulationBoost('bokföring och redovisning')).toBeNull();
  });

  it('returns null when no regulation keywords are present', () => {
    expect(detectRegulationBoost('Vad är avskrivning?')).toBeNull();
  });

  it('is case insensitive for K2/K3', () => {
    expect(detectRegulationBoost('vad säger k2?')).toBe('K2');
    expect(detectRegulationBoost('vad säger k3?')).toBe('K3');
  });
});

// ─── matchPunktDirect ─────────────────────────────────────────────

describe('matchPunktDirect', () => {
  it('matches "punkt 10.27" to a K2 file starting with "10"', () => {
    const result = matchPunktDirect('Vad säger punkt 10.27?');
    expect(result).not.toBeNull();
    expect(result!.regulation).toBe('K2');
    expect(result!.file).toMatch(/^10[ab]?-/);
    expect(result!.score).toBe(1.0);
  });

  it('matches "punkt 2.4" to K2 chapter 02', () => {
    const result = matchPunktDirect('punkt 2.4');
    expect(result).not.toBeNull();
    expect(result!.regulation).toBe('K2');
    expect(result!.file).toMatch(/^02-/);
  });

  it('returns null when no "punkt" is in the question', () => {
    expect(matchPunktDirect('Vad är avskrivning?')).toBeNull();
  });

  it('returns null for unknown punkt number', () => {
    expect(matchPunktDirect('punkt 99.99')).toBeNull();
  });

  it('returns a result with correct ChapterMatch shape', () => {
    const result = matchPunktDirect('punkt 5.1');
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('regulation');
    expect(result).toHaveProperty('dir');
    expect(result).toHaveProperty('file');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('label');
  });
});

// ─── reciprocalRankFusion ─────────────────────────────────────────

describe('reciprocalRankFusion', () => {
  const makeMatch = (file: string, score: number, dir = 'k2'): ChapterMatch => ({
    regulation: 'K2',
    dir,
    file,
    score,
    label: file,
  });

  it('returns items with RRF scores for a single list', () => {
    const list = [makeMatch('a.md', 0.9), makeMatch('b.md', 0.8)];
    const result = reciprocalRankFusion([list], 60);

    // rank 0 → 1/(60+0+1) = 1/61, rank 1 → 1/(60+1+1) = 1/62
    expect(result[0].score).toBeCloseTo(1 / 61);
    expect(result[1].score).toBeCloseTo(1 / 62);
  });

  it('accumulates scores when same item appears in two lists', () => {
    const list1 = [makeMatch('a.md', 0.9)];
    const list2 = [makeMatch('a.md', 0.8)];
    const result = reciprocalRankFusion([list1, list2], 60);

    // Both at rank 0 → 2 * 1/61
    expect(result).toHaveLength(1);
    expect(result[0].score).toBeCloseTo(2 / 61);
  });

  it('includes items from both lists when they differ', () => {
    const list1 = [makeMatch('a.md', 0.9)];
    const list2 = [makeMatch('b.md', 0.8)];
    const result = reciprocalRankFusion([list1, list2], 60);

    expect(result).toHaveLength(2);
    const files = result.map((r) => r.file);
    expect(files).toContain('a.md');
    expect(files).toContain('b.md');
  });

  it('deduplicates by dir/file key and keeps best section', () => {
    const match1: ChapterMatch = {
      regulation: 'K2',
      dir: 'k2',
      file: 'a.md',
      score: 0.5,
      label: 'Section A1',
      section: 'sec-1',
    };
    const match2: ChapterMatch = {
      regulation: 'K2',
      dir: 'k2',
      file: 'a.md',
      score: 0.9,
      label: 'Section A2',
      section: 'sec-2',
    };
    const result = reciprocalRankFusion([[match1], [match2]], 60);

    expect(result).toHaveLength(1);
    // The match with higher individual score (0.9) should be kept
    expect(result[0].label).toBe('Section A2');
  });

  it('returns empty result for empty lists', () => {
    expect(reciprocalRankFusion([], 60)).toEqual([]);
    expect(reciprocalRankFusion([[]], 60)).toEqual([]);
  });

  it('respects k parameter affecting scores', () => {
    const list = [makeMatch('a.md', 0.9)];

    const withK10 = reciprocalRankFusion([list], 10);
    const withK100 = reciprocalRankFusion([list], 100);

    // k=10: 1/(10+0+1) = 1/11; k=100: 1/(100+0+1) = 1/101
    expect(withK10[0].score).toBeCloseTo(1 / 11);
    expect(withK100[0].score).toBeCloseTo(1 / 101);
    expect(withK10[0].score).toBeGreaterThan(withK100[0].score);
  });

  it('sorts output by RRF score descending', () => {
    const list1 = [makeMatch('a.md', 0.9), makeMatch('b.md', 0.8), makeMatch('c.md', 0.7)];
    const list2 = [makeMatch('c.md', 0.9), makeMatch('b.md', 0.8), makeMatch('a.md', 0.7)];
    const result = reciprocalRankFusion([list1, list2], 60);

    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score);
    }
  });
});
