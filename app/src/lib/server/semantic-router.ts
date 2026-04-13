/**
 * Semantic router using pre-computed section-level embeddings.
 *
 * Computes query embedding at runtime via OpenRouter bge-m3, then
 * cosine similarity against pre-computed section embeddings.
 * Results are fused with keyword router via Reciprocal Rank Fusion (RRF).
 *
 * Latency: ~200-400ms for OpenRouter embedding call (keyword router runs in parallel for free)
 */

import { OPENROUTER_API_KEY } from '$env/static/private';
import { routeQuestion } from './router';
import embeddingsData from './embeddings.json';

export interface ChapterMatch {
  regulation: string;
  dir: string;
  file: string;
  score: number;
  label: string;
  section?: string;
}

interface StoredEmbedding {
  regulation: string;
  dir: string;
  file: string;
  section: string;
  label: string;
  text: string;
  embedding: number[];
}

const sections: StoredEmbedding[] = embeddingsData as StoredEmbedding[];

/** Compute cosine similarity between two vectors */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Get query embedding from OpenRouter bge-m3 */
async function getQueryEmbedding(query: string): Promise<number[]> {
  const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://k2k3.ai',
      'X-Title': 'K2K3.ai',
    },
    body: JSON.stringify({
      model: 'baai/bge-m3',
      input: [query],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter embedding error: ${response.status}`);
  }

  const data = await response.json() as { data: { embedding: number[] }[] };
  return data.data[0].embedding;
}

/** Detect regulation preference for boosting */
function detectRegulationBoost(question: string): string | null {
  const q = question.toLowerCase();
  if (/\bk2\b/.test(q) && !/\bk3\b/.test(q)) return 'K2';
  if (/\bk3\b/.test(q) && !/\bk2\b/.test(q)) return 'K3';
  if (/\bfusion\b/.test(q)) return 'Fusioner';
  if (/\bbokföring(slagen|snämnden)?\b/.test(q) && !/\b(års)?redovisning/.test(q)) return 'Bokföring';
  return null;
}

/** Direct punkt-number lookup */
function matchPunktDirect(question: string): ChapterMatch | null {
  const match = question.match(/punkt\s+(\d+)\.(\d+)/i);
  if (!match) return null;

  const chapterNum = parseInt(match[1]);
  const padded = chapterNum.toString().padStart(2, '0');

  // Find any section from the matching chapter file
  const sectionMatch = sections.find(s =>
    s.regulation === 'K2' && (
      s.file.startsWith(`${padded}-`) ||
      s.file.startsWith(`${chapterNum}a-`) ||
      s.file.startsWith(`${chapterNum}b-`)
    )
  );

  if (sectionMatch) {
    return {
      regulation: sectionMatch.regulation,
      dir: sectionMatch.dir,
      file: sectionMatch.file,
      score: 1.0,
      label: sectionMatch.label,
    };
  }
  return null;
}

/** Get semantic search results (section-level) */
async function getSemanticResults(question: string): Promise<ChapterMatch[]> {
  const queryEmbedding = await getQueryEmbedding(question);
  const regBoost = detectRegulationBoost(question);

  const scored = sections.map(s => {
    let score = cosineSimilarity(queryEmbedding, s.embedding);

    if (regBoost && s.regulation.startsWith(regBoost)) {
      score *= 1.3;
    }
    if (regBoost && !s.regulation.startsWith(regBoost)) {
      score *= 0.7;
    }

    return {
      regulation: s.regulation,
      dir: s.dir,
      file: s.file,
      section: s.section,
      label: s.label,
      score,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 20); // Top 20 for RRF input
}

/**
 * Reciprocal Rank Fusion: combines ranked lists from multiple retrievers.
 * RRF_score(d) = Σ 1/(k + rank_i(d))
 */
function reciprocalRankFusion(
  lists: ChapterMatch[][],
  k = 60,
): ChapterMatch[] {
  const scoreMap = new Map<string, { score: number; match: ChapterMatch }>();

  for (const list of lists) {
    for (let rank = 0; rank < list.length; rank++) {
      const match = list[rank];
      // Key by file (chapter-level dedup) — sections from same file merge
      const key = `${match.dir}/${match.file}`;
      const existing = scoreMap.get(key);
      const rrfScore = 1 / (k + rank + 1);

      if (existing) {
        existing.score += rrfScore;
        // Keep the match with the best individual score (most relevant section)
        if (match.score > existing.match.score) {
          existing.match = match;
        }
      } else {
        scoreMap.set(key, { score: rrfScore, match });
      }
    }
  }

  return [...scoreMap.values()]
    .sort((a, b) => b.score - a.score)
    .map(v => ({ ...v.match, score: v.score }));
}

// ─── Regulation scope resolution (used by API endpoint) ──────────

export type RegulationScope =
  | { type: 'single'; regulation: string }
  | { type: 'comparison'; regulations: string[] }
  | { type: 'auto' };

const VALID_REGULATIONS = new Set([
  'K2', 'K3', 'Bokföring', 'Fusioner', 'BRF', 'Årsbokslut',
  'Gränsvärden', 'K1 Enskilda', 'K1 Ideella',
]);

export function resolveScope(regulation: string): RegulationScope {
  if (regulation === 'K2K3') return { type: 'comparison', regulations: ['K2', 'K3'] };
  if (VALID_REGULATIONS.has(regulation)) return { type: 'single', regulation };
  return { type: 'auto' };
}

export function filterMatchesByScope(matches: ChapterMatch[], scope: RegulationScope): ChapterMatch[] {
  if (scope.type === 'auto') return matches;
  if (scope.type === 'single') {
    const filtered = matches.filter(m => m.regulation === scope.regulation);
    return filtered.length > 0 ? filtered : matches;
  }
  if (scope.type === 'comparison') {
    const filtered = matches.filter(m => scope.regulations.includes(m.regulation));
    return filtered.length > 0 ? filtered : matches;
  }
  return matches;
}

export async function routeQuestionSemantic(question: string): Promise<ChapterMatch[]> {
  const results: ChapterMatch[] = [];

  // Layer 1: Direct punkt-number match (highest priority)
  const punktMatch = matchPunktDirect(question);
  if (punktMatch) {
    results.push(punktMatch);
  }

  // Layer 2: RRF fusion of keyword + semantic results (run in parallel)
  try {
    const [semanticResults, keywordResults] = await Promise.all([
      getSemanticResults(question),
      Promise.resolve(routeQuestion(question)),
    ]);

    const fused = reciprocalRankFusion([semanticResults, keywordResults]);

    // Add fused results, skipping any punkt-match duplicates
    for (const match of fused) {
      const key = `${match.dir}/${match.file}`;
      if (!results.find(r => `${r.dir}/${r.file}` === key)) {
        results.push(match);
      }
      if (results.length >= 4) break;
    }
  } catch {
    // Embedding API failed — fall back to keyword router only
    return routeQuestion(question);
  }

  return results.slice(0, 4);
}
