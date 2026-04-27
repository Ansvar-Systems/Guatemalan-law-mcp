# Guatemalan Law MCP Server

**Guatemalan legislation, AI-native and citation-grade.**

[![npm version](https://badge.fury.io/js/@ansvar%2Fguatemalan-law-mcp.svg)](https://www.npmjs.com/package/@ansvar/guatemalan-law-mcp)
[![MCP Registry](https://img.shields.io/badge/MCP-Registry-blue)](https://registry.modelcontextprotocol.io)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![GitHub stars](https://img.shields.io/github/stars/Ansvar-Systems/Guatemalan-law-mcp?style=social)](https://github.com/Ansvar-Systems/Guatemalan-law-mcp)
[![CI](https://github.com/Ansvar-Systems/Guatemalan-law-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Ansvar-Systems/Guatemalan-law-mcp/actions/workflows/ci.yml)
[![Status](https://img.shields.io/badge/status-partial_corpus_v1-orange)]()

Query the **8 primary national codes and the 1985 Constitution of Guatemala** -- including the Código Civil, Código Penal, Código de Comercio, Código de Trabajo, Código Procesal Penal, Código Tributario, and the Ley Electoral -- directly from Claude, Cursor, or any MCP-compatible client.

If you're building legal tech, compliance tools, or doing Guatemalan legal research, this is your verified reference database.

Built by [Ansvar Systems](https://ansvar.eu) -- Stockholm, Sweden

---

## Por Qué Existe Esto

La investigación jurídica guatemalteca está dispersa entre el Diario de Centro América, el Centro Nacional de Análisis y Documentación Judicial (CENADOJ), portales como Guatemala Justia, y los propios sitios del Ministerio de Gobernación y el Organismo Judicial. Tanto si eres:

- Un **abogado** validando citas en un escrito o contrato
- Un **oficial de cumplimiento** verificando obligaciones bajo la Ley de Bancos o la Ley de Protección al Consumidor
- Un **desarrollador de legaltech** construyendo herramientas sobre la legislación guatemalteca
- Un **investigador** que rastrea el historial legislativo de una norma

...no deberías necesitar decenas de pestañas del navegador y referencias manuales en PDF. Pregúntale a Claude. Obtén la provisión exacta. Con contexto.

Este servidor MCP hace que la legislación guatemalteca sea **buscable, referenciable y legible por IA**.

---

## Quick Start

### Use via Ansvar MCP Gateway (B2B)

For multi-jurisdiction legal-research workloads, route through the Ansvar MCP Gateway at `https://gateway.ansvar.eu` (OAuth, paid tier). The gateway exposes this MCP alongside 360+ other regulatory and legal sources behind a single `search` interface.

### Use Locally (npm)

```bash
npx @ansvar/guatemalan-law-mcp
```

**Claude Desktop** -- add to `claude_desktop_config.json`:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "guatemalan-law": {
      "command": "npx",
      "args": ["-y", "@ansvar/guatemalan-law-mcp"]
    }
  }
}
```

**Cursor / VS Code:**

```json
{
  "mcp.servers": {
    "guatemalan-law": {
      "command": "npx",
      "args": ["-y", "@ansvar/guatemalan-law-mcp"]
    }
  }
}
```

---

## Example Queries

Una vez conectado, simplemente pregunta de forma natural:

- *"¿Qué dice el artículo 1519 del Código Civil guatemalteco sobre los contratos?"*
- *"¿Está vigente la Ley de Protección al Consumidor y Usuario?"*
- *"Encuentra disposiciones sobre lavado de dinero en la legislación guatemalteca"*
- *"¿Qué dice el Código de Comercio sobre las sociedades anónimas?"*
- *"¿Cuáles son las obligaciones de un banco según la Ley de Bancos y Grupos Financieros?"*
- *"¿Qué dice la Ley contra la Narcoactividad sobre las penas aplicables?"*
- *"Valida la cita 'Artículo 5 de la Ley de Amparo, Exhibición Personal y de Constitucionalidad'"*
- *"Construye una postura legal sobre los derechos del trabajador bajo el Código de Trabajo guatemalteco"*
- *"¿Qué establece la Constitución Política de la República sobre los derechos individuales?"*

---

## Coverage

This MCP serves the 8 primary national codes and the 1985 Constitution of Guatemala from open public sources (WIPO Lex, ILO NATLEX, congreso.gob.gt, un.org, OAS DIL, Spanish Wikisource). It is a partial-corpus (Tier D) product.

| Instrument | Source | Articles |
|---|---|---|
| Constitución Política 1985 | Spanish Wikisource | ~280 |
| Código Penal (Decreto 17-73) | UN DOALOS | ~500 |
| Código Procesal Penal (Decreto 51-92) | IDPP biblioteca virtual | ~555 |
| Código Civil (Decreto-Ley 106) | OAS DIL | ~2,090 |
| Código de Trabajo (Decreto 1441) | WIPO Lex (via Internet Archive) | ~415 |
| Código de Comercio (Decreto 2-70) | WIPO Lex (via Internet Archive) | ~1,225 |
| Código Tributario (Decreto-Ley 6-91) | Spanish Wikisource | ~190 |
| Ley Electoral (Decreto 1-85) | Spanish Wikisource | ~280 |

**Total:** 8 documents, 5,500+ provisions, 80+ definitions. All instruments are tagged `confidence_tier: blue` (text-layered primary sources, no OCR).

### NOT covered

- **The official consolidated gazette (oj.gob.gt / CENADOJ)** -- geo-gated to Guatemalan IPs and not accessible from our infrastructure. Customers requiring authoritative consolidated text including amendments not reflected in our snapshots should consult CENADOJ directly.
- **Case law** (Corte de Constitucionalidad, Corte Suprema de Justicia jurisprudence).
- **Agency guidance / regulatory opinions.**
- **Decree-level instruments outside the 8 listed codes.**
- **Subnational regulation, municipal codes.**

**Snapshot date:** Each instrument is dated to its retrieval source; consolidated amendments after that date are NOT applied. Verify against CENADOJ for litigation-grade use.

**Verified data only** -- every citation is validated against the source documents listed above. Zero LLM-generated content.

---

## See It In Action

### Why This Works

**Verbatim Source Text (No LLM Processing):**
- All statute text is ingested from open public sources (see [`sources.yml`](./sources.yml))
- Provisions are returned **unchanged** from SQLite FTS5 database rows
- Zero LLM summarization or paraphrasing -- the database contains legislation text, not AI interpretations

**Smart Context Management:**
- Search returns ranked provisions with BM25 scoring (safe for context)
- Provision retrieval gives exact text by statute name and article number
- Cross-references help navigate without loading everything at once

**Technical Architecture:**
```
Open public sources --> Parse --> SQLite --> FTS5 snippet() --> MCP response
       ^                              ^
Wikitext / PDF parsers          Verbatim database query
```

### Traditional Research vs. This MCP

| Traditional Approach | This MCP Server |
|---------------------|-----------------|
| Search by statute name across multiple PDFs | Search by plain Spanish: *"contrato compraventa"* |
| Navigate multi-article codes manually | Get the exact provision with context |
| Manual cross-referencing between laws | `build_legal_stance` aggregates across sources |
| "¿Está vigente esta ley?" -- check manually | `check_currency` tool -- answer in seconds |
| Find OAS/SICA basis -- dig through documents | `get_eu_basis` -- linked frameworks instantly |
| No API, no integration | MCP protocol -- AI-native |

**Traditional:** Search portals --> Download PDF --> Ctrl+F --> Cross-reference with Diario de Centro América --> Verify with CENADOJ --> Repeat

**This MCP:** *"¿Cuáles son los requisitos para constituir una sociedad anónima en Guatemala según el Código de Comercio?"* --> Done.

---

## Available Tools (13)

### Core Legal Research Tools (8)

| Tool | Description |
|------|-------------|
| `search_legislation` | FTS5 full-text search across provisions with BM25 ranking. Supports quoted phrases, boolean operators, prefix wildcards |
| `get_provision` | Retrieve specific provision by statute name and article number |
| `check_currency` | Check if a statute is in force, amended, or repealed |
| `validate_citation` | Validate citation against database -- zero-hallucination check |
| `build_legal_stance` | Aggregate citations from multiple statutes for a legal topic |
| `format_citation` | Format citations per Guatemalan legal conventions (full/short/pinpoint) |
| `list_sources` | List the 8 ingested instruments with metadata, coverage scope, and data provenance |
| `about` | Server info, capabilities, dataset statistics, and coverage summary |

### International Law Integration Tools (5)

| Tool | Description |
|------|-------------|
| `get_eu_basis` | Get international frameworks (OAS, SICA, DR-CAFTA) that a Guatemalan statute aligns with |
| `get_guatemalan_implementations` | Find Guatemalan laws implementing a specific international convention or treaty |
| `search_eu_implementations` | Search international documents with Guatemalan implementation counts |
| `get_provision_eu_basis` | Get international law references for a specific provision |
| `validate_eu_compliance` | Check alignment status of Guatemalan statutes against international frameworks |

---

## International Law Alignment

Guatemala is a member of the Central American Integration System (SICA) and the OAS, with significant international treaty obligations:

- **SICA (Sistema de la Integración Centroamericana):** Guatemala is a founding SICA member. SICA decisions on trade, customs, and economic integration bind domestic law
- **DR-CAFTA:** The Dominican Republic-Central America-United States Free Trade Agreement requires Guatemala to maintain intellectual property protections, labor standards, and dispute resolution mechanisms aligned with US and international standards
- **OAS (Organization of American States):** Guatemala has ratified OAS conventions including the Inter-American Convention against Corruption (IACAC), which is implemented in the Ley contra la Corrupción
- **FATF/GAFILAT:** Guatemala implements FATF recommendations through the Ley contra el Lavado de Dinero u Otros Activos and the Ley de Extinción de Dominio
- **UN Conventions:** Guatemala has ratified UNCAC, UNCLOS, and major UN human rights conventions

The international alignment tools allow you to explore these relationships -- checking which Guatemalan provisions correspond to treaty obligations, and vice versa.

> **Note:** International cross-references reflect alignment and implementation relationships. Guatemala adopts its own legislative approach through the Congreso de la República.

---

## Data Sources & Freshness

All content is sourced from open public legal databases. See [`sources.yml`](./sources.yml) for the full per-instrument provenance record (authority, retrieval method, license).

- **Spanish Wikisource** -- Constitución 1985, Código Tributario, Ley Electoral
- **UN DOALOS** -- Código Penal
- **OAS DIL** -- Código Civil
- **IDPP biblioteca virtual** -- Código Procesal Penal
- **WIPO Lex (via Internet Archive)** -- Código de Trabajo, Código de Comercio

### Data Provenance

| Field | Value |
|-------|-------|
| **Authority** | Congreso de la República de Guatemala (texts in the public domain) |
| **Retrieval method** | Per-source: MediaWiki `action=raw` for Wikisource entries; direct PDF download elsewhere |
| **Language** | Spanish |
| **Coverage** | 8 primary national codes + 1985 Constitution (Tier D partial corpus) |
| **Confidence tier** | All provisions tagged `blue` (text-layered primary sources, no OCR) |

### Automated Freshness Checks

A GitHub Actions workflow monitors for statute changes and amendments:

| Check | Method |
|-------|--------|
| **Statute amendments** | Drift detection against known provision anchors |
| **New statutes** | Comparison against source index |
| **Repealed statutes** | Status change detection |

**Verified data only** -- every citation is validated against official sources. Zero LLM-generated content.

---

## Security

This project uses multiple layers of automated security scanning:

| Scanner | What It Does | Schedule |
|---------|-------------|----------|
| **CodeQL** | Static analysis for security vulnerabilities | Weekly + PRs |
| **Semgrep** | SAST scanning (OWASP top 10, secrets, TypeScript) | Every push |
| **Gitleaks** | Secret detection across git history | Every push |
| **Trivy** | CVE scanning on filesystem and npm dependencies | Daily |
| **Docker Security** | Container image scanning + SBOM generation | Daily |
| **Socket.dev** | Supply chain attack detection | PRs |
| **OSSF Scorecard** | OpenSSF best practices scoring | Weekly |
| **Dependabot** | Automated dependency updates | Weekly |

See [SECURITY.md](SECURITY.md) for the full policy and vulnerability reporting.

---

## Important Disclaimers

### Legal Advice

> **THIS TOOL IS NOT LEGAL ADVICE**
>
> Statute text is sourced from open public publications of Guatemalan legislation (see `sources.yml` for per-instrument provenance). However:
> - This is a **research tool**, not a substitute for professional legal counsel
> - **Court case coverage is not included** -- do not rely solely on this for case law research
> - **Verify critical citations** against the Diario de Centro América / CENADOJ for court filings
> - **International cross-references** reflect alignment relationships, not direct transposition
> - **Municipal regulations and reglamentos** are not included -- this covers the 8 priority national codes plus the 1985 Constitution
> - **Each instrument is dated to its retrieval source** -- consolidated amendments published after that date are not applied

For professional legal advice in Guatemala, consult a member of the **Colegio de Abogados y Notarios de Guatemala**.

**Before using professionally, read:** [DISCLAIMER.md](DISCLAIMER.md) | [SECURITY.md](SECURITY.md)

### Client Confidentiality

Queries go through the Claude API. For privileged or confidential matters, use on-premise deployment.

---

## Development

### Setup

```bash
git clone https://github.com/Ansvar-Systems/Guatemalan-law-mcp
cd Guatemalan-law-mcp
npm install
npm run build
npm test
```

### Running Locally

```bash
npm run dev                                            # Start MCP server
npx @anthropic/mcp-inspector node dist/src/index.js   # Test with MCP Inspector
```

### Data Management

```bash
npm run census          # Seed data/census.json from scripts/lib/sources.ts
npm run ingest          # Fetch and parse the 8 primary instruments
npm run ingest -- --source-id codigo-penal-17-73   # Ingest one instrument
npm run ingest -- --force                          # Re-ingest all
npm run build:db        # Rebuild SQLite database from data/seed/*.json
npm run drift:detect    # Run drift detection against anchors
npm run check-updates   # Check for amendments and new statutes
```

### Performance

- **Search Speed:** <100ms for most FTS5 queries
- **Reliability:** All 8 priority instruments verified end-to-end on each ingest run

---

## Related Projects: Complete Compliance Suite

This server is part of **Ansvar's Compliance Suite** -- MCP servers that work together for end-to-end compliance coverage:

### [@ansvar/eu-regulations-mcp](https://github.com/Ansvar-Systems/EU_compliance_MCP)
**Query 49 EU regulations directly from Claude** -- GDPR, AI Act, DORA, NIS2, MiFID II, eIDAS, and more. Full regulatory text with article-level search. `npx @ansvar/eu-regulations-mcp`

### [@ansvar/us-regulations-mcp](https://github.com/Ansvar-Systems/US_Compliance_MCP)
**Query US federal and state compliance laws** -- HIPAA, CCPA, SOX, GLBA, FERPA, and more. `npx @ansvar/us-regulations-mcp`

### [@ansvar/bolivian-law-mcp](https://github.com/Ansvar-Systems/Bolivian-law-mcp)
**Query Bolivian legislation** -- 2,497 Bolivian statutes with 25,002 provisions. `npx @ansvar/bolivian-law-mcp`

### [@ansvar/salvadoran-law-mcp](https://github.com/Ansvar-Systems/Salvadoran-law-mcp)
**Query Salvadoran legislation** -- Central American neighbor with shared legal framework roots. `npx @ansvar/salvadoran-law-mcp`

**70+ national law MCPs** covering Australia, Brazil, Canada, Chile, Colombia, Denmark, Ecuador, Finland, France, Germany, Ghana, India, Ireland, Japan, Kenya, Mexico, Netherlands, Nigeria, Norway, Panama, Peru, Singapore, Sweden, UK, and more.

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Priority areas:
- Court case law (Corte de Constitucionalidad decisions)
- CENADOJ full-text integration (currently blocked by IP geo-gating)
- Historical statute versions and amendment tracking
- Decree-level instruments outside the 8 priority codes

---

## Roadmap

- [x] Server infrastructure and all 13 tools
- [x] International law alignment tools
- [x] Partial-corpus v1: 8 primary codes + 1985 Constitution (5,500+ provisions)
- [ ] Court case law (Corte de Constitucionalidad)
- [ ] CENADOJ full-text integration (blocked by IP geo-gating)
- [ ] Historical statute versions (amendment tracking)
- [ ] Decree-level instruments outside the 8 priority codes

---

## Citation

If you use this MCP server in academic research:

```bibtex
@software{guatemalan_law_mcp_2026,
  author = {Ansvar Systems AB},
  title = {Guatemalan Law MCP Server: AI-Powered Legal Research Tool},
  year = {2026},
  url = {https://github.com/Ansvar-Systems/Guatemalan-law-mcp},
  note = {Partial-corpus (Tier D) covering 8 primary national codes and the 1985 Constitution; CENADOJ consolidated gazette is geo-gated and out of scope}
}
```

---

## License

Apache License 2.0. See [LICENSE](./LICENSE) for details.

### Data Licenses

- **Statutes & Legislation:** Guatemalan Government (public domain); Wikisource entries additionally licensed CC BY-SA 4.0
- **International Metadata:** OAS, SICA (public domain)

---

## About Ansvar Systems

We build AI-accelerated compliance and legal research tools for the global market. This MCP server started as our internal reference tool for Central American law -- turns out everyone building compliance tools for the region has the same research frustrations.

So we're open-sourcing it. Navigating Guatemalan legislation shouldn't require manual cross-referencing across the Diario de Centro América and CENADOJ.

**[ansvar.eu](https://ansvar.eu)** -- Stockholm, Sweden

---

<p align="center">
  <sub>Built with care in Stockholm, Sweden</sub>
</p>
