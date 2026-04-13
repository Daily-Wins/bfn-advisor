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

/** Build global belopp facts section — always injected regardless of routing */
function buildGlobalFactsSection(): string {
  const byRegulation = new Map<string, string[]>();

  for (const entry of allFacts) {
    for (const fact of entry.facts) {
      if (fact.type !== 'belopp') continue;
      const parts: string[] = [`punkt ${fact.punkt}`];
      if (fact.belopp) parts.push(`belopp: ${fact.belopp}`);
      if (fact.tid) parts.push(`tid: ${fact.tid}`);

      const reg = entry.regulation;
      if (!byRegulation.has(reg)) byRegulation.set(reg, []);
      byRegulation.get(reg)!.push(parts.join(' — '));
    }
  }

  if (byRegulation.size === 0) return '';

  const lines: string[] = [
    'VERIFIERADE BELOPP OCH GRÄNSVÄRDEN (uppdaterade 2025, använd dessa exakt):',
  ];
  for (const [reg, facts] of byRegulation) {
    lines.push(`[${reg}]`);
    for (const f of facts) {
      lines.push(`• ${f}`);
    }
  }
  return lines.join('\n') + '\n\n';
}

/** Build chapter-specific changed/new rules section */
function buildChangedRulesSection(
  matches: { dir: string; file: string }[]
): string {
  const changedRules: string[] = [];

  for (const match of matches) {
    const chapterFacts = allFacts.find(
      cf => cf.dir === match.dir && cf.file === match.file
    );
    if (!chapterFacts) continue;

    for (const fact of chapterFacts.facts) {
      if (fact.type === 'new_rule') {
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

  if (changedRules.length === 0) return '';

  // Limit to max 15 most relevant changed rules to avoid noise
  const limited = changedRules.slice(0, 15);
  const lines = [
    'NYLIGEN ÄNDRADE/NYA REGLER (BFNAR 2024-2025, citera dessa om relevanta):',
    ...limited.map(f => `• ${f}`),
  ];
  return lines.join('\n') + '\n\n';
}

export function formatContext(
  chapters: LoadedChapter[],
  matches: { dir: string; file: string }[]
): string {
  const globalFacts = buildGlobalFactsSection();
  const changedRules = buildChangedRulesSection(matches);

  const body = chapters
    .map(
      (ch) =>
        `--- START: ${ch.label} (${ch.regulation}) ---\n${ch.content}\n--- SLUT: ${ch.label} ---`
    )
    .join('\n\n');

  if (!globalFacts && !changedRules && !body) return '';
  return globalFacts + changedRules + body;
}
