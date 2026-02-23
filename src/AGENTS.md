# SRC KNOWLEDGE BASE

## OVERVIEW
`src/` contains the complete MCP runtime for this minimal sample. Provider-specific server entries are split under `src/mcp/` and CLI mapping is split under `src/providers/`.

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Codex standalone bootstrap | `src/mcp/codex-standalone-server.ts` | codex-only stdio server |
| Gemini standalone bootstrap | `src/mcp/gemini-standalone-server.ts` | gemini-only stdio server |
| Input validation | `src/tools/schema.ts` | `AskSchema` (zod) |
| Provider handlers | `src/providers/codex.ts`, `src/providers/gemini.ts` | `askCodex`, `askGemini` |
| Process handling | `src/runtime/run-cli.ts` | `runCli` |
| Shared types | `src/types.ts` | `AskInput` |

## CONVENTIONS
- Keep tool inputs narrow and explicit.
- Return plain text content for successful calls.
- Return `isError: true` for validation or CLI errors.
- Use `server.registerTool(...)` (avoid deprecated `server.tool(...)`).
- Default timeout is 600000ms when `timeout_ms` is omitted.

## ANTI-PATTERNS
- No provider-specific business logic beyond argument mapping.
- No persistence side effects in standalone entry files.
- No mixed stdout logging.
