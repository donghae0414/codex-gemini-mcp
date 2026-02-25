# SRC KNOWLEDGE BASE

## OVERVIEW
`src/` is the implementation boundary: MCP protocol registration, provider argument mapping, CLI execution runtime, file-backed job state, and JSONL logging.

## STRUCTURE
```text
src/
├── mcp/        # tool registration + stdio entry points
├── tools/      # zod schemas + provider handlers
├── providers/  # CLI argument builders per provider
├── runtime/    # foreground/background process execution
├── logger/     # structured JSONL logging
├── config.ts   # env defaults, timeout clamp, runtime paths
├── prompt-store.ts
├── job-management.ts
└── types.ts
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Codex stdio entry | `src/mcp/codex-stdio-entry.ts` | codex-only stdio server |
| Gemini stdio entry | `src/mcp/gemini-stdio-entry.ts` | gemini-only stdio server |
| Input validation | `src/tools/schema.ts` | ask + job schemas (zod) |
| Ask handlers | `src/tools/codex-handlers.ts`, `src/tools/gemini-handlers.ts` | foreground/background branching |
| Provider handlers | `src/providers/codex.ts`, `src/providers/gemini.ts` | `build*Command`, `ask*` |
| Process handling | `src/runtime/run-cli.ts`, `src/runtime/run-cli-background.ts` | foreground + background execution |
| Job persistence | `src/prompt-store.ts` | prompt/response/status file I/O |
| Job APIs | `src/job-management.ts` | wait/check/kill/list logic |
| Logging | `src/logger/index.ts`, `src/logger/file-sink.ts`, `src/logger/event.ts` | request/response/error JSONL lifecycle |
| Runtime config | `src/config.ts` | timeout clamp, output cap, runtime dir resolution |
| Shared types | `src/types.ts` | ask + job types |

## CONVENTIONS
- Keep flow linear: `schema.ts` validation -> `*-handlers.ts` orchestration -> `providers/*` command building -> `runtime/*` execution.
- In tool handlers, return MCP text content on success and `isError: true` payloads on execution failures.
- Keep provider differences inside `src/providers/*`; handlers and runtimes stay provider-agnostic.
- In stdio entry files, write operational logs to `console.error` only.
- Keep output limiting and timeout logic inside `src/runtime/*` and `src/config.ts`, not in provider modules.

## ANTI-PATTERNS
- No direct `stdout` logging in runtime/tool paths (reserved for MCP protocol messages).
- No ad-hoc schema validation in handlers; validation belongs in `schema.ts`.
- No new persistence surfaces outside `.codex-gemini-mcp/{jobs,prompts,logs}` paths.
