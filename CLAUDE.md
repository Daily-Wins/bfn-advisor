# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

This repository contains a structured knowledge base for **BFNAR 2017:3 Arsbokslut** (BFN's guidance on Annual Accounts for Swedish companies). The source document is a 293-page PDF from Bokforingsnamnden (BFN) that has been extracted into structured markdown files for AI LLM consumption.

The regulation applies to companies that prepare annual accounts (arsbokslut) under Chapter 6 of the Swedish Bookkeeping Act (BFL 1999:1078). It covers sole traders, partnerships, non-profit associations, community associations, foundations, and branches.

## Project Context

This work aligns with BFN's own initiative (Dnr 2026:48, dated 2026-03-17) to create a markup-format test version of their regulations for use in AI solutions and accounting systems. The procurement document (`underlag-for-direktupphandling-av-konsulttjanst-rorande-digitalisering-regelverk.pdf`) specifies:
- The regulation should be structured/tagged so an AI model can read it optimally
- Markdown or equivalent markup format
- Content types (lagtext, allmant rad, kommentar) must be clearly distinguished
- The structure should support use in both accounting systems and AI services

## Repository Structure

```
vl17-3-ab-kons.pdf          # Source PDF (293 pages, authoritative)
underlag-for-direktupphandling-av-konsulttjanst-rorande-digitalisering-regelverk.pdf  # BFN procurement spec
chapters/                    # Extracted markdown per chapter
  INDEX.md                   # Full chapter index with page references
  00-inledning.md            # Introduction and abbreviations
  01-tillampning.md          # Chapter 1: Scope and applicability
  02-grundlaggande-principer.md  # Chapter 2: Fundamental principles
  03-arsbokslutets-utformning.md # Chapter 3: Format of the annual accounts
  04-uppstallningsformer.md  # Chapter 4: Presentation formats (RR + BR)
  05-rorelseintakter.md      # Chapter 5: Operating revenue
  06-rorelsekostnader.md     # Chapter 6: Operating expenses
  07-finansiella-poster.md   # Chapter 7: Financial items
  08-tillgangar.md           # Chapter 8: Assets (general)
  09-anlaggningstillgangar.md # Chapter 9: Intangible and tangible fixed assets
  10-finansiella-anlaggningstillgangar.md # Chapter 10: Financial fixed assets
  11-varulager.md            # Chapter 11: Inventory
  12-kortfristiga-fordringar.md # Chapter 12: Short-term receivables
  13-kortfristiga-placeringar.md # Chapter 13: Short-term investments and cash
  14-eget-kapital.md         # Chapter 14: Equity and untaxed reserves
  15-avsattningar.md         # Chapter 15: Provisions
  16-skulder.md              # Chapter 16: Liabilities
  17-upplysningar.md         # Chapter 17: Disclosures
  18-moderforetag.md         # Chapter 18: Parent companies and associates
  19-forsta-gangen.md        # Chapter 19: First-time application
  20-punkt-1-7.md            # Chapter 20: Companies applying point 1.7
  exempel/                   # Worked examples from the document
```

## Document Structure Pattern

Each chapter file follows this consistent structure:

```markdown
# Kapitel N - [Title]
## Tillampning (Scope)
## Grundlaggande bestammelser (Fundamental rules)
## [Topic-specific sections]
## Sarskilda regler for [entity type] (Special rules per entity type)
```

Content is tagged by source type:
- **Lagtext**: Direct quotes from law (BFL, ARL, IL)
- **Allmant rad** (numbered X.Y): BFN's binding general advice
- **Kommentar**: BFN's explanatory commentary

## Key Regulatory References

| Abbreviation | Full Name |
|---|---|
| BFL | Bokforingslagen (1999:1078) |
| ARL | Arsredovisningslagen (1995:1554) |
| IL | Inkomstskattelagen (1999:1229) |
| ABL | Aktiebolagslagen (2005:551) |
| BFNAR 2017:3 | This regulation (Arsbokslut) |
| BFNAR 2012:1 | Arsredovisning och koncernredovisning (K3) |
| K1 | Simplified annual accounts (BFNAR 2006:1 / 2010:1) |
| K2 | This regulation (BFNAR 2017:3) - common informal name |

## Working With This Knowledge Base

- The PDF is the **source of truth**. Markdown files are derived extractions.
- When answering questions about K2 rules, cite the specific point number (e.g., "punkt 5.16").
- Entity-specific rules (enskild naringsverksamhet, handelsbolag, ideella foreningar, samfallighetsforeningar, stiftelser, filialer) override general rules.
- Point 1.7 allows companies to optionally apply K3 (BFNAR 2012:1) rules instead.
- The regulation must be applied as a whole (punkt 1.5) - cherry-picking is not allowed.

## Extraction Status

Chapters are extracted progressively. If a chapter file is missing, read the corresponding pages from the PDF directly. Page ranges per chapter can be found in the table of contents (PDF pages 2-9).
