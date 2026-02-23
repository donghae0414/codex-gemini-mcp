# SRC KNOWLEDGE BASE

## OVERVIEW
`src/` contains the complete MCP runtime for this minimal sample.

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Server bootstrap | `src/index.ts` | `Server` + `StdioServerTransport` |
| Input validation | `src/index.ts` | `AskSchema` (zod) |
| Tool behavior | `src/index.ts` | `askCodex`, `askGemini` |
| Process handling | `src/index.ts` | `runCli` |

## CONVENTIONS
- Keep tool inputs narrow and explicit.
- Return plain text content for successful calls.
- Return `isError: true` for validation or CLI errors.

## ANTI-PATTERNS
- No provider-specific business logic beyond argument mapping.
- No persistence side effects in `src/index.ts`.
- No mixed stdout logging.
