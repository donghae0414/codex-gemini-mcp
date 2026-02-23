# SRC KNOWLEDGE BASE

## OVERVIEW
`src/` contains the complete MCP runtime for this minimal sample. Provider-specific server entries are split under `src/mcp/`, CLI mapping is split under `src/providers/`, and Phase C background job flow is implemented.

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
| Shared types | `src/types.ts` | ask + job types |

## CONVENTIONS
- Keep tool inputs narrow and explicit.
- Return plain text content for successful calls.
- Return `isError: true` for validation or CLI errors.
- Use `server.registerTool(...)` (avoid deprecated `server.tool(...)`).
- Default timeout is 600000ms when `timeout_ms` is omitted.
- Background jobs write status under `.codex-gemini-mcp/jobs` and prompts/responses under `.codex-gemini-mcp/prompts`.

## ANTI-PATTERNS
- No provider-specific business logic beyond argument mapping.
- No persistence side effects in stdio entry files.
- No mixed stdout logging.
