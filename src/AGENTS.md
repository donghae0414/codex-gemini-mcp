# SRC KNOWLEDGE BASE

## OVERVIEW
`src/` contains the complete MCP runtime for this minimal sample. Core concerns are partially split (`types`, `tools/schema`, `runtime/run-cli`) while server bootstrap remains in `src/index.ts`.

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Server bootstrap | `src/index.ts` | `Server` + `StdioServerTransport` |
| Input validation | `src/tools/schema.ts` | `AskSchema` (zod) |
| Tool behavior | `src/index.ts` | `askCodex`, `askGemini` |
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
- No persistence side effects in `src/index.ts`.
- No mixed stdout logging.
