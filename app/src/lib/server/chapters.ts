import { readFile } from 'fs/promises';
import { join } from 'path';
import factsData from './facts.json';

const KNOWLEDGE_BASE_ROOT = join(process.cwd(), 'knowledge');

interface LoadedChapter {
  regulation: string;
  label: string;
  content: string;
}

interface Fact {
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
  facts: Fact[];
}

const allFacts: ChapterFacts[] = factsData as ChapterFacts[];

export async function loadChapters(
  matches: { regulation: string; dir: string; file: string; label: string }[]
): Promise<LoadedChapter[]> {
  const chapters: LoadedChapter[] = [];

  for (const match of matches) {
    const filePath = join(KNOWLEDGE_BASE_ROOT, match.dir, match.file);
    try {
      const content = await readFile(filePath, 'utf-8');
      chapters.push({
        regulation: match.regulation,
        label: match.label,
        content,
      });
    } catch {
      // File not found — skip silently
    }
  }

  const MAX_CHARS = 80_000;
  let totalChars = 0;
  const limited: LoadedChapter[] = [];

  for (const ch of chapters) {
    if (totalChars + ch.content.length > MAX_CHARS && limited.length > 0) break;
    limited.push(ch);
    totalChars += ch.content.length;
  }

  return limited;
}

/** Build structured facts section for the loaded chapters */
function buildFactsSection(
  matches: { dir: string; file: string }[]
): string {
  const beloppFacts: string[] = [];
  const changedRules: string[] = [];

  for (const match of matches) {
    const chapterFacts = allFacts.find(
      cf => cf.dir === match.dir && cf.file === match.file
    );
    if (!chapterFacts) continue;

    for (const fact of chapterFacts.facts) {
      if (fact.type === 'belopp') {
        const parts: string[] = [`${chapterFacts.regulation} punkt ${fact.punkt}`];
        if (fact.belopp) parts.push(`belopp: ${fact.belopp}`);
        if (fact.tid) parts.push(`tid: ${fact.tid}`);
        beloppFacts.push(parts.join(' — '));
      } else if (fact.type === 'new_rule') {
        changedRules.push(
          `${chapterFacts.regulation} punkt ${fact.punkt} [NY REGEL]: ${fact.summary.slice(0, 200)}`
        );
      } else if (fact.type === 'changed_rule') {
        changedRules.push(
          `${chapterFacts.regulation} punkt ${fact.punkt} [ÄNDRAD]: ${fact.summary.slice(0, 200)}`
        );
      }
    }
  }

  const sections: string[] = [];

  if (beloppFacts.length > 0) {
    sections.push(
      'VERIFIERADE BELOPP (uppdaterade 2025, använd dessa exakt):',
      ...beloppFacts.map(f => `• ${f}`),
    );
  }

  if (changedRules.length > 0) {
    // Limit to max 15 most relevant changed rules to avoid noise
    const limited = changedRules.slice(0, 15);
    sections.push(
      '',
      'NYLIGEN ÄNDRADE/NYA REGLER (BFNAR 2024-2025, citera dessa om relevanta):',
      ...limited.map(f => `• ${f}`),
    );
  }

  if (sections.length === 0) return '';
  return sections.join('\n') + '\n\n';
}

export function formatContext(
  chapters: LoadedChapter[],
  matches: { dir: string; file: string }[]
): string {
  const factsSection = buildFactsSection(matches);

  const body = chapters
    .map(
      (ch) =>
        `--- START: ${ch.label} (${ch.regulation}) ---\n${ch.content}\n--- SLUT: ${ch.label} ---`
    )
    .join('\n\n');

  return factsSection + body;
}
