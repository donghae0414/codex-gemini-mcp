# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-23T12:00:00+09:00
**Project:** codex-gemini-mcp-sample

## OVERVIEW
Minimal TypeScript MCP server. Forwards prompts to local `codex` and `gemini` CLIs through two tools. Phase A first split is applied (`src/types.ts`, `src/tools/schema.ts`, `src/runtime/run-cli.ts`).

## STRUCTURE
```text
./
├── src/              # MCP server implementation
│   ├── index.ts      # stdio entry + tool registration
│   ├── types.ts      # shared input types
│   ├── tools/        # zod schemas
│   └── runtime/      # CLI execution runtime
├── README.md         # quick start
├── PROJECT.md        # concise architecture
├── TASKS.md          # task list
└── MCP_REVERSE_ENGINEERING.md  # reference-only, larger design
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| MCP tool registration | `src/index.ts` | `server.registerTool(...)` |
| Input validation schema | `src/tools/schema.ts` | `AskSchema` |
| CLI execution | `src/runtime/run-cli.ts` | `runCli` helper |
| Setup & usage | `README.md` | install/build/run + `.mcp.json` example |

## CONVENTIONS
- Keep implementation minimal; prefer small modules for shared concerns.
- Log only via `console.error` (stdout is MCP protocol channel).
- No background jobs/persistence in baseline sample.
- Default CLI timeout is 600000ms (10 minutes).

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
