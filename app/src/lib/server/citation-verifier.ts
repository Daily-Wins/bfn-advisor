/**
 * Extracts punkt-number citations from an answer and verifies
 * they exist in the source context. Hallucinated punkt numbers
 * are detected deterministically via string matching.
 */

/** Extract all "punkt X.Y" or "punkt X.YA/B/C" references from text */
export function extractPunktCitations(text: string): string[] {
  const regex = /\bpunkt\s+(\d+\.\d+[A-Z]?)\b/gi;
  const matches = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    matches.add(m[1].toUpperCase());
  }
  return [...matches];
}

export interface CitationVerification {
  valid: string[];
  invalid: string[];
}

/** Verify each citation appears verbatim in the context */
export function verifyCitations(
  citations: string[],
  context: string,
): CitationVerification {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const punkt of citations) {
    const patterns = [
      new RegExp(`\\bpunkt\\s+${escapeRegex(punkt)}\\b`, 'i'),
      new RegExp(`\\b${escapeRegex(punkt)}\\b`, 'i'),
    ];
    const found = patterns.some((p) => p.test(context));
    if (found) valid.push(punkt);
    else invalid.push(punkt);
  }

  return { valid, invalid };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
