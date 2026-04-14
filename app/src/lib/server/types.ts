/**
 * Shared types for the server-side router and retrieval pipeline.
 */

export interface ChapterMatch {
  regulation: string;
  dir: string;
  file: string;
  score: number;
  label: string;
  section?: string;
}
