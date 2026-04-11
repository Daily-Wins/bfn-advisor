import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import factsData from '../facts.json';

const __dirname = dirname(fileURLToPath(import.meta.url));
const knowledgeDir = resolve(__dirname, '../../../../knowledge');

const VALID_TYPES = ['belopp', 'changed_rule', 'new_rule'] as const;
const PUNKT_PATTERN = /^\d+\.\d+[A-Z]?$/;

interface Fact {
	punkt: string;
	type: string;
	belopp?: string;
	tid?: string;
	summary: string;
}

interface ChapterEntry {
	regulation: string;
	dir: string;
	file: string;
	facts: Fact[];
}

const entries = factsData as ChapterEntry[];

describe('facts.json schema validation', () => {
	it('should be a non-empty array', () => {
		expect(Array.isArray(entries)).toBe(true);
		expect(entries.length).toBeGreaterThan(0);
	});

	it('every entry has required fields: regulation, dir, file, facts', () => {
		for (const entry of entries) {
			expect(entry).toHaveProperty('regulation');
			expect(entry).toHaveProperty('dir');
			expect(entry).toHaveProperty('file');
			expect(entry).toHaveProperty('facts');
			expect(typeof entry.regulation).toBe('string');
			expect(typeof entry.dir).toBe('string');
			expect(typeof entry.file).toBe('string');
			expect(Array.isArray(entry.facts)).toBe(true);
		}
	});
});

describe('fact field validation', () => {
	it('every fact has required fields: punkt, type, summary', () => {
		for (const entry of entries) {
			for (const fact of entry.facts) {
				expect(fact, `Missing punkt in ${entry.regulation}/${entry.file}`).toHaveProperty('punkt');
				expect(fact, `Missing type in ${entry.regulation}/${entry.file}`).toHaveProperty('type');
				expect(fact, `Missing summary in ${entry.regulation}/${entry.file}`).toHaveProperty('summary');
			}
		}
	});

	it('type is one of: belopp, changed_rule, new_rule', () => {
		for (const entry of entries) {
			for (const fact of entry.facts) {
				expect(
					VALID_TYPES.includes(fact.type as (typeof VALID_TYPES)[number]),
					`Invalid type "${fact.type}" for punkt ${fact.punkt} in ${entry.regulation}/${entry.file}`
				).toBe(true);
			}
		}
	});

	it('belopp facts must have belopp or tid field', () => {
		for (const entry of entries) {
			for (const fact of entry.facts) {
				if (fact.type === 'belopp') {
					const hasBelopp = typeof fact.belopp === 'string' && fact.belopp.length > 0;
					const hasTid = typeof fact.tid === 'string' && fact.tid.length > 0;
					expect(
						hasBelopp || hasTid,
						`belopp fact punkt ${fact.punkt} in ${entry.regulation}/${entry.file} lacks both belopp and tid`
					).toBe(true);
				}
			}
		}
	});

	it('no empty summaries', () => {
		for (const entry of entries) {
			for (const fact of entry.facts) {
				expect(
					typeof fact.summary === 'string' && fact.summary.trim().length > 0,
					`Empty summary for punkt ${fact.punkt} in ${entry.regulation}/${entry.file}`
				).toBe(true);
			}
		}
	});
});

describe('punkt format validation', () => {
	it('all punkt values match pattern N.N with optional letter suffix', () => {
		for (const entry of entries) {
			for (const fact of entry.facts) {
				expect(
					PUNKT_PATTERN.test(fact.punkt),
					`Invalid punkt format "${fact.punkt}" in ${entry.regulation}/${entry.file}`
				).toBe(true);
			}
		}
	});
});

describe('uniqueness constraints', () => {
	it('no duplicate punkt+type within the same chapter entry', () => {
		for (const entry of entries) {
			const keys = entry.facts.map((f) => `${f.punkt}::${f.type}`);
			const duplicates = keys.filter((k, i) => keys.indexOf(k) !== i);
			expect(
				duplicates,
				`Duplicate punkt+type [${duplicates.join(', ')}] in ${entry.regulation}/${entry.file}`
			).toEqual([]);
		}
	});

	it('no duplicate punkt+type within the same regulation across chapters', () => {
		const regulationPunkts = new Map<string, Map<string, string>>();

		for (const entry of entries) {
			if (!regulationPunkts.has(entry.regulation)) {
				regulationPunkts.set(entry.regulation, new Map());
			}
			const seen = regulationPunkts.get(entry.regulation)!;

			for (const fact of entry.facts) {
				const key = `${fact.punkt}::${fact.type}`;
				const existing = seen.get(key);
				if (existing) {
					expect.fail(
						`Punkt ${fact.punkt} (${fact.type}) appears in both ${existing} and ${entry.file} for regulation ${entry.regulation}`
					);
				}
				seen.set(key, entry.file);
			}
		}
	});
});

describe('file system integrity', () => {
	it('all dir values correspond to existing directories in knowledge/', () => {
		const dirs = [...new Set(entries.map((e) => e.dir))];
		for (const dir of dirs) {
			const dirPath = resolve(knowledgeDir, dir);
			expect(existsSync(dirPath), `Directory not found: ${dirPath}`).toBe(true);
		}
	});

	it('all file values correspond to existing files in their dir', () => {
		for (const entry of entries) {
			const filePath = resolve(knowledgeDir, entry.dir, entry.file);
			expect(
				existsSync(filePath),
				`File not found: ${filePath} (regulation: ${entry.regulation})`
			).toBe(true);
		}
	});
});
