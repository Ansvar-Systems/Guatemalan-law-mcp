/**
 * Response metadata and ToolResponse wrapper for the Guatemalan Law MCP.
 *
 * See: docs/guides/law-mcp-golden-standard.md Section 4.9
 */

import type Database from '@ansvar/mcp-sqlite';
import type { CitationMetadata } from './citation.js';

export interface ResponseMeta {
  disclaimer?: string;
  data_age?: string;
  copyright?: string;
  [key: string]: unknown;
}

export interface ToolResponse<T> {
  results: T;
  _meta: ResponseMeta;
  _citation?: CitationMetadata;
  _error_type?: string;
}

export function generateResponseMetadata(db: InstanceType<typeof Database>): ResponseMeta {
  let builtAt: string | undefined;
  try {
    const row = db
      .prepare("SELECT value FROM db_metadata WHERE key = 'built_at'")
      .get() as { value: string } | undefined;
    builtAt = row?.value;
  } catch {
    // db_metadata table may not exist during development
  }
  return {
    disclaimer:
      'This information is provided for reference only and does not constitute legal advice.',
    ...(builtAt && { data_age: builtAt }),
    copyright: 'Centro Nacional de Análisis y Documentación Judicial (CENADOJ)',
  };
}
