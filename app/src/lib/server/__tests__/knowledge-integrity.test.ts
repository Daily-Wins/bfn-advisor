/**
 * Knowledge base file integrity tests.
 *
 * Verifies that all cross-references between router config, facts data,
 * and actual knowledge base files are consistent.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const KNOWLEDGE_DIR = path.resolve(__dirname, '../../../../knowledge');
const ROUTER_PATH = path.resolve(__dirname, '../router.ts');
const FACTS_PATH = path.resolve(__dirname, '../facts.json');

// ---------------------------------------------------------------------------
// Helpers: extract dir+file references by parsing source files
// ---------------------------------------------------------------------------

interface DirFile {
  dir: string;
  file: string;
}

function extractRouterReferences(source: string, arrayName: string): DirFile[] {
  // Match the array block (PUNKT_INDEX or ROUTES)
  const arrayRegex = new RegExp(`const ${arrayName}[^=]*=\\s*\\[([\\s\\S]*?)\\];`);
  const arrayMatch = source.match(arrayRegex);
  if (!arrayMatch) return [];

  const block = arrayMatch[1];
  const entries: DirFile[] = [];

  // Extract all dir + file pairs from the block
  const entryRegex = /dir:\s*'([^']+)',\s*file:\s*'([^']+)'/g;
  let m: RegExpExecArray | null;
  while ((m = entryRegex.exec(block)) !== null) {
    entries.push({ dir: m[1], file: m[2] });
  }
  return entries;
}

function loadFactsReferences(): DirFile[] {
  const raw = fs.readFileSync(FACTS_PATH, 'utf-8');
  const facts: { dir: string; file: string }[] = JSON.parse(raw);
  return facts.map((f) => ({ dir: f.dir, file: f.file }));
}

function uniqueDirFiles(refs: DirFile[]): DirFile[] {
  const seen = new Set<string>();
  return refs.filter((r) => {
    const key = `${r.dir}/${r.file}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Load data once
// ---------------------------------------------------------------------------

const routerSource = fs.readFileSync(ROUTER_PATH, 'utf-8');
const punktIndexRefs = uniqueDirFiles(extractRouterReferences(routerSource, 'PUNKT_INDEX'));
const routeRefs = uniqueDirFiles(extractRouterReferences(routerSource, 'ROUTES'));
const factsRefs = uniqueDirFiles(loadFactsReferences());

const allRefs = uniqueDirFiles([...punktIndexRefs, ...routeRefs, ...factsRefs]);
const referencedDirs = [...new Set(allRefs.map((r) => r.dir))];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Knowledge base integrity', () => {
  describe('Referenced knowledge directories exist', () => {
    it.each(referencedDirs)('directory "%s" exists', (dir) => {
      const dirPath = path.join(KNOWLEDGE_DIR, dir);
      expect(fs.existsSync(dirPath), `Missing directory: ${dirPath}`).toBe(true);
    });
  });

  describe('Router ROUTES files exist', () => {
    it.each(routeRefs.map((r) => [r.dir, r.file]))(
      '%s/%s exists',
      (dir, file) => {
        const filePath = path.join(KNOWLEDGE_DIR, dir, file);
        expect(fs.existsSync(filePath), `Missing file: ${filePath}`).toBe(true);
      },
    );
  });

  describe('Router PUNKT_INDEX files exist', () => {
    it.each(punktIndexRefs.map((r) => [r.dir, r.file]))(
      '%s/%s exists',
      (dir, file) => {
        const filePath = path.join(KNOWLEDGE_DIR, dir, file);
        expect(fs.existsSync(filePath), `Missing file: ${filePath}`).toBe(true);
      },
    );
  });

  describe('Facts.json files exist', () => {
    it.each(factsRefs.map((r) => [r.dir, r.file]))(
      '%s/%s exists',
      (dir, file) => {
        const filePath = path.join(KNOWLEDGE_DIR, dir, file);
        expect(fs.existsSync(filePath), `Missing file: ${filePath}`).toBe(true);
      },
    );
  });

  describe('Referenced files are non-empty', () => {
    it.each(allRefs.map((r) => [r.dir, r.file]))(
      '%s/%s has content (> 100 bytes)',
      (dir, file) => {
        const filePath = path.join(KNOWLEDGE_DIR, dir, file);
        if (!fs.existsSync(filePath)) return; // covered by existence tests
        const stat = fs.statSync(filePath);
        expect(stat.size).toBeGreaterThan(100);
      },
    );
  });

  describe('Markdown files contain headings', () => {
    it.each(allRefs.map((r) => [r.dir, r.file]))(
      '%s/%s contains at least one heading',
      (dir, file) => {
        const filePath = path.join(KNOWLEDGE_DIR, dir, file);
        if (!fs.existsSync(filePath)) return; // covered by existence tests
        const content = fs.readFileSync(filePath, 'utf-8');
        expect(content).toMatch(/^#{1,2}\s+.+/m);
      },
    );
  });

  describe('No orphaned knowledge directories', () => {
    const knowledgeSubdirs = fs
      .readdirSync(KNOWLEDGE_DIR)
      .filter((entry) => fs.statSync(path.join(KNOWLEDGE_DIR, entry)).isDirectory());

    it.each(knowledgeSubdirs)(
      'directory "%s" is referenced by router or facts',
      (dir) => {
        expect(
          referencedDirs.includes(dir),
          `Orphaned directory: ${dir} is not referenced by router.ts or facts.json`,
        ).toBe(true);
      },
    );
  });
});
