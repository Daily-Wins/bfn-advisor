/**
 * Extract structured facts from all chapter files:
 * 1. Belopp/gränsvärden (punkt + kronor)
 * 2. Recently changed rules (BFNAR 2024:4 / 2025:2) with summaries
 *
 * Run: npx tsx scripts/extract-facts.ts
 * Output: src/lib/server/facts.json
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface ExtractedFact {
  punkt: string;
  type: 'belopp' | 'changed_rule' | 'new_rule';
  belopp?: string;
  tid?: string;
  summary: string;
}

interface ChapterFacts {
  regulation: string;
  dir: string;
  file: string;
  facts: ExtractedFact[];
}

const KNOWLEDGE_ROOT = join(__dirname, '..', '..');

const KNOWLEDGE_DIRS: { dir: string; regulation: string }[] = [
  { dir: 'k2-arsredovisning', regulation: 'K2' },
  { dir: 'k3-arsredovisning', regulation: 'K3' },
  { dir: 'arsbokslut', regulation: 'Årsbokslut' },
  { dir: 'bokforing', regulation: 'Bokföring' },
  { dir: 'fusioner', regulation: 'Fusioner' },
  { dir: 'k1-enskilda', regulation: 'K1 Enskilda' },
  { dir: 'k1-ideella', regulation: 'K1 Ideella' },
  { dir: 'gransvarden', regulation: 'Gränsvärden' },
  { dir: 'brf-upplysningar', regulation: 'BRF' },
];

function extractBelopp(text: string): string[] {
  const results: string[] = [];
  const re = /(\d[\d ]*\d)\s*(kronor|kr)\b/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    results.push(m[1].replace(/\s/g, ' ').trim() + ' kronor');
  }
  return [...new Set(results)];
}

function extractTid(text: string): string[] {
  const results: string[] = [];
  const re = /\b(ett|två|tre|fyra|fem|sex|sju|åtta|nio|tio)\s+(år|månader|dagar)\b/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    results.push(m[0].toLowerCase());
  }
  return [...new Set(results)];
}

function extractFactsFromContent(content: string): ExtractedFact[] {
  const facts: ExtractedFact[] = [];
  const seen = new Set<string>();

  // === Strategy 1: Belopp extraction ===
  const blockRe = /(?:Allmänt råd\s+)?(\d+\.\d+[A-Z]?)\s+([\s\S]*?)(?=\n\d+\.\d+[A-Z]?\s|\n###|\n---|\n##\s|$)/g;
  let m;
  while ((m = blockRe.exec(content)) !== null) {
    const punkt = m[1];
    const block = m[2];
    const belopp = extractBelopp(block);
    const tid = extractTid(block);

    if (belopp.length > 0 || tid.length > 0) {
      if (!seen.has('belopp:' + punkt)) {
        seen.add('belopp:' + punkt);
        const firstLine = block.split(/[\n.]/)[0].trim().slice(0, 200);
        facts.push({
          punkt,
          type: 'belopp',
          belopp: belopp.length > 0 ? belopp.join(', ') : undefined,
          tid: tid.length > 0 ? tid.join(', ') : undefined,
          summary: firstLine,
        });
      }
    }
  }

  // Inline belopp references
  const inlineRe = /punkt(?:erna?)?\s+(\d+\.\d+[A-Z]?)\b([^.]{0,100}?\d[\d ]*\d\s*(?:kronor|kr))/gi;
  while ((m = inlineRe.exec(content)) !== null) {
    const punkt = m[1];
    if (seen.has('belopp:' + punkt)) continue;
    seen.add('belopp:' + punkt);
    const belopp = extractBelopp(m[2]);
    if (belopp.length > 0) {
      facts.push({
        punkt,
        type: 'belopp',
        belopp: belopp.join(', '),
        summary: m[0].trim().slice(0, 200),
      });
    }
  }

  // === Strategy 2: Recently changed/new rules (BFNAR 2024:4, 2025:2) ===
  // Find punkt blocks that contain "(BFNAR 2025:2)" or "(BFNAR 2024:4)"
  const changeRe = /(\d+\.\d+[A-Z]?)\s+([\s\S]*?\(BFNAR 202[45]:\d\))/g;
  while ((m = changeRe.exec(content)) !== null) {
    const punkt = m[1];
    const block = m[2];

    if (seen.has('rule:' + punkt)) continue;
    seen.add('rule:' + punkt);

    // Determine if this is a new punkt (has a letter suffix like 2.4A, 10.11A, 10.22A)
    const isNew = /\d+\.\d+[A-Z]/.test(punkt);

    // Extract first meaningful sentence as summary (skip the punkt number repetition)
    const sentences = block
      .replace(/\(BFNAR 202[45]:\d\)/g, '')
      .split(/[.\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 20);
    const summary = sentences[0]?.slice(0, 250) || block.slice(0, 250);

    facts.push({
      punkt,
      type: isNew ? 'new_rule' : 'changed_rule',
      summary,
    });
  }

  return facts;
}

function main() {
  const allFacts: ChapterFacts[] = [];
  let beloppCount = 0;
  let changedCount = 0;
  let newCount = 0;

  for (const { dir, regulation } of KNOWLEDGE_DIRS) {
    const chaptersDir = join(KNOWLEDGE_ROOT, dir, 'chapters');
    let files: string[];
    try {
      files = readdirSync(chaptersDir).filter(f => f.endsWith('.md') && !f.startsWith('INDEX'));
    } catch {
      continue;
    }

    for (const file of files) {
      const filePath = join(chaptersDir, file);
      if (!statSync(filePath).isFile()) continue;

      const content = readFileSync(filePath, 'utf-8');
      const facts = extractFactsFromContent(content);

      if (facts.length > 0) {
        allFacts.push({ regulation, dir, file, facts });
        for (const f of facts) {
          if (f.type === 'belopp') beloppCount++;
          if (f.type === 'changed_rule') changedCount++;
          if (f.type === 'new_rule') newCount++;
        }
      }
    }
  }

  const outPath = join(__dirname, '..', 'src', 'lib', 'server', 'facts.json');
  writeFileSync(outPath, JSON.stringify(allFacts, null, 2));

  const total = beloppCount + changedCount + newCount;
  console.log('Extracted ' + total + ' facts from ' + allFacts.length + ' chapters');
  console.log('  Belopp: ' + beloppCount);
  console.log('  Changed rules: ' + changedCount);
  console.log('  New rules: ' + newCount);
  console.log('');

  // Show changed/new rules
  console.log('=== CHANGED/NEW RULES ===');
  for (const ch of allFacts) {
    for (const f of ch.facts) {
      if (f.type === 'changed_rule' || f.type === 'new_rule') {
        const tag = f.type === 'new_rule' ? '[NY]' : '[ÄNDRAD]';
        console.log('  ' + ch.regulation + ' punkt ' + f.punkt + ' ' + tag + ': ' + f.summary.slice(0, 100));
      }
    }
  }
}

main();
