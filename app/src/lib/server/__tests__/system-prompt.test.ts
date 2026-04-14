import { describe, it, expect, vi } from 'vitest';

vi.mock('$env/static/private', () => ({ OPENROUTER_API_KEY: 'test' }));

import { buildSystemPrompt } from '../ai';

describe('buildSystemPrompt', () => {
  describe('base rules present in all prompts', () => {
    const regulations = ['K2', 'K3', 'K2K3', 'auto', 'Bokföring', 'BRF', 'Fusioner'];

    it.each(regulations)('%s prompt contains "Citera exakt punktnummer"', (reg) => {
      const prompt = buildSystemPrompt(reg, 'test context');
      expect(prompt).toContain('Citera exakt punktnummer');
    });

    it.each(regulations)('%s prompt contains "gissa aldrig punktnummer"', (reg) => {
      const prompt = buildSystemPrompt(reg, 'test context');
      expect(prompt).toContain('gissa aldrig punktnummer');
    });

    it.each(regulations)('%s prompt contains "svenska"', (reg) => {
      const prompt = buildSystemPrompt(reg, 'test context');
      expect(prompt).toContain('svenska');
    });

    it.each(regulations)('%s prompt contains the provided context', (reg) => {
      const prompt = buildSystemPrompt(reg, 'my special context');
      expect(prompt).toContain('my special context');
    });

    it.each(regulations)('%s prompt contains "STRIKT KÄLLBINDNING"', (reg) => {
      const prompt = buildSystemPrompt(reg, 'test context');
      expect(prompt).toContain('STRIKT KÄLLBINDNING');
    });

    it.each(regulations)('%s prompt contains "INGET UTANFÖR KONTEXT"', (reg) => {
      const prompt = buildSystemPrompt(reg, 'test context');
      expect(prompt).toContain('INGET UTANFÖR KONTEXT');
    });

    it.each(regulations)('%s prompt retains existing rules 1-6', (reg) => {
      const prompt = buildSystemPrompt(reg, 'test context');
      expect(prompt).toContain('EXAKTA utdrag ur BFN:s regelverk');
      expect(prompt).toContain('Citera exakt punktnummer');
      expect(prompt).toContain('gissa aldrig punktnummer');
      expect(prompt).toContain('UPPDATERADE (2025)');
      expect(prompt).toContain('lagtext (tvingande)');
      expect(prompt).toContain('koncist på svenska');
    });
  });

  describe('K2-specific', () => {
    it('contains "K2"', () => {
      const prompt = buildSystemPrompt('K2', 'ctx');
      expect(prompt).toContain('K2');
    });

    it('instructs NOT to cite K3 rules unless asked', () => {
      const prompt = buildSystemPrompt('K2', 'ctx');
      expect(prompt).toMatch(/inte.*K3|INTE.*K3|ej.*K3/i);
    });

    it('mentions BFNAR 2016:10 or K2', () => {
      const prompt = buildSystemPrompt('K2', 'ctx');
      const mentionsEither = prompt.includes('BFNAR 2016:10') || prompt.includes('K2');
      expect(mentionsEither).toBe(true);
    });
  });

  describe('K3-specific', () => {
    it('contains "K3"', () => {
      const prompt = buildSystemPrompt('K3', 'ctx');
      expect(prompt).toContain('K3');
    });

    it('instructs NOT to cite K2 rules', () => {
      const prompt = buildSystemPrompt('K3', 'ctx');
      expect(prompt).toMatch(/inte.*K2|INTE.*K2|ej.*K2/i);
    });

    it('mentions K3 specifics', () => {
      const prompt = buildSystemPrompt('K3', 'ctx');
      const mentionsSpecifics = prompt.includes('komponentavskrivning') || prompt.includes('K3') || prompt.includes('BFNAR 2012:1');
      expect(mentionsSpecifics).toBe(true);
    });
  });

  describe('comparison mode (K2K3)', () => {
    it('contains instruction to compare', () => {
      const prompt = buildSystemPrompt('K2K3', 'ctx');
      expect(prompt).toMatch(/jämför|JÄMFÖR|skillnad/i);
    });

    it('mentions both K2 and K3', () => {
      const prompt = buildSystemPrompt('K2K3', 'ctx');
      expect(prompt).toContain('K2');
      expect(prompt).toContain('K3');
    });
  });

  describe('auto/generic mode', () => {
    it('works without error', () => {
      expect(() => buildSystemPrompt('auto', 'ctx')).not.toThrow();
    });

    it('returns a string with base rules', () => {
      const prompt = buildSystemPrompt('auto', 'ctx');
      expect(typeof prompt).toBe('string');
      expect(prompt).toContain('Citera exakt punktnummer');
    });
  });

  describe('other regulations', () => {
    it('Bokföring prompt mentions bokföringslagen or BFNAR 2013:2', () => {
      const prompt = buildSystemPrompt('Bokföring', 'ctx');
      const mentions = prompt.includes('bokföring') || prompt.includes('BFNAR 2013:2');
      expect(mentions).toBe(true);
    });

    it('BRF prompt mentions bostadsrättsförening or BFNAR 2023:1', () => {
      const prompt = buildSystemPrompt('BRF', 'ctx');
      const mentions = prompt.includes('bostadsrättsförening') || prompt.includes('BFNAR 2023:1');
      expect(mentions).toBe(true);
    });

    it('Fusioner prompt mentions fusion or BFNAR 2020:5', () => {
      const prompt = buildSystemPrompt('Fusioner', 'ctx');
      const mentions = prompt.includes('fusion') || prompt.includes('BFNAR 2020:5');
      expect(mentions).toBe(true);
    });
  });
});
