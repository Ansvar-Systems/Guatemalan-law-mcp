/**
 * Typed source list for the Guatemala partial-corpus v1 ingest.
 *
 * 8 primary national instruments fetched from open public sources (no
 * geo-gating, no auth). The official consolidated gazette (CENADOJ /
 * oj.gob.gt) is geo-gated to Guatemalan IPs and is not accessible from
 * this infrastructure; coverage is partial by design (Tier D).
 *
 * Each source carries:
 *   - id: stable identifier used for census, source files, and seeds
 *   - sourceType: dispatch key for the ingest pipeline
 *   - tier: confidence tier — 'blue' for text-layered primary text,
 *           'amber' if the snapshot is OCR'd or known-degraded
 *   - expectedArticles: scout-estimated article count for verification
 */

export type SourceType = 'wikitext' | 'pdf-text';

export interface PartialCorpusSource {
  id: string;
  title: string;
  titleEn: string;
  shortName: string;
  identifier: string;
  url: string;
  sourceType: SourceType;
  tier: 'blue' | 'amber';
  expectedArticles: number;
  issuedDate: string;
  category: 'act' | 'decree' | 'declaration' | 'constitution' | 'code';
  licenseType: 'Government Open Data' | 'Creative Commons (Wikisource)' | 'OAS Public Document';
  note?: string;
}

export const PARTIAL_CORPUS_SOURCES: PartialCorpusSource[] = [
  {
    id: 'constitucion-1985',
    title: 'Constitución Política de la República de Guatemala de 1985',
    titleEn: 'Political Constitution of the Republic of Guatemala (1985)',
    shortName: 'Constitución 1985',
    identifier: 'Constitución 1985',
    url: 'https://es.wikisource.org/w/index.php?title=Constituci%C3%B3n_Pol%C3%ADtica_de_la_Rep%C3%BAblica_de_Guatemala_de_1985&action=raw',
    sourceType: 'wikitext',
    tier: 'blue',
    expectedArticles: 281,
    issuedDate: '1985-05-31',
    category: 'constitution',
    licenseType: 'Creative Commons (Wikisource)',
  },
  {
    id: 'codigo-penal-17-73',
    title: 'Código Penal de Guatemala (Decreto 17-73)',
    titleEn: 'Criminal Code of Guatemala (Decree 17-73)',
    shortName: 'Código Penal',
    identifier: 'Decreto 17-73',
    url: 'https://www.un.org/depts/los/LEGISLATIONANDTREATIES/PDFFILES/GTM_codigo_penal.pdf',
    sourceType: 'pdf-text',
    tier: 'blue',
    expectedArticles: 498,
    issuedDate: '1973-07-27',
    category: 'code',
    licenseType: 'Government Open Data',
  },
  {
    id: 'codigo-procesal-penal-51-92',
    title: 'Código Procesal Penal de Guatemala (Decreto 51-92)',
    titleEn: 'Code of Criminal Procedure of Guatemala (Decree 51-92)',
    shortName: 'Código Procesal Penal',
    identifier: 'Decreto 51-92',
    url: 'https://www.idpp.gob.gt/images/Biblioteca-virtual/Leyes_y_Reglamentos/CODIGO_PROCESAL_PENAL.pdf',
    sourceType: 'pdf-text',
    tier: 'blue',
    expectedArticles: 558,
    issuedDate: '1992-09-28',
    category: 'code',
    licenseType: 'Government Open Data',
  },
  {
    id: 'codigo-civil-106',
    title: 'Código Civil de Guatemala (Decreto-Ley 106)',
    titleEn: 'Civil Code of Guatemala (Decree-Law 106)',
    shortName: 'Código Civil',
    identifier: 'Decreto-Ley 106',
    url: 'https://www.oas.org/dil/esp/Codigo_Civil_Guatemala.pdf',
    sourceType: 'pdf-text',
    tier: 'blue',
    expectedArticles: 2180,
    issuedDate: '1963-09-14',
    category: 'code',
    licenseType: 'OAS Public Document',
    note: 'Fetched from OAS DIL (oas.org/dil) because the WIPO Lex page returns intermittent 504 errors.',
  },
  {
    id: 'codigo-trabajo-1441',
    title: 'Código de Trabajo de Guatemala (Decreto 1441)',
    titleEn: 'Labour Code of Guatemala (Decree 1441)',
    shortName: 'Código de Trabajo',
    identifier: 'Decreto 1441',
    url: 'https://web.archive.org/web/2024/https://www.wipo.int/edocs/lexdocs/laws/es/gt/gt015es.pdf',
    sourceType: 'pdf-text',
    tier: 'blue',
    expectedArticles: 432,
    issuedDate: '1971-05-05',
    category: 'code',
    licenseType: 'Government Open Data',
    note: 'WIPO Lex live URL returns 504; mirrored snapshot served via Wayback Machine. Two-column layout — extraction fidelity is lower than other PDFs (see ingestion report).',
  },
  {
    id: 'codigo-comercio-2-70',
    title: 'Código de Comercio de Guatemala (Decreto 2-70)',
    titleEn: 'Commercial Code of Guatemala (Decree 2-70)',
    shortName: 'Código de Comercio',
    identifier: 'Decreto 2-70',
    url: 'https://web.archive.org/web/2024/https://www.wipo.int/edocs/lexdocs/laws/es/gt/gt010es.pdf',
    sourceType: 'pdf-text',
    tier: 'blue',
    expectedArticles: 1039,
    issuedDate: '1970-04-09',
    category: 'code',
    licenseType: 'Government Open Data',
    note: 'congreso.gob.gt blocks non-GT IPs (Imperva); WIPO Lex live URL is intermittently 504. Mirrored snapshot served via Wayback Machine.',
  },
  {
    id: 'codigo-tributario-6-91',
    title: 'Código Tributario de la República de Guatemala (Decreto-Ley 6-91)',
    titleEn: 'Tax Code of the Republic of Guatemala (Decree-Law 6-91)',
    shortName: 'Código Tributario',
    identifier: 'Decreto-Ley 6-91',
    url: 'https://es.wikisource.org/w/index.php?title=C%C3%B3digo_Tributario_de_la_Rep%C3%BAblica_de_Guatemala_(Decreto_Ley_6-91)&action=raw',
    sourceType: 'wikitext',
    tier: 'blue',
    expectedArticles: 187,
    issuedDate: '1991-04-09',
    category: 'code',
    licenseType: 'Creative Commons (Wikisource)',
  },
  {
    id: 'ley-electoral-1-85',
    title: 'Ley Electoral y de Partidos Políticos de Guatemala (Decreto Número 1-85)',
    titleEn: 'Electoral and Political Parties Law of Guatemala (Decree 1-85)',
    shortName: 'Ley Electoral',
    identifier: 'Decreto 1-85',
    url: 'https://es.wikisource.org/w/index.php?title=Decreto%20N%C3%BAmero%201-85,%20Ley%20Electoral%20y%20de%20Partidos%20Pol%C3%ADticos%20(Guatemala)&action=raw',
    sourceType: 'wikitext',
    tier: 'blue',
    expectedArticles: 270,
    issuedDate: '1985-12-03',
    category: 'act',
    licenseType: 'Creative Commons (Wikisource)',
  },
];
