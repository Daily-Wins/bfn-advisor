import { describe, it, expect, vi } from 'vitest';

vi.mock('$env/static/private', () => ({ JINA_API_KEY: 'test' }));

import { resolveRegulationScope } from '../semantic-router';

describe('resolveRegulationScope', () => {
  // ─── Explicit single regulation selections ─────────────────────

  it('returns single K2 when user selects K2', () => {
    expect(resolveRegulationScope('K2', 'any question')).toEqual({
      type: 'single',
      regulation: 'K2',
    });
  });

  it('returns single K3 when user selects K3', () => {
    expect(resolveRegulationScope('K3', 'any question')).toEqual({
      type: 'single',
      regulation: 'K3',
    });
  });

  it('returns single Bokföring when user selects Bokföring', () => {
    expect(resolveRegulationScope('Bokföring', 'any')).toEqual({
      type: 'single',
      regulation: 'Bokföring',
    });
  });

  it('returns single Fusioner when user selects Fusioner', () => {
    expect(resolveRegulationScope('Fusioner', 'any')).toEqual({
      type: 'single',
      regulation: 'Fusioner',
    });
  });

  it('returns single BRF when user selects BRF', () => {
    expect(resolveRegulationScope('BRF', 'any')).toEqual({
      type: 'single',
      regulation: 'BRF',
    });
  });

  it('returns single Årsbokslut when user selects Årsbokslut', () => {
    expect(resolveRegulationScope('Årsbokslut', 'any')).toEqual({
      type: 'single',
      regulation: 'Årsbokslut',
    });
  });

  it('returns single K1 Enskilda when user selects K1 Enskilda', () => {
    expect(resolveRegulationScope('K1 Enskilda', 'any')).toEqual({
      type: 'single',
      regulation: 'K1 Enskilda',
    });
  });

  it('returns single K1 Ideella when user selects K1 Ideella', () => {
    expect(resolveRegulationScope('K1 Ideella', 'any')).toEqual({
      type: 'single',
      regulation: 'K1 Ideella',
    });
  });

  it('returns single Gränsvärden when user selects Gränsvärden', () => {
    expect(resolveRegulationScope('Gränsvärden', 'any')).toEqual({
      type: 'single',
      regulation: 'Gränsvärden',
    });
  });

  // ─── Comparison mode ───────────────────────────────────────────

  it('returns comparison scope for K2K3 selection', () => {
    expect(resolveRegulationScope('K2K3', 'any')).toEqual({
      type: 'comparison',
      regulations: ['K2', 'K3'],
    });
  });

  // ─── Auto-detection fallback ───────────────────────────────────

  it('delegates to detectRegulationScope when selection is auto', () => {
    const result = resolveRegulationScope('auto', 'avskrivning K2');
    expect(result).toEqual({ type: 'single', regulation: 'K2' });
  });

  it('returns unknown when auto and question has no regulation hint', () => {
    const result = resolveRegulationScope('auto', 'periodisering');
    expect(result).toEqual({ type: 'unknown' });
  });

  it('treats empty string same as auto', () => {
    const result = resolveRegulationScope('', 'periodisering');
    expect(result).toEqual({ type: 'unknown' });
  });

  it('treats invalid selection same as auto', () => {
    const result = resolveRegulationScope('invalid', 'periodisering');
    expect(result).toEqual({ type: 'unknown' });
  });
});
