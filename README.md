# codex-gemini-mcp-sample

간결한 TypeScript MCP 서버 예제입니다.

- MCP tool `ask_codex`: 로컬 `codex` CLI에 프롬프트 전달
- MCP tool `ask_gemini`: 로컬 `gemini` CLI에 프롬프트 전달
- MCP background tools: `wait_for_job`, `check_job_status`, `kill_job`, `list_jobs`
- stdio transport 기반으로 동작
- 현재 Phase D 구현 완료 (구조화 로깅 + background/job 추적)

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
- `background` (boolean, optional, default `false`)
- `reasoning_effort` (string, optional: `minimal` | `low` | `medium` | `high` | `xhigh`)

### ask_gemini

- `prompt` (string, required)
- `model` (string, optional)
- `timeout_ms` (number, optional, default 600000)
  - long-running task는 `300000` 이상(5분 이상) 권장
- `working_directory` (string, optional)
- `background` (boolean, optional, default `false`)

### wait_for_job

- `job_id` (string, required)
- `timeout_ms` (number, optional, default 3600000, max 3600000)

### check_job_status

- `job_id` (string, required)

### kill_job

- `job_id` (string, required)
- `signal` (string, optional: `SIGTERM` | `SIGINT`, default `SIGTERM`)

### list_jobs

- `status_filter` (string, optional: `active` | `completed` | `failed` | `all`, default `active`)
- `limit` (number, optional, default `50`)

## Runtime Notes

- `ask_codex`: `codex exec --ephemeral` 호출
- `ask_gemini`: `gemini --prompt <text>` 호출
- `background: true` 호출 시 `.codex-gemini-mcp/jobs`, `.codex-gemini-mcp/prompts`에 상태/입출력(content) 파일 저장
- 구조화 로깅(JSONL): `.codex-gemini-mcp/logs/mcp-YYYY-MM-DD.jsonl`
  - 기본: 메타데이터만 저장 (본문 미저장)
  - `MCP_LOG_PREVIEW=1`: preview 저장
  - `MCP_LOG_FULL_TEXT=1`: full text 저장
- 모델 선택 우선순위: `request.model > env default > hardcoded default`
  - codex env: `MCP_CODEX_DEFAULT_MODEL` (기본값: `gpt-5.3-codex`)
  - gemini env: `MCP_GEMINI_DEFAULT_MODEL` (기본값: `gemini-3-pro-preview`)
- `timeout_ms` 미지정 시 기본값은 `MCP_CLI_TIMEOUT_MS` 또는 600000ms(10분)

## Logging by `background`

- 공통(`background` true/false 모두): JSONL에 `request` 이벤트와 terminal(`response` 또는 `error`) 이벤트가 기록되고, `request_id`로 1차 추적 가능
- `background: false` (foreground): 로그 이벤트에 `job_id`가 없음. `jobs/`, `prompts/` 파일은 생성되지 않음
- `background: true` (background):
  - MCP 응답에 `jobId`, `contentFile`, `statusFile` 반환
  - JSONL `response`/`error` 이벤트에 `job_id` 기록
  - `jobs/*status*.json`, `prompts/*content*.json`에 `requestId` 저장
  - 따라서 `request_id` <-> `job_id`를 로그/상태파일 양방향으로 매핑 가능

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
- 검증 완료: `ask_codex`, `ask_gemini` foreground/background 실호출 성공
- 검증 완료: `wait_for_job`, `check_job_status`, `kill_job`, `list_jobs` 실호출 성공
- 구현 완료: 구조화 로깅(Phase D)
- 미구현: 안정성 강화(Phase E)

## Scope (deliberately minimal)

이 샘플에는 아래 기능이 없습니다:

- 모델 fallback chain
- model name regex 검증/표준 에러코드 체계
- standalone bridge 번들링
