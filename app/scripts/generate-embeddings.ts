/**
 * Generate section-level embeddings for the entire knowledge base.
 *
 * Scans all markdown files under knowledge/, splits by ## headings,
 * and generates embeddings via OpenRouter bge-m3.
 *
 * Run: OPENROUTER_API_KEY=sk-... npx tsx scripts/generate-embeddings.ts
 * Output: src/lib/server/embeddings.json
 */

import { readFileSync, writeFileSync, statSync, readdirSync } from 'fs';
import { join, relative, basename } from 'path';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  console.error('Missing OPENROUTER_API_KEY environment variable');
  process.exit(1);
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/embeddings';
const MODEL = 'baai/bge-m3';
const KNOWLEDGE_ROOT = join(import.meta.dirname, '..', 'knowledge');

/** Regulation metadata derived from directory name */
const DIR_TO_REGULATION: Record<string, string> = {
  'k2-arsredovisning': 'K2',
  'k3-arsredovisning': 'K3',
  'bokforing': 'Bokföring',
  'fusioner': 'Fusioner',
  'gransvarden': 'Gränsvärden',
  'brf-upplysningar': 'BRF',
  'k1-enskilda': 'K1 Enskilda',
  'k1-ideella': 'K1 Ideella',
  'arsbokslut': 'Årsbokslut',
};

interface Section {
  regulation: string;
  dir: string;
  file: string;
  section: string; // ## heading text
  label: string;   // human-readable label
  text: string;    // section content for embedding
}

/** Split a markdown file into sections by ## headings */
function splitSections(content: string, dir: string, file: string): Section[] {
  const regulation = DIR_TO_REGULATION[dir] || dir;
  const lines = content.split('\n');
  const sections: Section[] = [];

  // Extract chapter number from filename (e.g., "10a-anlägg..." → "10a")
  const chapterNum = file.match(/^(\d+[a-c]?)-/)?.[1] || '';
  const chapterPrefix = chapterNum ? `Kap ${chapterNum}` : '';

  // Extract chapter title from first # heading
  const h1Match = lines.find(l => /^# /.test(l));
  const chapterTitle = h1Match ? h1Match.replace(/^# /, '').trim() : basename(file, '.md');

  // Build a short chapter label like "K2 Kap 10a"
  const shortChapter = `${regulation} ${chapterPrefix}`.trim();

  let currentHeading = '';
  let currentLines: string[] = [];

  function flushSection() {
    const text = currentLines.join('\n').trim();
    // Skip empty sections and very short ones (< 50 chars)
    if (text.length < 50) return;

    const sectionName = currentHeading || chapterTitle;
    // Build label: "K2 Kap 10a – Avskrivning" (short and readable)
    const label = currentHeading
      ? `${shortChapter} – ${currentHeading}`
      : shortChapter || `${regulation} – ${chapterTitle}`;
    sections.push({
      regulation,
      dir,
      file,
      section: sectionName,
      label,
      text,
    });
  }

  for (const line of lines) {
    if (/^## /.test(line)) {
      flushSection();
      currentHeading = line.replace(/^## /, '').trim();
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }
  flushSection();

  return sections;
}

/** Scan all markdown files in the knowledge base */
function scanKnowledgeBase(): Section[] {
  const allSections: Section[] = [];

  for (const dir of readdirSync(KNOWLEDGE_ROOT)) {
    const dirPath = join(KNOWLEDGE_ROOT, dir);
    if (!statSync(dirPath).isDirectory()) continue;
    if (!DIR_TO_REGULATION[dir]) {
      console.warn(`  Skipping unknown directory: ${dir}`);
      continue;
    }

    // Look for .md files directly or in a chapters/ subdirectory
    let mdDir = dirPath;
    try {
      if (statSync(join(dirPath, 'chapters')).isDirectory()) {
        mdDir = join(dirPath, 'chapters');
      }
    } catch {
      // No chapters/ subdirectory — files are directly in dir
    }

    for (const file of readdirSync(mdDir)) {
      if (!file.endsWith('.md') || file === 'INDEX.md') continue;

      const content = readFileSync(join(mdDir, file), 'utf-8');
      const sections = splitSections(content, dir, file);
      allSections.push(...sections);
    }
  }

  return allSections;
}

/** Get embeddings from OpenRouter bge-m3 */
async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://k2k3.ai',
      'X-Title': 'K2K3.ai Embedding Generation',
    },
    body: JSON.stringify({
      model: MODEL,
      input: texts,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${err}`);
  }

  const data = await response.json() as {
    data: { embedding: number[]; index: number }[];
  };

  // Sort by index to ensure correct order
  data.data.sort((a, b) => a.index - b.index);
  return data.data.map(d => d.embedding);
}

async function main() {
  console.log('Scanning knowledge base...');
  const sections = scanKnowledgeBase();
  console.log(`Found ${sections.length} sections across ${new Set(sections.map(s => `${s.dir}/${s.file}`)).size} files`);

  // Show breakdown by regulation
  const byReg = new Map<string, number>();
  for (const s of sections) {
    byReg.set(s.regulation, (byReg.get(s.regulation) || 0) + 1);
  }
  for (const [reg, count] of [...byReg.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${reg}: ${count} sections`);
  }

  // Generate embeddings in batches
  const BATCH_SIZE = 50;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < sections.length; i += BATCH_SIZE) {
    const batch = sections.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(sections.length / BATCH_SIZE);
    console.log(`  Batch ${batchNum}/${totalBatches} (${batch.length} sections)...`);

    // Truncate long sections to ~2000 chars to keep embedding quality high
    const texts = batch.map(s => s.text.slice(0, 2000));
    const embeddings = await getEmbeddings(texts);
    allEmbeddings.push(...embeddings);

    // Small delay between batches to be nice to the API
    if (i + BATCH_SIZE < sections.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  // Build output
  const output = sections.map((s, i) => ({
    regulation: s.regulation,
    dir: s.dir,
    file: s.file,
    section: s.section,
    label: s.label,
    text: s.text.slice(0, 500), // Store truncated text for debugging
    // Round to 5 decimal places: halves file size with negligible quality loss
    embedding: allEmbeddings[i].map(v => Math.round(v * 1e5) / 1e5),
  }));

  const outPath = join(import.meta.dirname, '..', 'src', 'lib', 'server', 'embeddings.json');
  writeFileSync(outPath, JSON.stringify(output));

  const fileSizeKB = Math.round(statSync(outPath).size / 1024);
  const fileSizeMB = (fileSizeKB / 1024).toFixed(1);
  console.log(`\nDone! Written ${output.length} section embeddings to embeddings.json`);
  console.log(`File size: ${fileSizeMB} MB (${fileSizeKB} KB)`);
  console.log(`Embedding dimension: ${allEmbeddings[0].length}`);
}

main().catch(console.error);
