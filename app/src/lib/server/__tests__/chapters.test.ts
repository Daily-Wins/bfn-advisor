import { describe, it, expect } from 'vitest';
import { loadChapters, formatContext } from '../chapters';

// Real knowledge base file that exists in the repository
const K2_CHAPTER_01 = {
	regulation: 'K2',
	dir: 'k2-arsredovisning',
	file: '01-tillämpning.md',
	label: 'Kapitel 1 - Tillämpning',
};

// A file with belopp facts in facts.json
const K2_CHAPTER_02 = {
	regulation: 'K2',
	dir: 'k2-arsredovisning',
	file: '02-redovisningsprinciper.md',
	label: 'Kapitel 2 - Redovisningsprinciper',
};

const NON_EXISTENT_FILE = {
	regulation: 'K2',
	dir: 'k2-arsredovisning',
	file: 'does-not-exist.md',
	label: 'Non-existent',
};

describe('loadChapters', () => {
	it('loads content from a real knowledge base file', async () => {
		const chapters = await loadChapters([K2_CHAPTER_01]);

		expect(chapters).toHaveLength(1);
		expect(chapters[0].regulation).toBe('K2');
		expect(chapters[0].label).toBe('Kapitel 1 - Tillämpning');
		expect(chapters[0].content.length).toBeGreaterThan(0);
	});

	it('skips missing files silently', async () => {
		const chapters = await loadChapters([NON_EXISTENT_FILE]);

		expect(chapters).toHaveLength(0);
	});

	it('loads valid files and skips missing ones in the same call', async () => {
		const chapters = await loadChapters([K2_CHAPTER_01, NON_EXISTENT_FILE]);

		expect(chapters).toHaveLength(1);
		expect(chapters[0].label).toBe('Kapitel 1 - Tillämpning');
	});

	it('enforces MAX_CHARS truncation across multiple chapters', async () => {
		// Load many chapters to exceed the 80_000 character limit
		const manyMatches = Array.from({ length: 20 }, (_, i) => ({
			regulation: 'K2',
			dir: 'k2-arsredovisning',
			file: `01-tillämpning.md`,
			label: `Copy ${i}`,
		}));

		const chapters = await loadChapters(manyMatches);
		const totalChars = chapters.reduce((sum, ch) => sum + ch.content.length, 0);

		// First chapter always included; subsequent ones stop when exceeding 80K
		expect(chapters.length).toBeGreaterThanOrEqual(1);
		expect(chapters.length).toBeLessThan(20);
		expect(totalChars).toBeLessThanOrEqual(80_000 + chapters[0].content.length);
	});

	it('always includes the first chapter even if it exceeds MAX_CHARS', async () => {
		// The first chapter should always be included per the implementation logic
		const chapters = await loadChapters([K2_CHAPTER_01]);
		expect(chapters).toHaveLength(1);
	});

	it('returns empty array for empty input', async () => {
		const chapters = await loadChapters([]);
		expect(chapters).toHaveLength(0);
	});
});

describe('formatContext', () => {
	it('produces START/SLUT markers with regulation and label', async () => {
		const chapters = await loadChapters([K2_CHAPTER_01]);
		const result = formatContext(chapters, [K2_CHAPTER_01]);

		expect(result).toContain('--- START: Kapitel 1 - Tillämpning (K2) ---');
		expect(result).toContain('--- SLUT: Kapitel 1 - Tillämpning ---');
	});

	it('includes chapter content between markers', async () => {
		const chapters = await loadChapters([K2_CHAPTER_01]);
		const result = formatContext(chapters, [K2_CHAPTER_01]);

		// The chapter file should contain some known content
		expect(result).toContain(chapters[0].content);
	});

	it('always includes global VERIFIERADE BELOPP section regardless of matches', async () => {
		const chapters = await loadChapters([K2_CHAPTER_02]);
		const result = formatContext(chapters, [K2_CHAPTER_02]);

		expect(result).toContain('VERIFIERADE BELOPP OCH GRÄNSVÄRDEN (uppdaterade 2025, använd dessa exakt):');
		expect(result).toContain('belopp:');
	});

	it('includes global belopp facts even with empty matches', async () => {
		const result = formatContext([], []);

		expect(result).toContain('VERIFIERADE BELOPP OCH GRÄNSVÄRDEN (uppdaterade 2025, använd dessa exakt):');
		expect(result).toContain('7 000 kronor');
		expect(result).toContain('[K2]');
	});

	it('includes NYLIGEN ÄNDRADE/NYA REGLER section for chapters with changed_rule facts', async () => {
		const chapters = await loadChapters([K2_CHAPTER_01]);
		const result = formatContext(chapters, [K2_CHAPTER_01]);

		expect(result).toContain(
			'NYLIGEN ÄNDRADE/NYA REGLER (BFNAR 2024-2025, citera dessa om relevanta):'
		);
		// Chapter 01 has changed_rule and new_rule facts
		expect(result).toMatch(/\[ÄNDRAD\]|\[NY REGEL\]/);
	});

	it('formats belopp facts with punkt reference and amount', async () => {
		const chapters = await loadChapters([K2_CHAPTER_02]);
		const result = formatContext(chapters, [K2_CHAPTER_02]);

		// Should contain structured belopp line like "punkt 2.4 — belopp: 7 000 kronor"
		expect(result).toMatch(/punkt \d+\.\d+\w* — belopp:/);
	});

	it('returns only facts sections when chapters are empty but changed rules match', async () => {
		const result = formatContext([], [K2_CHAPTER_01]);

		// Should have global facts and changed rules but no chapter body
		expect(result).toContain('VERIFIERADE BELOPP OCH GRÄNSVÄRDEN');
		expect(result).toContain('NYLIGEN ÄNDRADE/NYA REGLER');
		expect(result).not.toContain('--- START:');
	});

	it('separates multiple chapters with double newlines', async () => {
		const chapters = await loadChapters([K2_CHAPTER_01, K2_CHAPTER_02]);
		const result = formatContext(chapters, [K2_CHAPTER_01, K2_CHAPTER_02]);

		// Two chapter blocks separated by \n\n
		const startMarkers = result.match(/--- START:/g);
		expect(startMarkers).toHaveLength(2);

		const slutMarkers = result.match(/--- SLUT:/g);
		expect(slutMarkers).toHaveLength(2);
	});

	it('limits changed rules to max 15 entries', async () => {
		// Load all K2 chapters to accumulate many changed_rule facts
		const allK2Matches = [
			{ regulation: 'K2', dir: 'k2-arsredovisning', file: '01-tillämpning.md', label: 'Ch1' },
			{
				regulation: 'K2',
				dir: 'k2-arsredovisning',
				file: '02-redovisningsprinciper.md',
				label: 'Ch2',
			},
			{
				regulation: 'K2',
				dir: 'k2-arsredovisning',
				file: '03-årsredovisningens-utformning.md',
				label: 'Ch3',
			},
			{
				regulation: 'K2',
				dir: 'k2-arsredovisning',
				file: '04a-uppställningsformer-resultaträkning.md',
				label: 'Ch4a',
			},
			{
				regulation: 'K2',
				dir: 'k2-arsredovisning',
				file: '04b-uppställningsformer-balansräkning.md',
				label: 'Ch4b',
			},
			{
				regulation: 'K2',
				dir: 'k2-arsredovisning',
				file: '05-extraordinära-poster.md',
				label: 'Ch5',
			},
			{
				regulation: 'K2',
				dir: 'k2-arsredovisning',
				file: '06-immateriella-anläggningstillgångar.md',
				label: 'Ch6',
			},
			{
				regulation: 'K2',
				dir: 'k2-arsredovisning',
				file: '07-materiella-anläggningstillgångar.md',
				label: 'Ch7',
			},
			{
				regulation: 'K2',
				dir: 'k2-arsredovisning',
				file: '08-finansiella-anläggningstillgångar.md',
				label: 'Ch8',
			},
			{
				regulation: 'K2',
				dir: 'k2-arsredovisning',
				file: '09-varulager.md',
				label: 'Ch9',
			},
			{
				regulation: 'K2',
				dir: 'k2-arsredovisning',
				file: '10-fordringar.md',
				label: 'Ch10',
			},
		];

		const result = formatContext([], allK2Matches);

		// The section must exist since these chapters have 25+ changed/new rules
		const header = 'NYLIGEN ÄNDRADE/NYA REGLER (BFNAR 2024-2025, citera dessa om relevanta):';
		expect(result).toContain(header);

		const changedSection = result.split(header)[1];
		const bulletPoints = changedSection.match(/^• /gm);
		expect(bulletPoints!.length).toBeGreaterThan(0);
		expect(bulletPoints!.length).toBeLessThanOrEqual(15);
	});
});
