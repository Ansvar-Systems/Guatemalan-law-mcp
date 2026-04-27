#!/usr/bin/env tsx
/**
 * Guatemalan Law MCP -- Census Script (partial-corpus v1)
 *
 * Reads the typed source list at scripts/lib/sources.ts and writes
 * data/census.json. No web crawl — the partial-corpus shape is fixed
 * by the legal scout report (8 primary national codes + 1985
 * Constitution).
 *
 * The official consolidated gazette (CENADOJ / oj.gob.gt) is geo-gated
 * to Guatemalan IPs and is excluded by design. Coverage is Tier D.
 *
 * Output: data/census.json (CensusFile schema, schema_version 2.1)
 *
 * Usage: npm run census
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { PARTIAL_CORPUS_SOURCES, type PartialCorpusSource } from './lib/sources.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../data');
const CENSUS_PATH = path.join(DATA_DIR, 'census.json');

interface CensusLawEntry {
  id: string;
  title: string;
  identifier: string;
  url: string;
  status: 'in_force' | 'amended' | 'repealed';
  category: string;
  classification: 'ingestable' | 'excluded' | 'inaccessible';
  ingested: boolean;
  provision_count: number;
  ingestion_date: string | null;
  issued_date?: string;
  source_type: 'wikitext' | 'pdf-text';
  confidence_tier: 'blue' | 'amber';
  expected_articles: number;
  license_type: string;
  short_name: string;
  title_en: string;
  note?: string;
}

function entryFromSource(source: PartialCorpusSource): CensusLawEntry {
  return {
    id: source.id,
    title: source.title,
    identifier: source.identifier,
    url: source.url,
    status: 'in_force',
    category: source.category,
    classification: 'ingestable',
    ingested: false,
    provision_count: 0,
    ingestion_date: null,
    issued_date: source.issuedDate,
    source_type: source.sourceType,
    confidence_tier: source.tier,
    expected_articles: source.expectedArticles,
    license_type: source.licenseType,
    short_name: source.shortName,
    title_en: source.titleEn,
    note: source.note,
  };
}

function main(): void {
  console.log('Guatemalan Law MCP -- Census (partial corpus v1)');
  console.log('================================================\n');

  fs.mkdirSync(DATA_DIR, { recursive: true });

  const laws = PARTIAL_CORPUS_SOURCES.map(entryFromSource);

  const census = {
    schema_version: '2.1',
    jurisdiction: 'GT',
    jurisdiction_name: 'Guatemala',
    portal: 'partial-corpus (open public sources)',
    coverage_tier: 'D',
    census_date: new Date().toISOString().split('T')[0],
    agent: 'guatemalan-law-mcp/census.ts',
    summary: {
      total_laws: laws.length,
      ingestable: laws.filter(l => l.classification === 'ingestable').length,
      ocr_needed: 0,
      inaccessible: 0,
      excluded: 0,
      by_source_type: {
        wikitext: laws.filter(l => l.source_type === 'wikitext').length,
        'pdf-text': laws.filter(l => l.source_type === 'pdf-text').length,
      },
      by_tier: {
        blue: laws.filter(l => l.confidence_tier === 'blue').length,
        amber: laws.filter(l => l.confidence_tier === 'amber').length,
      },
    },
    not_covered: [
      'Official consolidated gazette (CENADOJ / oj.gob.gt) — geo-gated to GT IPs',
      'Case law (Corte de Constitucionalidad, Corte Suprema de Justicia)',
      'Agency guidance / regulatory opinions',
      'Decree-level instruments outside the 8 listed codes',
      'Subnational regulation, municipal codes',
      'Amendments published after each instrument snapshot date',
    ],
    laws,
  };

  fs.writeFileSync(CENSUS_PATH, JSON.stringify(census, null, 2));

  console.log(`  Wrote ${laws.length} ingestable instruments to ${CENSUS_PATH}\n`);
  for (const law of laws) {
    console.log(`    ${law.id.padEnd(34)} ${law.source_type.padEnd(10)} ~${law.expected_articles} arts`);
  }
}

main();
