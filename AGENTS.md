# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-24T22:10:00+09:00
**Project:** codex-gemini-mcp-sample

## OVERVIEW
Minimal TypeScript MCP server. Forwards prompts to local `codex` and `gemini` CLIs through provider-specific tools. Phase E core hardening is applied (model validation + output cap + standardized runtime error codes).

## STRUCTURE
```text
./
├── src/              # MCP server implementation
│   ├── mcp/          # provider-specific MCP servers + stdio entry files
│   ├── providers/    # provider-specific CLI argument builders
│   ├── tools/        # schemas + provider handlers
│   ├── runtime/      # foreground/background CLI execution
│   ├── prompt-store.ts    # prompt/response/status file persistence
│   ├── job-management.ts  # wait/check/kill/list logic
│   └── types.ts      # shared ask/job types
├── README.md         # quick start
└── MCP_REVERSE_ENGINEERING.md  # reference-only, larger design
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Codex MCP server | `src/mcp/codex-server.ts` | `createCodexServer()` |
| Gemini MCP server | `src/mcp/gemini-server.ts` | `createGeminiServer()` |
| Stdio entries | `src/mcp/*-stdio-entry.ts` | stdio transport entrypoint |
| Input validation schema | `src/tools/schema.ts` | ask + job schemas |
| Ask handlers | `src/tools/*-handlers.ts` | foreground/background branching |
| Provider CLI mapping | `src/providers/*.ts` | `build*Command`, `ask*` |
| CLI execution | `src/runtime/run-cli.ts`, `src/runtime/run-cli-background.ts` | foreground/background runtime |
| Job state persistence | `src/prompt-store.ts` | prompt/response/status file I/O |
| Job tool logic | `src/job-management.ts` | wait/check/kill/list implementation |
| Setup & usage | `README.md` | install/build/run + `.mcp.json` example |

## CONVENTIONS
- Keep implementation minimal; prefer small modules for shared concerns.
- Log only via `console.error` (stdout is MCP protocol channel).
- Background jobs persist status in `.codex-gemini-mcp/jobs` and prompts/responses in `.codex-gemini-mcp/prompts`.
- Default CLI timeout is 600000ms (10 minutes).
- Default max output is 1048576 bytes (1 MiB), enforced across foreground/background runtime.

## ANTI-PATTERNS
- Do not print debug logs to stdout.
- Do not introduce complex orchestration layers in this sample.
- Do not couple to OMC-specific runtime pieces.

## COMMANDS
```bash
npm install
npm run typecheck
npm run build
npm run start:codex
npm run start:gemini
```

## NOTES
- `MCP_REVERSE_ENGINEERING.md` is intentionally broader; sample stays lean.
