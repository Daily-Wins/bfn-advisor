import { describe, it, expect } from 'vitest';
import {
  extractPunktCitations,
  verifyCitations,
} from '../citation-verifier';

describe('extractPunktCitations', () => {
  it('extracts a single punkt reference', () => {
    expect(extractPunktCitations('enligt punkt 10.27')).toEqual(['10.27']);
  });

  it('extracts punkt with suffix letter', () => {
    expect(extractPunktCitations('punkt 10.27A gäller')).toEqual(['10.27A']);
  });

  it('extracts multiple distinct punkt references', () => {
    expect(extractPunktCitations('enligt punkt 2.4 och punkt 2.4B')).toEqual([
      '2.4',
      '2.4B',
    ]);
  });

  it('deduplicates repeated mentions of the same punkt', () => {
    expect(
      extractPunktCitations('punkt 5.1 och senare punkt 5.1 igen'),
    ).toEqual(['5.1']);
  });

  it('handles case variations and normalizes to uppercase suffix', () => {
    expect(extractPunktCitations('Punkt 5.1 och PUNKT 5.1')).toEqual(['5.1']);
    expect(extractPunktCitations('punkt 5.1a')).toEqual(['5.1A']);
  });

  it('returns empty array when no punkt references exist', () => {
    expect(extractPunktCitations('ingen referens här alls')).toEqual([]);
  });

  it('ignores "punkt" without a following number', () => {
    expect(extractPunktCitations('detta är en viktig punkt i texten')).toEqual(
      [],
    );
  });

  it('does not match chapter numbers like "kapitel 10"', () => {
    expect(extractPunktCitations('se kapitel 10 och kapitel 5')).toEqual([]);
  });

  it('respects word boundaries around punkt', () => {
    expect(extractPunktCitations('standpunkt 5.1 är viktig')).toEqual([]);
  });
});

describe('verifyCitations', () => {
  it('marks all citations valid when all appear in context', () => {
    const result = verifyCitations(
      ['10.27', '2.4'],
      'Enligt punkt 10.27 och punkt 2.4',
    );
    expect(result.valid).toEqual(['10.27', '2.4']);
    expect(result.invalid).toEqual([]);
  });

  it('marks all citations invalid when none appear in context', () => {
    const result = verifyCitations(['99.99'], 'Texten nämner inget relevant');
    expect(result.valid).toEqual([]);
    expect(result.invalid).toEqual(['99.99']);
  });

  it('correctly partitions mixed valid/invalid citations', () => {
    const result = verifyCitations(
      ['10.27', '99.99'],
      'Enligt punkt 10.27 gäller detta.',
    );
    expect(result.valid).toEqual(['10.27']);
    expect(result.invalid).toEqual(['99.99']);
  });

  it('accepts citation when context has "punkt X.Y" prefix', () => {
    const result = verifyCitations(['10.27'], 'Se punkt 10.27 för detaljer.');
    expect(result.valid).toEqual(['10.27']);
  });

  it('accepts citation when context has bare "X.Y" without punkt prefix', () => {
    const result = verifyCitations(['10.27'], 'Regel 10.27 styr detta.');
    expect(result.valid).toEqual(['10.27']);
  });

  it('matches case-insensitively on suffix letter', () => {
    const result = verifyCitations(['10.27A'], 'enligt punkt 10.27a gäller');
    expect(result.valid).toEqual(['10.27A']);
  });

  it('returns empty arrays for empty citations input', () => {
    const result = verifyCitations([], 'any context');
    expect(result.valid).toEqual([]);
    expect(result.invalid).toEqual([]);
  });

  it('marks all citations invalid when context is empty', () => {
    const result = verifyCitations(['10.27', '2.4'], '');
    expect(result.valid).toEqual([]);
    expect(result.invalid).toEqual(['10.27', '2.4']);
  });

  it('distinguishes similar but different punkt numbers', () => {
    const result = verifyCitations(['10.28'], 'endast punkt 10.27 finns här');
    expect(result.valid).toEqual([]);
    expect(result.invalid).toEqual(['10.28']);
  });
});
