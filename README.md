# codex-gemini-mcp-sample

가장 단순한 TypeScript MCP 서버 예제입니다.

- MCP tool `ask_codex`: 로컬 `codex` CLI에 프롬프트 전달
- MCP tool `ask_gemini`: 로컬 `gemini` CLI에 프롬프트 전달
- stdio transport 기반으로 동작

`MCP_REVERSE_ENGINEERING.md`는 참고용이며, 이 샘플은 의도적으로 기능을 최소화했습니다.

## Requirements

- Node.js 20+
- `codex` CLI 설치 (`npm i -g @openai/codex`)
- `gemini` CLI 설치 (`npm i -g @google/gemini-cli`)

## Quick Start

```bash
npm install
npm run build
npm start
```

개발 모드:

```bash
npm run dev
```

## Example `.mcp.json`

```json
{
  "mcpServers": {
    "codexGemini": {
      "command": "node",
      "args": ["/absolute/path/to/codex-gemini-mcp/dist/index.js"]
    }
  }
}
```

## Tool Schemas

### ask_codex

- `prompt` (string, required)
- `model` (string, optional)
- `timeout_ms` (number, optional, max 600000)
- `working_directory` (string, optional)

### ask_gemini

- `prompt` (string, required)
- `model` (string, optional)
- `timeout_ms` (number, optional, max 600000)
- `working_directory` (string, optional)

## Scope (deliberately minimal)

이 샘플에는 아래 기능이 없습니다:

- background job 관리
- prompt/response 파일 영속화
- fallback 모델 체인
- standalone bridge 번들링
