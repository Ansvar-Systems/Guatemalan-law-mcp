# Guatemala Law MCP

## Quick Reference

- **Jurisdiction**: Guatemala (GT)
- **Source**: cenadoj.gob.gt
- **Language**: Spanish
- **Tools**: 8 core (non-EU jurisdiction)
- **Template**: Dominican-law-mcp

## Development

```bash
npm run census     # Enumerate laws from cenadoj.gob.gt
npm run ingest     # Download full text
npm run build:db   # Build SQLite DB
npm run build      # Compile TS
npm test           # Run tests
```

## Status

- [ ] Census script customized for cenadoj.gob.gt
- [ ] Ingestion script customized
- [ ] Database built
- [ ] Tests passing
- [ ] Deployed to Vercel
- [ ] Published to npm
