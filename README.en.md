**🌐 Language: [한국어](README.md) | English**

# codex-gemini-mcp

A proxy server that lets AI agents (Claude, Cursor, etc.) call **OpenAI Codex CLI** and **Google Gemini CLI** directly as MCP tools.

## Key Features

- **`ask_codex`** — Have your agent request code generation, refactoring, and debugging from Codex
- **`ask_gemini`** — Have your agent request analysis, summarization, and code review from Gemini
- **Background execution** — Run long-running tasks in the background and manage them with `check_job_status`, `wait_for_job`, `kill_job`, and `list_jobs`
- **Multi-model orchestration** — A single agent can leverage both Codex and Gemini simultaneously for task distribution

Ships two MCP server binaries — `codex-mcp` and `gemini-mcp` — from a single package, communicating over stdio transport.

## Requirements

- Node.js 20+
- `codex` CLI installed (`npm i -g @openai/codex`)
- `gemini` CLI installed (`npm i -g @google/gemini-cli`)

The MCP servers invoke each CLI directly, so make sure you have completed login/authentication and can run `codex` / `gemini` from your local terminal.

## Install

Install from npm (if published):

```bash
npm i -g @donghae0414/codex-gemini-mcp
```

Without global install, using npx:

```bash
npx -y -p @donghae0414/codex-gemini-mcp codex-mcp
npx -y -p @donghae0414/codex-gemini-mcp gemini-mcp
```

Install from source (development/testing):

```bash
npm install
npm run build
npm link
```

## MCP Configuration Examples by Client

Global install:

```json
{
  "mcpServers": {
    "codex-mcp": {
      "command": "codex-mcp",
      "args": []
    },
    "gemini-mcp": {
      "command": "gemini-mcp",
      "args": []
    }
  }
}
```

Without global install (npx):

```json
{
  "mcpServers": {
    "codex-mcp": {
      "command": "npx",
      "args": ["-y", "-p", "@donghae0414/codex-gemini-mcp", "codex-mcp"]
    },
    "gemini-mcp": {
      "command": "npx",
      "args": ["-y", "-p", "@donghae0414/codex-gemini-mcp", "gemini-mcp"]
    }
  }
}
```

opencode (`opencode.json`):

```json
{
  "mcp": {
    "codex-mcp": {
      "type": "local",
      "command": ["npx", "-y", "-p", "@donghae0414/codex-gemini-mcp", "codex-mcp"]
    },
    "gemini-mcp": {
      "type": "local",
      "command": ["npx", "-y", "-p", "@donghae0414/codex-gemini-mcp", "gemini-mcp"]
    }
  }
}
```

Client config file locations (reference):

- Claude Code: `.mcp.json` in project root (per-project) or `~/.claude.json` (global)
- Claude Desktop (macOS): `~/Library/Application Support/Claude/claude_desktop_config.json`
- Claude Desktop (Windows): `%APPDATA%\Claude\claude_desktop_config.json`
- Claude Desktop (Linux): `~/.config/Claude/claude_desktop_config.json`
- opencode: `~/.config/opencode/opencode.json`

Environment variables may not be automatically injected from your shell profile (`.zshrc`, etc.). When possible, pass them via the `env` block in your config file.

## Default Models

Default models are hardcoded in `src/config.ts` and can be overridden via environment variables.

| Provider | Default Model | Env Override |
|----------|---------------|--------------|
| codex | `gpt-5.3-codex` | `MCP_CODEX_DEFAULT_MODEL` |
| gemini | `gemini-3-pro-preview` | `MCP_GEMINI_DEFAULT_MODEL` |

Model selection priority: **request `model` param** > **env variable** > **hardcoded default**

## Local development

```bash
npm install
npm run build
npm run start:codex
npm run start:gemini
```

Dev mode:

```bash
npm run dev:codex
npm run dev:gemini
```

## Runtime Files

- Default runtime directory: `<cwd>/.codex-gemini-mcp/`
  - Background job status: `jobs/`
  - Background job I/O (content): `prompts/`
  - Structured logging (JSONL): `logs/`
- Runtime path overrides:
  - `MCP_RUNTIME_DIR`: runtime root directory
  - `MCP_LOG_DIR`: log directory

Cleanup (when using default paths):

```bash
rm -rf .codex-gemini-mcp
```

## Security / Privacy Notes

- Requests with `background: true` (the default) store prompt/response in `.codex-gemini-mcp/prompts/*content*.json`.
- If you include secrets (tokens, passwords, personal data, etc.) in prompts, they may persist in local files.
- Logging excludes body content by default, but enabling the following flags will include text in logs:
  - `MCP_LOG_PREVIEW=1`
  - `MCP_LOG_FULL_TEXT=1`

## Tool Schemas

### ask_codex

- `prompt` (string, required)
- `model` (string, optional) — must match `[A-Za-z0-9][A-Za-z0-9._:-]*` (max 128 chars)
- `working_directory` (string, optional): working directory (cwd) for the CLI process
- `background` (boolean, optional, default `true`)
- `reasoning_effort` (string, optional: `minimal` | `low` | `medium` | `high` | `xhigh`)

### ask_gemini

- `prompt` (string, required)
- `model` (string, optional) — must match `[A-Za-z0-9][A-Za-z0-9._:-]*` (max 128 chars)
- `working_directory` (string, optional): working directory (cwd) for the CLI process
- `background` (boolean, optional, default `true`)

### wait_for_job

- `job_id` (string, required, 8-char hex)
- `timeout_ms` (number, optional, default 3600000, max 3600000; values exceeding 3600000 are capped)

### check_job_status

- `job_id` (string, required, 8-char hex)

### kill_job

- `job_id` (string, required, 8-char hex)
- `signal` (string, optional: `SIGTERM` | `SIGINT`, default `SIGTERM`)

### list_jobs

- `status_filter` (string, optional: `active`(spawned/running) | `completed` | `failed`(failed/timeout) | `all`, default `active`)
- `limit` (number, optional, default `50`)

## Runtime Notes

- `ask_codex`: invokes `codex exec --ephemeral` (adds `-c model_reasoning_effort=...` when `reasoning_effort` is specified)
- `ask_gemini`: invokes `gemini --prompt <text>`
- `ask_*` defaults to `background: true` when not specified
- `background: true` calls persist status/content files in `.codex-gemini-mcp/jobs` and `.codex-gemini-mcp/prompts`
- Structured logging (JSONL): `.codex-gemini-mcp/logs/mcp-YYYY-MM-DD.jsonl`
  - Default: metadata only (no body content)
  - `MCP_LOG_PREVIEW=1`: stores preview
  - `MCP_LOG_FULL_TEXT=1`: stores full text
  - Log events are mirrored to `stderr` alongside JSONL file writes
- Model selection priority: `request.model > env default > hardcoded default`
  - codex env: `MCP_CODEX_DEFAULT_MODEL` (default: `gpt-5.3-codex`)
  - gemini env: `MCP_GEMINI_DEFAULT_MODEL` (default: `gemini-3-pro-preview`)
- Default CLI timeout: `MCP_CLI_TIMEOUT_MS` or 3600000ms (60 min)
- If combined `stdout + stderr` output exceeds `MCP_MAX_OUTPUT_BYTES`, the run terminates with `CLI_OUTPUT_LIMIT_EXCEEDED`
- Output runs with color/TTY disabled for stable text piping (`NO_COLOR=1`, `FORCE_COLOR=0`, `TERM=dumb`)

## Logging by `background`

- Common (both `background` true/false): JSONL records `request` and terminal (`response` or `error`) events, trackable by `request_id`
- `background: false` (foreground): log events have no `job_id`; no `jobs/` or `prompts/` files are created
- `background: true` (background):
  - MCP response includes `jobId`, `contentFile`, `statusFile`
  - JSONL `response`/`error` events include `job_id`
  - `jobs/*status*.json` and `prompts/*content*.json` store `requestId`
  - This enables bidirectional mapping between `request_id` and `job_id` via logs and status files

## Environment Variables

- `MCP_CODEX_DEFAULT_MODEL`: default codex model
- `MCP_GEMINI_DEFAULT_MODEL`: default gemini model
- `MCP_CLI_TIMEOUT_MS`: default CLI timeout (ms)
- `MCP_MAX_OUTPUT_BYTES`: max output bytes (cap, default 1048576 = 1MiB)
- `MCP_RUNTIME_DIR`: runtime file root (default `.codex-gemini-mcp`)
- `MCP_LOG_DIR`: log path override
- `MCP_LOG_PREVIEW`: enable log preview (`1` to activate)
- `MCP_LOG_FULL_TEXT`: enable full text logging (`1` to activate)

## Current Status

- Binary entries: `codex-mcp`, `gemini-mcp`
- Verified: `ask_codex`, `ask_gemini` foreground/background live calls
- Verified: `wait_for_job`, `check_job_status`, `kill_job`, `list_jobs` live calls
- Implemented: structured logging (Phase D)
- Implemented: output cap enforcement + model regex validation

## Scope (deliberately minimal)

This project intentionally does not include:

- Model fallback chains
- Standalone bridge bundling

## Troubleshooting

- `CLI_NOT_FOUND`:
  - Occurs when `codex` or `gemini` CLI is not in PATH.
  - Install with `npm i -g @openai/codex` / `npm i -g @google/gemini-cli` and retry.
- Output truncated (`CLI_OUTPUT_LIMIT_EXCEEDED`):
  - Increase `MCP_MAX_OUTPUT_BYTES`, or reduce prompt/output size.
- Background files accumulating:
  - Manually clean up `.codex-gemini-mcp/` as needed.

## Acknowledgements

This project is a reimplementation of the Codex/Gemini MCP servers originally built in [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode).

## License

[MIT](LICENSE)
