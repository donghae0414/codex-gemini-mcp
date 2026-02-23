# Project Overview

## Goal

Create the simplest possible TypeScript MCP server that forwards prompts to Codex CLI and Gemini CLI.

## Design

- Single runtime entrypoint: `src/index.ts`
- Two MCP tools only: `ask_codex`, `ask_gemini`
- Input validation: `zod`
- Transport: stdio (`@modelcontextprotocol/sdk`)
- No persistence layer
- No background jobs

## Directory Layout

```text
.
├── src/
│   └── index.ts
├── README.md
├── PROJECT.md
├── TASKS.md
├── AGENTS.md
├── package.json
└── tsconfig.json
```

## Operational Notes

- Use `console.error` for logs to avoid corrupting MCP JSON-RPC output stream.
- CLI output is returned as text 그대로 전달.
- Timeout defaults to 120s if not provided.
