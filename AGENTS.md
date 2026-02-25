# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-25T19:13:00+09:00
**Commit:** 2dadb48
**Branch:** main
**Project:** codex-gemini-mcp

## OVERVIEW
CLI-only TypeScript MCP server that proxies local `codex` and `gemini` CLIs. Main concerns are strict input validation, foreground/background execution, file-backed job persistence, and structured JSONL logging.

## STRUCTURE
```text
./
├── src/
│   ├── mcp/            # MCP server registration + stdio entrypoints
│   ├── tools/          # zod schemas + provider handlers
│   ├── providers/      # CLI argument builders per provider
│   ├── runtime/        # foreground/background child_process execution
│   ├── logger/         # JSONL request/response/error logging
│   ├── config.ts       # env defaults, caps, path resolution
│   ├── prompt-store.ts # jobs/prompts file persistence helpers
│   ├── job-management.ts
│   └── types.ts
├── src/AGENTS.md       # src-specific map and constraints
├── README.md
├── package.json
└── tsconfig.json
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Codex MCP tools | `src/mcp/codex-server.ts` | registers `ask_codex` + job tools |
| Gemini MCP tools | `src/mcp/gemini-server.ts` | registers `ask_gemini` + job tools |
| Stdio startup | `src/mcp/codex-stdio-entry.ts`, `src/mcp/gemini-stdio-entry.ts` | stdio transport + startup logs to stderr |
| Input validation | `src/tools/schema.ts` | model regex, job-id schema, enum constraints |
| Ask orchestration | `src/tools/codex-handlers.ts`, `src/tools/gemini-handlers.ts` | foreground/background branch point |
| Provider command mapping | `src/providers/codex.ts`, `src/providers/gemini.ts` | CLI args and provider defaults |
| Foreground runtime | `src/runtime/run-cli.ts` | timeout, output cap, terminal error mapping |
| Background runtime | `src/runtime/run-cli-background.ts` | detached process + status transitions |
| Job persistence | `src/prompt-store.ts` | atomic JSON writes, file discovery by job id |
| Job APIs | `src/job-management.ts` | wait/check/kill/list behavior |
| Logging pipeline | `src/logger/index.ts`, `src/logger/file-sink.ts`, `src/logger/event.ts` | JSONL file write + stderr mirror |
| Runtime/env config | `src/config.ts` | timeout clamp, output cap, runtime paths |

## CODE MAP
| Symbol | Type | Location | Refs | Role |
|--------|------|----------|------|------|
| `createCodexServer` | function | `src/mcp/codex-server.ts` | 3 | Codex MCP tool registration root |
| `runCliBackground` | function | `src/runtime/run-cli-background.ts` | 5 | detached process + persisted status lifecycle |
| `AskCodexSchema` | schema | `src/tools/schema.ts` | 4 | strict input guard for `ask_codex` |

## CONVENTIONS
- Keep module boundaries narrow: protocol (`src/mcp`) -> handlers (`src/tools`) -> providers/runtime.
- Use `server.registerTool(...)`; return text content on success and `isError: true` on failures.
- Reserve stdout for MCP protocol; operational logs go to `console.error`.
- Run child processes with `NO_COLOR=1`, `FORCE_COLOR=0`, `TERM=dumb` for stable text capture.
- Background artifacts live under `.codex-gemini-mcp/` (`jobs/`, `prompts/`, `logs/`) unless overridden by `MCP_RUNTIME_DIR`/`MCP_LOG_DIR`.
- Default timeout is 3600000ms (clamped min 300000 / max 3600000); default output cap is 1048576 bytes.

## ANTI-PATTERNS (PROJECT-SPECIFIC)
- Do not write logs/debug text to stdout.
- Do not add orchestration layers beyond this lean proxy shape.
- Do not mix provider-specific business logic outside `src/providers/*` and provider handlers.
- Do not store secrets in prompts when using background mode (prompt/response content is persisted locally).

## UNIQUE STYLES
- Dual-server packaging: one repo ships two MCP binaries (`codex-mcp`, `gemini-mcp`) with mirrored tool surfaces.
- Background-first ask flow: `ask_*` defaults to `background: true`, then managed via explicit job APIs.
- File-backed observability: request/response/error lifecycle is tracked through both JSON status/content files and JSONL logs.

## COMMANDS
```bash
npm install
npm run typecheck
npm run build
npm run dev:codex
npm run dev:gemini
npm run start:codex
npm run start:gemini
```

## NOTES
- Requires Node.js >= 20 and installed/authenticated CLIs: `codex`, `gemini`.
- Binary entries from package bin map to `dist/mcp/codex-stdio-entry.js` and `dist/mcp/gemini-stdio-entry.js`.
- Model override precedence: request model -> environment default (`MCP_*_DEFAULT_MODEL`) -> hardcoded default.
- If CLI output exceeds `MCP_MAX_OUTPUT_BYTES`, runtime returns `CLI_OUTPUT_LIMIT_EXCEEDED`.
- No CI workflow or automated test suite is present; safety checks are `typecheck` + `build` + manual runtime validation.
