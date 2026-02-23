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
- `timeout_ms` (number, optional, default 600000)
  - long-running task는 `300000` 이상(5분 이상) 권장
- `working_directory` (string, optional)

### ask_gemini

- `prompt` (string, required)
- `model` (string, optional)
- `timeout_ms` (number, optional, default 600000)
  - long-running task는 `300000` 이상(5분 이상) 권장
- `working_directory` (string, optional)

## Runtime Notes

- `ask_codex`: `codex exec --ephemeral` 호출
- `ask_gemini`: `gemini --prompt <text>` 호출
- 모델 선택 우선순위: `request.model > env default > hardcoded default`
  - codex env: `MCP_CODEX_DEFAULT_MODEL` (기본값: `gpt-5.3-codex`)
  - gemini env: `MCP_GEMINI_DEFAULT_MODEL` (기본값: `gemini-3-pro-preview`)
- `timeout_ms` 미지정 시 기본값은 `MCP_CLI_TIMEOUT_MS` 또는 600000ms(10분)

## Environment Variables

- `MCP_CODEX_DEFAULT_MODEL`: codex 기본 모델
- `MCP_GEMINI_DEFAULT_MODEL`: gemini 기본 모델
- `MCP_CLI_TIMEOUT_MS`: 기본 CLI timeout(ms)
- `MCP_MAX_OUTPUT_BYTES`: 최대 출력 바이트(cap, 향후 runtime 확장용)
- `MCP_RUNTIME_DIR`: 런타임 파일 기본 루트(`.codex-gemini-mcp`)
- `MCP_LOG_DIR`: 로그 경로 override
- `MCP_LOG_PREVIEW`: 로그 preview 저장 여부 (`1`이면 활성화)
- `MCP_LOG_FULL_TEXT`: 전체 텍스트 로그 여부 (`1`이면 활성화)

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
