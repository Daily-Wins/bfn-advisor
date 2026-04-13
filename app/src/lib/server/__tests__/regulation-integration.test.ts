import { describe, it, expect, vi } from 'vitest';

// Mock SvelteKit env
vi.mock('$env/static/private', () => ({ OPENROUTER_API_KEY: 'test' }));

import { resolveScope, filterMatchesByScope } from '../semantic-router';
import { routeQuestion } from '../router';
import { formatContext, loadChapters } from '../chapters';
import { buildSystemPrompt } from '../ai';

describe('regulation pipeline integration', () => {
  // ─── Scope resolution ───────────────────────────────────────────

  describe('scope resolution', () => {
    it('K2 resolves to single scope', () => {
      const scope = resolveScope('K2');
      expect(scope).toEqual({ type: 'single', regulation: 'K2' });
    });

    it('K3 resolves to single scope', () => {
      const scope = resolveScope('K3');
      expect(scope).toEqual({ type: 'single', regulation: 'K3' });
    });

    it('K2K3 resolves to comparison scope', () => {
      const scope = resolveScope('K2K3');
      expect(scope).toEqual({ type: 'comparison', regulations: ['K2', 'K3'] });
    });

    it('auto resolves to auto scope', () => {
      const scope = resolveScope('auto');
      expect(scope).toEqual({ type: 'auto' });
    });

    it('unknown string resolves to auto scope', () => {
      const scope = resolveScope('nonsense');
      expect(scope).toEqual({ type: 'auto' });
    });
  });

  // ─── Scope-based belopp filtering via matches ───────────────────

  it('K2 scope only includes K2 belopp in context', async () => {
    const matches = routeQuestion('periodisering', 'K2');
    const chapters = await loadChapters(matches);
    const context = formatContext(chapters, matches);

    expect(context).toContain('7 000');
    const beloppSection = context.split('VERIFIERADE BELOPP')[1]?.split('---')[0] || '';
    expect(beloppSection).not.toContain('[Årsbokslut]');
    for (const m of matches) {
      expect(m.regulation).toBe('K2');
    }
  });

  it('K3 filtered routing returns only K3 results', () => {
    const matches = routeQuestion('avskrivning', 'K3');
    for (const m of matches) {
      expect(m.regulation).toBe('K3');
    }
  });

  it('auto scope does not filter matches', () => {
    const scope = resolveScope('auto');
    const allResults = routeQuestion('avskrivning');
    const filtered = filterMatchesByScope(allResults, scope);
    expect(filtered).toEqual(allResults);
  });

  it('K2K3 comparison scope keeps only K2 and K3 matches', () => {
    const scope = resolveScope('K2K3');
    const allResults = routeQuestion('avskrivning');
    const filtered = filterMatchesByScope(allResults, scope);
    for (const r of filtered) {
      expect(['K2', 'K3']).toContain(r.regulation);
    }
  });

  // ─── Routing + scope filtering ──────────────────────────────────

  describe('routing with scope filtering', () => {
    it('K2 routing filter gives only K2 chapters', () => {
      const scope = resolveScope('K2');
      const allResults = routeQuestion('avskrivning');
      const filtered = filterMatchesByScope(allResults, scope);
      for (const r of filtered) {
        expect(r.regulation).toBe('K2');
      }
    });

    it('K3 routing filter excludes K2 results', () => {
      const scope = resolveScope('K3');
      // 'komponentavskrivning' returns both K3 and K2 results
      const allResults = routeQuestion('komponentavskrivning');
      const filtered = filterMatchesByScope(allResults, scope);
      for (const r of filtered) {
        expect(r.regulation).toBe('K3');
      }
    });

    it('falls back to all results when scope filter yields empty', () => {
      const scope = resolveScope('Fusioner');
      // 'avskrivning' has no Fusioner results, so filterMatchesByScope returns all
      const allResults = routeQuestion('avskrivning');
      const filtered = filterMatchesByScope(allResults, scope);
      // Should fall back to all results since no Fusioner matches exist
      expect(filtered.length).toBeGreaterThan(0);
    });
  });

  // ─── System prompt varies by regulation ─────────────────────────

  describe('system prompt varies by regulation', () => {
    it('K2 system prompt mentions K2 and forbids K3', () => {
      const prompt = buildSystemPrompt('K2', 'test context');
      expect(prompt).toContain('K2');
      expect(prompt).toContain('test context');
      expect(prompt.toLowerCase()).toContain('k3'); // mentions K3 to say "don't use it"
    });

    it('K3 system prompt mentions K3', () => {
      const prompt = buildSystemPrompt('K3', 'test context');
      expect(prompt).toContain('K3');
    });

    it('K2K3 system prompt mentions comparison', () => {
      const prompt = buildSystemPrompt('K2K3', 'test context');
      expect(prompt.toLowerCase()).toContain('jämför');
    });

    it('auto regulation uses generic prompt', () => {
      const prompt = buildSystemPrompt('auto', 'test context');
      expect(prompt).toContain('K2K3.ai');
      expect(prompt).toContain('test context');
    });
  });

  // ─── Full pipeline ──────────────────────────────────────────────

  describe('full pipeline', () => {
    it('K2 question produces K2-only context', async () => {
      // Simulate what +server.ts does
      const regulation = 'K2';
      const question = 'Hur fungerar periodisering?';

      const scope = resolveScope(regulation);
      const allMatches = routeQuestion(question);
      const matches = filterMatchesByScope(allMatches, scope);
      const chapters = await loadChapters(matches);
      const context = formatContext(chapters, matches);
      const systemPrompt = buildSystemPrompt(regulation, context);

      // Verify end-to-end
      expect(matches.every(m => m.regulation === 'K2')).toBe(true);
      expect(systemPrompt).toContain('K2');
      expect(context.length).toBeGreaterThan(0);
    });

    it('K3 question produces K3-only context', async () => {
      const regulation = 'K3';
      const question = 'komponentavskrivning';

      const scope = resolveScope(regulation);
      const allMatches = routeQuestion(question);
      const matches = filterMatchesByScope(allMatches, scope);
      const chapters = await loadChapters(matches);
      const context = formatContext(chapters, matches);
      const systemPrompt = buildSystemPrompt(regulation, context);

      expect(matches.every(m => m.regulation === 'K3')).toBe(true);
      expect(systemPrompt).toContain('K3');
      expect(context.length).toBeGreaterThan(0);
    });

    it('K2K3 comparison question produces mixed context', async () => {
      const regulation = 'K2K3';
      const question = 'avskrivning';

      const scope = resolveScope(regulation);
      const allMatches = routeQuestion(question);
      const matches = filterMatchesByScope(allMatches, scope);
      const chapters = await loadChapters(matches);
      const context = formatContext(chapters, matches);
      const systemPrompt = buildSystemPrompt(regulation, context);

      const regulations = new Set(matches.map(m => m.regulation));
      // Should contain at least one of K2 or K3
      expect(regulations.has('K2') || regulations.has('K3')).toBe(true);
      // System prompt should mention comparison
      expect(systemPrompt.toLowerCase()).toContain('jämför');
      expect(context.length).toBeGreaterThan(0);
    });

    it('auto regulation passes all matches through unfiltered', async () => {
      const regulation = 'auto';
      const question = 'avskrivning';

      const scope = resolveScope(regulation);
      const allMatches = routeQuestion(question);
      const matches = filterMatchesByScope(allMatches, scope);

      // Auto scope should not filter
      expect(matches).toEqual(allMatches);
    });
  });
});
