/**
 * Semantic router using pre-computed Jina embeddings.
 * Computes query embedding at runtime via Jina API, then
 * cosine similarity against pre-computed chapter embeddings.
 *
 * Latency: ~200-400ms for Jina API call (parallel with nothing — no extra wait for user)
 */

import { JINA_API_KEY } from '$env/static/private';
import embeddingsData from './embeddings.json';

export interface ChapterMatch {
  regulation: string;
  dir: string;
  file: string;
  score: number;
  label: string;
}

interface StoredEmbedding {
  regulation: string;
  dir: string;
  file: string;
  label: string;
  description: string;
  embedding: number[];
}

const chapters: StoredEmbedding[] = embeddingsData as StoredEmbedding[];

/** Compute cosine similarity between two normalized vectors (just dot product) */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}

/** Get query embedding from Jina API */
async function getQueryEmbedding(query: string): Promise<number[]> {
  const response = await fetch('https://api.jina.ai/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${JINA_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'jina-embeddings-v3',
      input: [query],
      normalized: true,
      embedding_type: 'float',
      task: 'retrieval.query',
    }),
  });

  if (!response.ok) {
    throw new Error(`Jina API error: ${response.status}`);
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
  if (/\bbokför/.test(q) && !/\b(års)?redovisning/.test(q)) return 'Bokföring';
  return null;
}

/** Direct punkt-number lookup */
function matchPunktDirect(question: string): ChapterMatch | null {
  const match = question.match(/punkt\s+(\d+)\.(\d+)/i);
  if (!match) return null;

  const chapterNum = parseInt(match[1]);

  // Find chapter by punkt prefix in K2 (most common)
  const k2Match = chapters.find(c =>
    c.regulation === 'K2' &&
    c.file.startsWith(`${chapterNum.toString().padStart(2, '0')}-`) ||
    c.file.startsWith(`${chapterNum}a-`) ||
    c.file.startsWith(`${chapterNum}b-`)
  );

  if (k2Match) {
    return {
      regulation: k2Match.regulation,
      dir: k2Match.dir,
      file: k2Match.file,
      score: 1.0,
      label: k2Match.label,
    };
  }
  return null;
}

export async function routeQuestionSemantic(question: string): Promise<ChapterMatch[]> {
  const results: ChapterMatch[] = [];

  // Layer 1: Direct punkt-number match
  const punktMatch = matchPunktDirect(question);
  if (punktMatch) {
    results.push(punktMatch);
  }

  // Layer 2: Semantic similarity via Jina
  try {
    const queryEmbedding = await getQueryEmbedding(question);
    const regBoost = detectRegulationBoost(question);

    const scored = chapters.map(ch => {
      let score = cosineSimilarity(queryEmbedding, ch.embedding);

      // Boost if regulation matches preference
      if (regBoost && ch.regulation.startsWith(regBoost)) {
        score *= 1.3;
      }
      // Slight penalty if regulation doesn't match explicit preference
      if (regBoost && !ch.regulation.startsWith(regBoost)) {
        score *= 0.7;
      }

      return { ...ch, score };
    });

    scored.sort((a, b) => b.score - a.score);

    // When no regulation is specified, ensure we include chapters from
    // multiple regulations (the user likely wants the most relevant answer
    // regardless of which regulation it comes from)
    if (!regBoost) {
      // Take top result, then ensure diversity: include best from other regulations
      const seen = new Set<string>();
      const seenRegs = new Set<string>();
      const diverse: typeof scored = [];

      for (const ch of scored) {
        const key = `${ch.dir}/${ch.file}`;
        if (seen.has(key)) continue;

        // Always take top 2 results regardless of regulation
        if (diverse.length < 2) {
          diverse.push(ch);
          seen.add(key);
          seenRegs.add(ch.regulation);
          continue;
        }

        // For slots 3-4, prefer unseen regulations for diversity
        if (!seenRegs.has(ch.regulation) && diverse.length < 4) {
          diverse.push(ch);
          seen.add(key);
          seenRegs.add(ch.regulation);
          continue;
        }

        // Fill remaining from top scores
        if (diverse.length < 4) {
          diverse.push(ch);
          seen.add(key);
        }

        if (diverse.length >= 4) break;
      }

      for (const ch of diverse) {
        const key = `${ch.dir}/${ch.file}`;
        if (!results.find(r => `${r.dir}/${r.file}` === key)) {
          results.push({
            regulation: ch.regulation,
            dir: ch.dir,
            file: ch.file,
            score: ch.score,
            label: ch.label,
          });
        }
      }
    } else {
      // Regulation specified — take top matches
      for (const ch of scored) {
        const key = `${ch.dir}/${ch.file}`;
        if (!results.find(r => `${r.dir}/${r.file}` === key)) {
          results.push({
            regulation: ch.regulation,
            dir: ch.dir,
            file: ch.file,
            score: ch.score,
            label: ch.label,
          });
        }
        if (results.length >= 3) break;
      }
    }
  } catch {
    // Jina API failed — fall back to keyword router
    const { routeQuestion } = await import('./router');
    return routeQuestion(question);
  }

  return results.slice(0, 4);
}
