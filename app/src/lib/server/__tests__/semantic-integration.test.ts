import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock $env/static/private before importing the module under test
vi.mock('$env/static/private', () => ({
  OPENROUTER_API_KEY: 'test-openrouter-key-for-testing',
}));

import embeddingsData from '../embeddings.json';

interface StoredEmbedding {
  regulation: string;
  dir: string;
  file: string;
  section: string;
  label: string;
  text: string;
  embedding: number[];
}

const sections = embeddingsData as StoredEmbedding[];

// Pick known embeddings for mocking
const k2Chapter2 = sections.find(
  (s) => s.file === '02-redovisningsprinciper.md' && s.regulation === 'K2'
)!;
const k2Chapter10a = sections.find(
  (s) => s.file.startsWith('10a-') && s.regulation === 'K2'
)!;

function mockFetchWithEmbedding(embedding: number[]) {
  return vi.fn().mockImplementation(async (url: string) => {
    if (url.includes('openrouter.ai/api/v1/embeddings')) {
      return {
        ok: true,
        json: async () => ({ data: [{ embedding }] }),
      };
    }
    throw new Error('Unexpected fetch: ' + url);
  });
}

function mockFetchFailure() {
  return vi.fn().mockImplementation(async (url: string) => {
    if (url.includes('openrouter.ai/api/v1/embeddings')) {
      return {
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Server Error' }),
      };
    }
    throw new Error('Unexpected fetch: ' + url);
  });
}

describe('routeQuestionSemantic — integration tests', () => {
  let routeQuestionSemantic: typeof import('../semantic-router').routeQuestionSemantic;

  beforeEach(async () => {
    // Fresh import each time so mocks take effect
    vi.resetModules();
    const mod = await import('../semantic-router');
    routeQuestionSemantic = mod.routeQuestionSemantic;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // ─── Test 1: Punkt-direct match takes priority ──────────────────

  it('punkt-direct match appears first with score 1.0', async () => {
    // Mock fetch to return a valid embedding (shouldn't matter — punkt match is first)
    vi.stubGlobal('fetch', mockFetchWithEmbedding(k2Chapter2.embedding));

    const results = await routeQuestionSemantic('punkt 10.27');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].score).toBe(1.0);
    expect(results[0].file).toMatch(/^10/);
  });

  // ─── Test 2: Semantic + keyword fusion works ────────────────────

  it('returns relevant chapters when mocked embedding matches a known section', async () => {
    // Return the actual embedding for K2 chapter 2 (redovisningsprinciper)
    vi.stubGlobal('fetch', mockFetchWithEmbedding(k2Chapter2.embedding));

    const results = await routeQuestionSemantic('periodisering av fakturor');

    expect(results.length).toBeGreaterThan(0);
    // The mock returns the exact embedding for chapter 2, so cosine similarity
    // should be highest for that chapter
    const chapter2Match = results.find(
      (r) => r.file === '02-redovisningsprinciper.md' && r.regulation === 'K2'
    );
    expect(chapter2Match).toBeDefined();
  });

  // ─── Test 3: Regulation boost applied ───────────────────────────

  it('boosts K2 results when question contains "K2"', async () => {
    vi.stubGlobal('fetch', mockFetchWithEmbedding(k2Chapter10a.embedding));

    const results = await routeQuestionSemantic('avskrivning K2');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].regulation).toBe('K2');
  });

  it('boosts K3 results when question contains "K3"', async () => {
    // Use a K3 chapter embedding
    const k3Chapter = sections.find((s) => s.regulation === 'K3')!;
    vi.stubGlobal('fetch', mockFetchWithEmbedding(k3Chapter.embedding));

    const results = await routeQuestionSemantic('avskrivning K3');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].regulation).toBe('K3');
  });

  // ─── Test 4: Fallback on API failure ────────────────────────────

  it('falls back to keyword router when embedding API returns error', async () => {
    vi.stubGlobal('fetch', mockFetchFailure());

    const results = await routeQuestionSemantic('avskrivning');

    // Should still return results from the keyword fallback router
    expect(results.length).toBeGreaterThan(0);
    // Keyword router returns score numbers like 1000, 130, etc. — not 0-1 range
    expect(results[0].score).toBeGreaterThan(1);
  });

  it('falls back to keyword router when fetch throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network error'))
    );

    const results = await routeQuestionSemantic('varulager');

    expect(results.length).toBeGreaterThan(0);
  });

  // ─── Test 5: Results capped at 4 ───────────────────────────────

  it('returns at most 4 results', async () => {
    vi.stubGlobal('fetch', mockFetchWithEmbedding(k2Chapter2.embedding));

    const results = await routeQuestionSemantic('redovisning periodisering kostnader');

    expect(results.length).toBeLessThanOrEqual(4);
  });

  // ─── Test 6: No duplicate files ─────────────────────────────────

  it('does not return duplicate files', async () => {
    vi.stubGlobal('fetch', mockFetchWithEmbedding(k2Chapter2.embedding));

    const results = await routeQuestionSemantic('periodisering');

    const keys = results.map((r) => `${r.dir}/${r.file}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  // ─── Test 7: Result structure ───────────────────────────────────

  it('returns results with correct ChapterMatch shape', async () => {
    vi.stubGlobal('fetch', mockFetchWithEmbedding(k2Chapter2.embedding));

    const results = await routeQuestionSemantic('redovisningsprinciper');

    for (const result of results) {
      expect(result).toHaveProperty('regulation');
      expect(result).toHaveProperty('dir');
      expect(result).toHaveProperty('file');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('label');
      expect(typeof result.regulation).toBe('string');
      expect(typeof result.dir).toBe('string');
      expect(typeof result.file).toBe('string');
      expect(typeof result.score).toBe('number');
      expect(typeof result.label).toBe('string');
    }
  });

  // ─── Test 8: Punkt match + semantic results combined ────────────

  it('combines punkt match with semantic results without duplicates', async () => {
    vi.stubGlobal('fetch', mockFetchWithEmbedding(k2Chapter2.embedding));

    const results = await routeQuestionSemantic('punkt 2.1 periodisering');

    // Should have the punkt match first
    expect(results[0].score).toBe(1.0);
    expect(results[0].file).toMatch(/^02-/);

    // Remaining results should not duplicate the punkt match file
    const restFiles = results.slice(1).map((r) => `${r.dir}/${r.file}`);
    const punktFile = `${results[0].dir}/${results[0].file}`;
    expect(restFiles).not.toContain(punktFile);
  });

  // ─── Test 9: Diversity in results without regulation preference ─

  it('returns diverse results from multiple regulations when no preference specified', async () => {
    // Average multiple regulation embeddings to create a "neutral" query embedding
    const k3Chapter = sections.find((s) => s.regulation === 'K3')!;
    const avgEmbedding = k2Chapter2.embedding.map(
      (val, i) => (val + k3Chapter.embedding[i]) / 2
    );
    vi.stubGlobal('fetch', mockFetchWithEmbedding(avgEmbedding));

    const results = await routeQuestionSemantic('redovisningsprinciper grundläggande regler');

    expect(results.length).toBeGreaterThan(1);
    const regulations = new Set(results.map((r) => r.regulation));
    // With a neutral embedding and no regulation preference, the diversity
    // logic should include chapters from at least 2 regulations
    expect(regulations.size).toBeGreaterThanOrEqual(2);
  });
});
