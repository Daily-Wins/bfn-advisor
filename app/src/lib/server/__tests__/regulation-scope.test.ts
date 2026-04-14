import { describe, it, expect, vi } from 'vitest';

vi.mock('$env/static/private', () => ({ OPENROUTER_API_KEY: 'test' }));

import { resolveScope, filterMatchesByScope } from '../semantic-router';
import type { ChapterMatch } from '../semantic-router';

function makeMatch(regulation: string, file: string): ChapterMatch {
	return { regulation, dir: 'test', file, score: 0.8, label: `${regulation} ${file}` };
}

describe('resolveScope', () => {
	it('returns auto for "auto" input', () => {
		const scope = resolveScope('auto');
		expect(scope).toEqual({ type: 'auto' });
	});

	it('returns auto for unknown regulation', () => {
		const scope = resolveScope('nonsense');
		expect(scope).toEqual({ type: 'auto' });
	});

	it('returns auto for empty string', () => {
		const scope = resolveScope('');
		expect(scope).toEqual({ type: 'auto' });
	});

	it('returns comparison scope for K2K3', () => {
		const scope = resolveScope('K2K3');
		expect(scope).toEqual({ type: 'comparison', regulations: ['K2', 'K3'] });
	});

	it('returns single scope for K2', () => {
		const scope = resolveScope('K2');
		expect(scope).toEqual({ type: 'single', regulation: 'K2' });
	});

	it('returns single scope for K3', () => {
		const scope = resolveScope('K3');
		expect(scope).toEqual({ type: 'single', regulation: 'K3' });
	});

	it('returns single scope for Bokföring', () => {
		const scope = resolveScope('Bokföring');
		expect(scope).toEqual({ type: 'single', regulation: 'Bokföring' });
	});

	it('returns single scope for Fusioner', () => {
		const scope = resolveScope('Fusioner');
		expect(scope).toEqual({ type: 'single', regulation: 'Fusioner' });
	});

	it('returns single scope for BRF', () => {
		const scope = resolveScope('BRF');
		expect(scope).toEqual({ type: 'single', regulation: 'BRF' });
	});

	it('returns single scope for Årsbokslut', () => {
		const scope = resolveScope('Årsbokslut');
		expect(scope).toEqual({ type: 'single', regulation: 'Årsbokslut' });
	});

	it('returns single scope for Gränsvärden', () => {
		const scope = resolveScope('Gränsvärden');
		expect(scope).toEqual({ type: 'single', regulation: 'Gränsvärden' });
	});

	it('returns single scope for K1 Enskilda', () => {
		const scope = resolveScope('K1 Enskilda');
		expect(scope).toEqual({ type: 'single', regulation: 'K1 Enskilda' });
	});

	it('returns single scope for K1 Ideella', () => {
		const scope = resolveScope('K1 Ideella');
		expect(scope).toEqual({ type: 'single', regulation: 'K1 Ideella' });
	});

	it('is case-sensitive (k2 does not match K2)', () => {
		const scope = resolveScope('k2');
		expect(scope).toEqual({ type: 'auto' });
	});
});

describe('filterMatchesByScope', () => {
	const mixedMatches: ChapterMatch[] = [
		makeMatch('K2', '10a-avskrivning.md'),
		makeMatch('K3', '18-materiella.md'),
		makeMatch('Bokföring', '05-verifikation.md'),
		makeMatch('K2', '15-eget-kapital.md'),
	];

	it('returns all matches when scope is auto', () => {
		const result = filterMatchesByScope(mixedMatches, { type: 'auto' });
		expect(result).toEqual(mixedMatches);
	});

	it('filters to single regulation', () => {
		const result = filterMatchesByScope(mixedMatches, { type: 'single', regulation: 'K2' });
		expect(result).toHaveLength(2);
		expect(result.every((m) => m.regulation === 'K2')).toBe(true);
	});

	it('filters to comparison regulations', () => {
		const result = filterMatchesByScope(mixedMatches, {
			type: 'comparison',
			regulations: ['K2', 'K3'],
		});
		expect(result).toHaveLength(3);
		expect(result.every((m) => m.regulation === 'K2' || m.regulation === 'K3')).toBe(true);
	});

	it('returns empty array when no matches for single regulation (strict scoping)', () => {
		const result = filterMatchesByScope(mixedMatches, { type: 'single', regulation: 'Fusioner' });
		expect(result).toEqual([]);
	});

	it('returns empty array when no matches for comparison regulations (strict scoping)', () => {
		const result = filterMatchesByScope(mixedMatches, {
			type: 'comparison',
			regulations: ['Fusioner', 'BRF'],
		});
		expect(result).toEqual([]);
	});

	it('handles empty matches array', () => {
		const result = filterMatchesByScope([], { type: 'single', regulation: 'K2' });
		expect(result).toEqual([]);
	});
});
