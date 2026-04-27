#!/usr/bin/env tsx
/**
 * Guatemalan Law MCP -- Ingestion Pipeline (partial-corpus v1)
 *
 * Reads data/census.json + scripts/lib/sources.ts and ingests the 8
 * primary instruments from open public sources. Per-instrument:
 *
 *   1. Fetch raw bytes from the typed URL into data/source/{id}.{ext}
 *   2. For PDFs, run pdftotext via child_process to extract text
 *   3. Dispatch to the parser matching sourceType (wikitext / pdf-text)
 *   4. Tag every provision with metadata.confidence_tier
 *   5. Write data/seed/{id}.json
 *
 * If a fetch or extraction fails, mark the law `inaccessible` in the
 * census and continue. Don't fabricate data, don't fall back to a
 * different source silently.
 *
 * Usage:
 *   npm run ingest                       # ingest all 8
 *   npm run ingest -- --source-id <id>   # ingest one
 *   npm run ingest -- --force            # re-ingest even if seed exists
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import {
  parseGTLawPdfText,
  parseGTLawWikitext,
  type ActIndexEntry,
  type ParsedAct,
} from './lib/parser.js';
import { fetchWithRateLimit } from './lib/fetcher.js';
import { PARTIAL_CORPUS_SOURCES, type PartialCorpusSource } from './lib/sources.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_DIR = path.resolve(__dirname, '../data/source');
const SEED_DIR = path.resolve(__dirname, '../data/seed');
const CENSUS_PATH = path.resolve(__dirname, '../data/census.json');

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

interface CensusFile {
  schema_version: string;
  jurisdiction: string;
  jurisdiction_name: string;
  portal: string;
  coverage_tier: string;
  census_date: string;
  agent: string;
  summary: Record<string, unknown>;
  not_covered: string[];
  laws: CensusLawEntry[];
}

interface CliArgs {
  sourceId: string | null;
  force: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let sourceId: string | null = null;
  let force = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--source-id' && args[i + 1]) {
      sourceId = args[i + 1];
      i++;
    } else if (args[i] === '--force') {
      force = true;
    }
  }

  return { sourceId, force };
}

function actEntryFromSource(source: PartialCorpusSource): ActIndexEntry {
  return {
    id: source.id,
    title: source.title,
    titleEn: source.titleEn,
    shortName: source.shortName,
    status: 'in_force',
    issuedDate: source.issuedDate,
    inForceDate: source.issuedDate,
    url: source.url,
  };
}

function fileExtFor(sourceType: 'wikitext' | 'pdf-text'): string {
  switch (sourceType) {
    case 'wikitext': return 'wikitext';
    case 'pdf-text': return 'pdf';
  }
}

async function fetchAsString(url: string): Promise<string | null> {
  const res = await fetchWithRateLimit(url);
  if (res.status !== 200) {
    console.log(`    HTTP ${res.status}`);
    return null;
  }
  return res.body;
}

async function fetchPdfBinary(url: string): Promise<Buffer | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'guatemalan-law-mcp/1.1 (https://github.com/Ansvar-Systems/Guatemalan-law-mcp; hello@ansvar.ai)',
        'Accept': 'application/pdf,*/*;q=0.8',
        'Accept-Language': 'es-GT,es;q=0.9,en;q=0.5',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    if (response.status !== 200) {
      console.log(`    HTTP ${response.status}`);
      return null;
    }
    const buf = Buffer.from(await response.arrayBuffer());
    if (buf.length < 1000) {
      console.log(`    response too small (${buf.length} bytes)`);
      return null;
    }
    if (!buf.subarray(0, 5).toString('utf-8').startsWith('%PDF-')) {
      console.log(`    response is not a PDF (got ${buf.subarray(0, 16).toString('utf-8')})`);
      return null;
    }
    return buf;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`    fetch error: ${msg}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function pdfToText(pdfPath: string): string {
  const result = spawnSync('pdftotext', ['-enc', 'UTF-8', pdfPath, '-'], {
    encoding: 'utf-8',
    maxBuffer: 100 * 1024 * 1024,
  });
  if (result.status !== 0) {
    const stderr = result.stderr || 'unknown error';
    throw new Error(`pdftotext failed (exit ${result.status}): ${stderr}`);
  }
  return result.stdout;
}

function tagBlueTier(parsed: ParsedAct, tier: 'blue' | 'amber'): ParsedAct {
  return {
    ...parsed,
    provisions: parsed.provisions.map(prov => ({
      ...prov,
      metadata: { ...(prov.metadata ?? {}), confidence_tier: tier },
    })),
  };
}

function readCensus(): CensusFile {
  if (!fs.existsSync(CENSUS_PATH)) {
    console.error(`ERROR: census file missing at ${CENSUS_PATH}`);
    console.error('Run "npm run census" first.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CENSUS_PATH, 'utf-8')) as CensusFile;
}

function writeCensus(census: CensusFile): void {
  census.summary['total_laws'] = census.laws.length;
  census.summary['ingestable'] = census.laws.filter(l => l.classification === 'ingestable').length;
  census.summary['inaccessible'] = census.laws.filter(l => l.classification === 'inaccessible').length;
  fs.writeFileSync(CENSUS_PATH, JSON.stringify(census, null, 2));
}

interface IngestResult {
  id: string;
  shortName: string;
  status: 'ok' | 'fetch-failed' | 'parse-failed' | 'resumed';
  provisions: number;
  definitions: number;
  expected: number;
  ratio: number;
  warning?: string;
  error?: string;
}

async function ingestOne(
  source: PartialCorpusSource,
  censusEntry: CensusLawEntry,
  force: boolean,
  today: string,
): Promise<IngestResult> {
  const ext = fileExtFor(source.sourceType);
  const sourceFile = path.join(SOURCE_DIR, `${source.id}.${ext}`);
  const seedFile = path.join(SEED_DIR, `${source.id}.json`);

  if (!force && fs.existsSync(seedFile)) {
    try {
      const existing = JSON.parse(fs.readFileSync(seedFile, 'utf-8')) as ParsedAct;
      const provCount = existing.provisions?.length ?? 0;
      const defCount = existing.definitions?.length ?? 0;
      censusEntry.ingested = true;
      censusEntry.provision_count = provCount;
      censusEntry.ingestion_date = censusEntry.ingestion_date ?? today;
      return {
        id: source.id,
        shortName: source.shortName,
        status: 'resumed',
        provisions: provCount,
        definitions: defCount,
        expected: source.expectedArticles,
        ratio: provCount / Math.max(1, source.expectedArticles),
      };
    } catch {
      // corrupt seed; re-ingest
    }
  }

  let extractedText: string;

  if (fs.existsSync(sourceFile) && !force) {
    console.log(`    cached source at ${sourceFile}`);
    if (source.sourceType === 'pdf-text') {
      extractedText = pdfToText(sourceFile);
    } else {
      extractedText = fs.readFileSync(sourceFile, 'utf-8');
    }
  } else {
    if (source.sourceType === 'pdf-text') {
      const pdf = await fetchPdfBinary(source.url);
      if (!pdf) {
        censusEntry.classification = 'inaccessible';
        return {
          id: source.id,
          shortName: source.shortName,
          status: 'fetch-failed',
          provisions: 0,
          definitions: 0,
          expected: source.expectedArticles,
          ratio: 0,
          error: 'PDF fetch failed',
        };
      }
      fs.writeFileSync(sourceFile, pdf);
      console.log(`    saved ${(pdf.length / 1024).toFixed(0)} KB pdf`);
      try {
        extractedText = pdfToText(sourceFile);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          id: source.id,
          shortName: source.shortName,
          status: 'parse-failed',
          provisions: 0,
          definitions: 0,
          expected: source.expectedArticles,
          ratio: 0,
          error: `pdftotext: ${msg}`,
        };
      }
    } else {
      const wikitext = await fetchAsString(source.url);
      if (!wikitext) {
        censusEntry.classification = 'inaccessible';
        return {
          id: source.id,
          shortName: source.shortName,
          status: 'fetch-failed',
          provisions: 0,
          definitions: 0,
          expected: source.expectedArticles,
          ratio: 0,
          error: 'wikitext fetch failed',
        };
      }
      fs.writeFileSync(sourceFile, wikitext, 'utf-8');
      console.log(`    saved ${(wikitext.length / 1024).toFixed(0)} KB wikitext`);
      extractedText = wikitext;
    }
  }

  if (!extractedText || extractedText.trim().length < 200) {
    return {
      id: source.id,
      shortName: source.shortName,
      status: 'parse-failed',
      provisions: 0,
      definitions: 0,
      expected: source.expectedArticles,
      ratio: 0,
      error: `extracted text too small (${extractedText?.trim().length ?? 0} chars)`,
    };
  }

  const act = actEntryFromSource(source);
  let parsed: ParsedAct;
  try {
    parsed = source.sourceType === 'wikitext'
      ? parseGTLawWikitext(extractedText, act)
      : parseGTLawPdfText(extractedText, act);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      id: source.id,
      shortName: source.shortName,
      status: 'parse-failed',
      provisions: 0,
      definitions: 0,
      expected: source.expectedArticles,
      ratio: 0,
      error: `parse: ${msg}`,
    };
  }

  const tagged = tagBlueTier(parsed, source.tier);
  fs.writeFileSync(seedFile, JSON.stringify(tagged, null, 2));

  const provCount = tagged.provisions.length;
  const defCount = tagged.definitions.length;
  const ratio = provCount / Math.max(1, source.expectedArticles);

  censusEntry.ingested = true;
  censusEntry.provision_count = provCount;
  censusEntry.ingestion_date = today;

  let warning: string | undefined;
  if (ratio < 0.4) {
    warning = `extracted ${provCount}/${source.expectedArticles} expected articles (${(ratio * 100).toFixed(0)}%) — degraded`;
  }

  return {
    id: source.id,
    shortName: source.shortName,
    status: 'ok',
    provisions: provCount,
    definitions: defCount,
    expected: source.expectedArticles,
    ratio,
    warning,
  };
}

async function main(): Promise<void> {
  const { sourceId, force } = parseArgs();

  console.log('Guatemalan Law MCP -- Ingestion (partial-corpus v1)');
  console.log('===================================================\n');

  fs.mkdirSync(SOURCE_DIR, { recursive: true });
  fs.mkdirSync(SEED_DIR, { recursive: true });

  const census = readCensus();
  const censusById = new Map<string, CensusLawEntry>();
  for (const law of census.laws) censusById.set(law.id, law);

  let sources = PARTIAL_CORPUS_SOURCES;
  if (sourceId) {
    sources = sources.filter(s => s.id === sourceId);
    if (sources.length === 0) {
      console.error(`ERROR: --source-id "${sourceId}" not found.`);
      console.error(`Known: ${PARTIAL_CORPUS_SOURCES.map(s => s.id).join(', ')}`);
      process.exit(1);
    }
  }

  console.log(`  Processing ${sources.length} of ${PARTIAL_CORPUS_SOURCES.length} sources`);
  if (force) console.log('  --force: re-ingesting even if seeds exist');
  console.log('');

  const today = new Date().toISOString().split('T')[0];
  const results: IngestResult[] = [];

  for (const source of sources) {
    const entry = censusById.get(source.id);
    if (!entry) {
      console.error(`  [skip] ${source.id} missing from census.json — re-run "npm run census"`);
      continue;
    }
    console.log(`  [${source.id}] ${source.shortName} (${source.sourceType}, ~${source.expectedArticles} arts)`);
    const result = await ingestOne(source, entry, force, today);
    results.push(result);
    if (result.status === 'resumed') {
      console.log(`    -> resumed: ${result.provisions} provisions, ${result.definitions} definitions`);
    } else if (result.status === 'ok') {
      console.log(`    -> ${result.provisions} provisions, ${result.definitions} definitions (${(result.ratio * 100).toFixed(0)}% of expected)`);
      if (result.warning) console.log(`    WARN: ${result.warning}`);
    } else {
      console.log(`    -> ${result.status}: ${result.error}`);
    }
  }

  writeCensus(census);

  console.log(`\n${'='.repeat(70)}\nIngestion Report\n${'='.repeat(70)}`);
  console.log(`  Sources processed: ${results.length}`);
  const ok = results.filter(r => r.status === 'ok').length;
  const resumed = results.filter(r => r.status === 'resumed').length;
  const failed = results.filter(r => r.status !== 'ok' && r.status !== 'resumed').length;
  const totalProv = results.reduce((s, r) => s + r.provisions, 0);
  const totalDef = results.reduce((s, r) => s + r.definitions, 0);
  console.log(`  OK:                ${ok}`);
  console.log(`  Resumed:           ${resumed}`);
  console.log(`  Failed:            ${failed}`);
  console.log(`  Total provisions:  ${totalProv}`);
  console.log(`  Total definitions: ${totalDef}`);

  const concerns = results.filter(r => r.warning || r.status === 'fetch-failed' || r.status === 'parse-failed');
  if (concerns.length > 0) {
    console.log('\n  CONCERNS:');
    for (const c of concerns) {
      console.log(`    ${c.id}: ${c.error ?? c.warning}`);
    }
  }
  console.log('');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
