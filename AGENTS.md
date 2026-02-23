# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-23T12:00:00+09:00
**Project:** codex-gemini-mcp-sample

## OVERVIEW
Minimal TypeScript MCP server. Forwards prompts to local `codex` and `gemini` CLIs through two tools.

## STRUCTURE
```text
./
├── src/              # MCP server implementation
├── README.md         # quick start
├── PROJECT.md        # concise architecture
├── TASKS.md          # task list
└── MCP_REVERSE_ENGINEERING.md  # reference-only, larger design
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| MCP tool schema | `src/index.ts` | `tools` array + zod schema |
| Tool dispatch | `src/index.ts` | `CallToolRequestSchema` handler |
| CLI execution | `src/index.ts` | `runCli` helper |
| Setup & usage | `README.md` | install/build/run + `.mcp.json` example |

## CONVENTIONS
- Keep implementation minimal and single-file unless complexity requires split.
- Log only via `console.error` (stdout is MCP protocol channel).
- No background jobs/persistence in baseline sample.

## ANTI-PATTERNS
- Do not print debug logs to stdout.
- Do not introduce complex orchestration layers in this sample.
- Do not couple to OMC-specific runtime pieces.

## COMMANDS
```bash
npm install
npm run typecheck
npm run build
npm start
```

## NOTES
- `MCP_REVERSE_ENGINEERING.md` is intentionally broader; sample stays lean.
