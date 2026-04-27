/**
 * Guatemalan Law HTML Parser
 *
 * Parses law HTML from guatemala.justia.com into structured provisions.
 *
 * Guatemalan civil law article patterns:
 *   "Articulo N."  / "Art. N" / "ARTICULO N"
 *   "Articulo Unico"
 *
 * Structure patterns:
 *   "TITULO I", "CAPITULO I", "SECCION I"
 *   "DISPOSICIONES TRANSITORIAS", "DISPOSICIONES FINALES"
 *
 * Definition patterns:
 *   "se entiende por", "a los efectos de", "se define como"
 *
 * No child_process needed -- all data is HTML, not PDF.
 */

export interface ActIndexEntry {
  id: string;
  title: string;
  titleEn: string;
  shortName: string;
  status: 'in_force' | 'amended' | 'repealed' | 'not_yet_in_force';
  issuedDate: string;
  inForceDate: string;
  url: string;
  description?: string;
}

export interface ParsedProvision {
  provision_ref: string;
  chapter?: string;
  section: string;
  title: string;
  content: string;
  metadata?: {
    confidence_tier?: 'blue' | 'amber';
    [key: string]: unknown;
  };
}

export interface ParsedDefinition {
  term: string;
  definition: string;
  source_provision?: string;
}

export interface ParsedAct {
  id: string;
  type: 'statute';
  title: string;
  title_en: string;
  short_name: string;
  status: string;
  issued_date: string;
  in_force_date: string;
  url: string;
  description?: string;
  provisions: ParsedProvision[];
  definitions: ParsedDefinition[];
}

/* ---------- HTML Cleaning ---------- */

function decodeEntities(text: string): string {
  return text
    .replace(/&aacute;/g, '\u00e1').replace(/&eacute;/g, '\u00e9')
    .replace(/&iacute;/g, '\u00ed').replace(/&oacute;/g, '\u00f3')
    .replace(/&uacute;/g, '\u00fa').replace(/&ntilde;/g, '\u00f1')
    .replace(/&Aacute;/g, '\u00c1').replace(/&Eacute;/g, '\u00c9')
    .replace(/&Iacute;/g, '\u00cd').replace(/&Oacute;/g, '\u00d3')
    .replace(/&Uacute;/g, '\u00da').replace(/&Ntilde;/g, '\u00d1')
    .replace(/&uuml;/g, '\u00fc').replace(/&Uuml;/g, '\u00dc')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&laquo;/g, '\u00ab').replace(/&raquo;/g, '\u00bb')
    .replace(/&mdash;/g, '\u2014').replace(/&ndash;/g, '\u2013')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

/**
 * Strip HTML tags and normalize whitespace.
 * Converts block-level tags to newlines for structure preservation.
 */
function htmlToText(html: string): string {
  return html
    .replace(/<\/?(p|div|br|li|h[1-6]|tr|dt|dd|blockquote)\b[^>]*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-zA-Z]+;/g, m => decodeEntities(m))
    .replace(/&#\d+;/g, m => decodeEntities(m))
    .replace(/&#x[0-9a-fA-F]+;/g, m => decodeEntities(m))
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n /g, '\n')
    .replace(/ \n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* ---------- Article Patterns ---------- */

/**
 * Guatemalan article heading patterns.
 *
 * Standard forms:
 *   Articulo 1.    / Art. 1.    / ARTICULO 1.
 *   Articulo 1.-   / Art. 1.-
 *   Articulo Unico
 */
const ARTICLE_PATTERNS = [
  /(?:^|\n)\s*(?:ART[ÍI]CULO|Art[íi]culo|ARTICULO|ART\.?)\s+((?:\d+[\s.]*(?:bis|ter)?|\d+[A-Z]?(?:\.\d+)?|[ÚU]NICO|[ÚU]nico|UNICO))\s*(?:[oOªº°]\.?)?\s*[.°º]*[-.:–]?\s*([^\n]*)/gimu,
];

const STRUCTURE_RE = /(?:^|\n)\s*((?:T[ÍI]TULO|TITULO|CAP[ÍI]TULO|CAPITULO|SECCI[ÓO]N|SECCION|DISPOSICION(?:ES)?(?:\s+(?:TRANSITORIAS?|FINALES?|DEROGATORIAS?|GENERALES?|COMPLEMENTARIAS?))?)\s+[IVXLC0-9]+[^\n]*)/gimu;

const DISPOSICIONES_RE = /(?:^|\n)\s*(DISPOSICION(?:ES)?\s+(?:TRANSITORIAS?|FINALES?|DEROGATORIAS?|GENERALES?|COMPLEMENTARIAS?))\s*$/gimu;

const DEFINITION_PATTERNS = [
  /se\s+(?:entiende|entender[áa])\s+por\s+"?([^".:,]+)"?\s*(?:,|:)\s*([^.]+\.)/gi,
  /a\s+los\s+efectos\s+de\s+(?:esta|la\s+presente)\s+(?:ley|norma)[^:]*:\s*\n?\s*(?:\d+[.)]\s*)?([^:–-]+)\s*[:–-]\s*([^.;]+[.;])/gim,
  /se\s+define(?:n)?\s+como\s+"?([^".:,]+)"?\s*(?:,|a|:)\s*([^.]+\.)/gi,
  /(?:^|\n)\s*\d+[.)]\s*([^:–.\n]{3,60})\s*[:–.]-?\s+([^.;]{20,}[.;])/gim,
];

/* ---------- Parsing ---------- */

function findLawTextStart(text: string): number {
  const startPatterns = [
    /\bEL\s+CONGRESO\s+DE\s+LA\s+REP[ÚU]BLICA\s+DE\s+GUATEMALA\b/i,
    /\bEL\s+CONGRESO\s+DE\s+LA\s+REP[ÚU]BLICA\b/i,
    /\bCONSIDERANDO\b/i,
    /\bDECRETA\s*:/i,
    /\bRESUELVE\s*:/i,
    /(?:^|\n)\s*(?:ART[ÍI]CULO|Art[íi]culo|ARTICULO)\s+(?:1|PRIMERO|[ÚU]NICO|UNICO)\s*[.°º]*[-.:–]/im,
  ];

  let earliestPos = text.length;
  for (const pattern of startPatterns) {
    const match = pattern.exec(text);
    if (match && match.index < earliestPos) {
      earliestPos = match.index;
    }
  }

  return earliestPos === text.length ? 0 : earliestPos;
}

export function parseGTLawText(text: string, act: ActIndexEntry): ParsedAct {
  const cleaned = htmlToText(text);
  const startIdx = findLawTextStart(cleaned);
  const lawText = cleaned.substring(startIdx);

  const provisions: ParsedProvision[] = [];
  const definitions: ParsedDefinition[] = [];

  interface Heading {
    ref: string;
    title: string;
    position: number;
  }

  const headings: Heading[] = [];

  for (const pattern of ARTICLE_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;

    while ((match = re.exec(lawText)) !== null) {
      const num = match[1].replace(/\s+/g, '').replace(/\.$/, '');
      const title = (match[2] ?? '').trim();
      const ref = `art${num.toLowerCase()}`;

      if (!headings.some(h => h.ref === ref && Math.abs(h.position - match!.index) < 20)) {
        headings.push({
          ref,
          title: title || `Art\u00edculo ${num}`,
          position: match.index,
        });
      }
    }
  }

  headings.sort((a, b) => a.position - b.position);

  const chapterPositions: { chapter: string; position: number }[] = [];

  const structRe = new RegExp(STRUCTURE_RE.source, STRUCTURE_RE.flags);
  let match: RegExpExecArray | null;
  while ((match = structRe.exec(lawText)) !== null) {
    chapterPositions.push({
      chapter: match[1].trim(),
      position: match.index,
    });
  }

  const dispRe = new RegExp(DISPOSICIONES_RE.source, DISPOSICIONES_RE.flags);
  while ((match = dispRe.exec(lawText)) !== null) {
    if (!chapterPositions.some(cp => Math.abs(cp.position - match!.index) < 10)) {
      chapterPositions.push({
        chapter: match[1].trim(),
        position: match.index,
      });
    }
  }

  chapterPositions.sort((a, b) => a.position - b.position);

  let currentChapter = '';
  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const nextHeading = headings[i + 1];
    const endPos = nextHeading ? nextHeading.position : lawText.length;
    const rawBlock = lawText.substring(heading.position, endPos).trim();

    for (const cp of chapterPositions) {
      if (cp.position <= heading.position) {
        currentChapter = cp.chapter;
      }
    }

    const cleanedBlock = rawBlock
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');

    if (cleanedBlock.length > 10) {
      provisions.push({
        provision_ref: heading.ref,
        chapter: currentChapter || undefined,
        section: currentChapter || act.title,
        title: heading.title,
        content: cleanedBlock,
      });
    }
  }

  for (const pattern of DEFINITION_PATTERNS) {
    const defRe = new RegExp(pattern.source, pattern.flags);
    while ((match = defRe.exec(lawText)) !== null) {
      const term = (match[1] ?? '').trim();
      const definition = (match[2] ?? '').trim();

      if (term.length > 2 && term.length < 100 && definition.length > 10) {
        let sourceProvision: string | undefined;
        for (let i = headings.length - 1; i >= 0; i--) {
          if (headings[i].position <= match.index) {
            sourceProvision = headings[i].ref;
            break;
          }
        }

        if (!definitions.some(d => d.term.toLowerCase() === term.toLowerCase())) {
          definitions.push({ term, definition, source_provision: sourceProvision });
        }
      }
    }
  }

  if (provisions.length === 0 && lawText.length > 50) {
    provisions.push({
      provision_ref: 'full-text',
      section: act.title,
      title: act.title,
      content: lawText.substring(0, 50000),
    });
  }

  return {
    id: act.id,
    type: 'statute',
    title: act.title,
    title_en: act.titleEn,
    short_name: act.shortName,
    status: act.status,
    issued_date: act.issuedDate,
    in_force_date: act.inForceDate,
    url: act.url,
    provisions,
    definitions,
  };
}

/* ---------- Wikitext parsing ---------- */

/**
 * Strip MediaWiki markup down to plain text while keeping article and
 * structural headings detectable by ARTICLE_PATTERNS / STRUCTURE_RE.
 *
 * We preserve text inside bold quotes ('''...''') which is how Wikisource
 * marks article headings on the Guatemala statutes. <ref>...</ref>
 * footnotes (cross-references to amendments) are stripped because they
 * would otherwise pollute the article body.
 */
function wikitextToText(wikitext: string): string {
  let t = wikitext;

  t = t.replace(/<ref\b[^>]*\/>/gi, '');
  t = t.replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, '');

  t = t.replace(/<!--[\s\S]*?-->/g, '');

  t = t.replace(/<\/?(span|center|small|big|sup|sub|u|s|strike|font|div|td|tr|table|tbody|thead|tfoot|noinclude|includeonly|onlyinclude|abbr|cite|code|pre|nowiki|gallery|imagemap|poem|references)\b[^>]*>/gi, '');
  t = t.replace(/<br\s*\/?\s*>/gi, '\n');

  t = t.replace(/\{\{[^{}\n]*\}\}/g, '');
  t = t.replace(/\{\{[\s\S]*?\}\}/g, '');

  t = t.replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, '$1');
  t = t.replace(/\[https?:\/\/\S+\s+([^\]]+)\]/g, '$1');
  t = t.replace(/\[https?:\/\/\S+\]/g, '');

  t = t.replace(/__[A-Z]+__/g, '');

  t = t.replace(/'''([^']+)'''/g, '$1');
  t = t.replace(/''([^']+)''/g, '$1');

  t = t.replace(/(^|\n)={2,6}\s*([^=\n]+?)\s*={2,6}\s*$/gm, (_, lead, body) => {
    return `${lead}== ${body.trim()} ==`;
  });

  t = t.replace(/(^|\n)[*#:;]+\s*/g, '$1');

  t = t.replace(/&nbsp;/g, ' ');
  t = decodeEntities(t);

  t = t.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  t = t.replace(/[ \t]+/g, ' ');
  t = t.replace(/ +\n/g, '\n').replace(/\n +/g, '\n');
  t = t.replace(/\n{3,}/g, '\n\n');

  return t.trim();
}

/**
 * Parse Wikisource Spanish-language wikitext for a Guatemalan statute.
 *
 * Articles are typically marked as `'''Artículo N.'''` or
 * `'''ARTICULO Nº.-'''` after wikitextToText flattens them to plain
 * `Artículo N.` markers, which ARTICLE_PATTERNS handles.
 */
export function parseGTLawWikitext(wikitext: string, act: ActIndexEntry): ParsedAct {
  const text = wikitextToText(wikitext);
  return parseGTLawText(text, act);
}

/* ---------- PDF text-layer parsing ---------- */

/**
 * Strip page-header / page-footer noise that repeats every page in PDF
 * extractions. We use simple frequency-based heuristics — a short line
 * that appears more than 5 times across the document is treated as a
 * page chrome line and removed.
 */
/**
 * Normalize PDF font-substitution glyphs back to Spanish characters.
 *
 * The Guatemala labour-code PDF (mintrabajo edition mirrored on WIPO Lex)
 * substitutes the digraph "tí" with U+01A1 (ơ), and "fi"/"ti" with other
 * private-use glyphs. Without this normalisation, "Artículo" becomes
 * "Arơculo" and the article patterns never match.
 */
function normalizePdfLigatures(text: string): string {
  return text
    .replace(/Arơculo/g, 'Artículo')
    .replace(/arơculo/g, 'artículo')
    .replace(/ơ/g, 'tí')
    .replace(/ﬀ/g, 'ff')
    .replace(/ﬁ/g, 'fi')
    .replace(/ﬂ/g, 'fl')
    .replace(/ﬃ/g, 'ffi')
    .replace(/ﬄ/g, 'ffl');
}

function stripPdfChrome(text: string): string {
  const lines = text.split('\n');
  const counts = new Map<string, number>();

  for (const raw of lines) {
    const line = raw.trim();
    if (line.length === 0 || line.length > 80) continue;
    if (/^\d+$/.test(line)) {
      counts.set('__pagenum__', (counts.get('__pagenum__') ?? 0) + 1);
      continue;
    }
    counts.set(line, (counts.get(line) ?? 0) + 1);
  }

  const noise = new Set<string>();
  for (const [line, count] of counts.entries()) {
    if (line === '__pagenum__') continue;
    if (count >= 5 && line.length <= 80) noise.add(line);
  }

  const cleaned: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (/^\d{1,4}$/.test(line)) continue;
    if (noise.has(line)) continue;
    cleaned.push(raw);
  }

  return cleaned.join('\n');
}

/**
 * Parse pdftotext output for a Guatemalan statute.
 *
 * Article headers vary across the corpus:
 *   - `ARTICULO 1.`     (Penal Code, UN scan — uppercase, no accent)
 *   - `Artículo 1.-`    (Procesal Penal, IDPP — mixed case, accent)
 *   - `ARTICULO 1.-`    (Civil Code, OAS — uppercase, no accent, dash)
 *
 * ARTICLE_PATTERNS already handles these via the case-insensitive
 * `(?:ART[ÍI]CULO|Art[íi]culo|ARTICULO|ART\.?)` group. We only need to
 * clean up page chrome before delegating to parseGTLawText.
 */
export function parseGTLawPdfText(text: string, act: ActIndexEntry): ParsedAct {
  const normalized = normalizePdfLigatures(text);
  const cleaned = stripPdfChrome(normalized);
  return parseGTLawText(cleaned, act);
}

/**
 * Parse raw HTML (as fetched from the portal) into a ParsedAct.
 */
export function parseGTLawHtml(html: string, act: ActIndexEntry): ParsedAct {
  let bodyHtml = html;

  const wrapperPatterns = [
    /<div[^>]*class=["'][^"']*(?:entry-content|law-content|post-content|article-content|content-body)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    /<div[^>]*id=["'](?:content|page-content|main-content)["'][^>]*>([\s\S]*?)<\/div>/i,
  ];

  for (const pattern of wrapperPatterns) {
    const m = pattern.exec(html);
    if (m && m[1] && m[1].length > 200) {
      bodyHtml = m[1];
      break;
    }
  }

  const text = htmlToText(bodyHtml);

  if (!text || text.trim().length < 50) {
    return {
      id: act.id,
      type: 'statute',
      title: act.title,
      title_en: act.titleEn,
      short_name: act.shortName,
      status: act.status,
      issued_date: act.issuedDate,
      in_force_date: act.inForceDate,
      url: act.url,
      provisions: [],
      definitions: [],
    };
  }

  return parseGTLawText(text, act);
}
