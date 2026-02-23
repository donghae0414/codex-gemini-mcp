# codex-gemini-mcp-sample

간결한 TypeScript MCP 서버 예제입니다.

- MCP tool `ask_codex`: 로컬 `codex` CLI에 프롬프트 전달
- MCP tool `ask_gemini`: 로컬 `gemini` CLI에 프롬프트 전달
- stdio transport 기반으로 동작
- 현재 Phase A 1차 구조 분리 완료 (`types`, `schema`, `run-cli` 모듈 분리)

`MCP_REVERSE_ENGINEERING.md`는 참고용이며, 이 샘플은 의도적으로 기능을 최소화했습니다.

## Requirements

- Node.js 20+
- `codex` CLI 설치 (`npm i -g @openai/codex`)
- `gemini` CLI 설치 (`npm i -g @google/gemini-cli`)

## Quick Start

```bash
npm install
npm run build
npm run start:codex
npm run start:gemini
```

개발 모드:

```bash
npm run dev:codex
npm run dev:gemini
```

## Example `.mcp.json`

```json
{
  "mcpServers": {
    "codex-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/codex-gemini-mcp/dist/mcp/codex-stdio-entry.js"]
    },
    "gemini-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/codex-gemini-mcp/dist/mcp/gemini-stdio-entry.js"]
    }
  }
}
```

## Tool Schemas

### ask_codex

- `prompt` (string, required)
- `model` (string, optional)
- `timeout_ms` (number, optional, default 600000, max 600000)
- `working_directory` (string, optional)

### ask_gemini

- `prompt` (string, required)
- `model` (string, optional)
- `timeout_ms` (number, optional, default 600000, max 600000)
- `working_directory` (string, optional)

## Runtime Notes

- `ask_codex`: `codex exec --ephemeral` 호출
- `ask_gemini`: `gemini --prompt <text>` 호출
- `timeout_ms` 미지정 시 기본값은 600000ms(10분)

## Current Status

- MCP 등록 엔트리: `dist/mcp/codex-stdio-entry.js`, `dist/mcp/gemini-stdio-entry.js`
- 검증 완료: `ask_codex`, `ask_gemini` 도구 실호출 성공
- 아직 미구현: background job tools

## Scope (deliberately minimal)

이 샘플에는 아래 기능이 없습니다:

- background job 관리
- prompt/response 파일 영속화
- fallback 모델 체인
- standalone bridge 번들링
