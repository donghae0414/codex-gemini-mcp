**🌐 Language: 한국어 | [English](README.en.md)**

# codex-gemini-mcp

AI 에이전트(Claude, Cursor 등)가 **OpenAI Codex CLI**와 **Google Gemini CLI**를 MCP 도구로 직접 호출할 수 있게 해주는 프록시 서버입니다.

## 주요 기능

- **`ask_codex`** — 에이전트가 Codex에게 코드 생성·리팩터링·디버깅을 요청
- **`ask_gemini`** — 에이전트가 Gemini에게 분석·요약·코드 리뷰를 요청
- **백그라운드 실행** — 오래 걸리는 작업을 백그라운드로 돌리고, 상태 확인(`check_job_status`)·대기(`wait_for_job`)·중단(`kill_job`)·목록 조회(`list_jobs`)로 관리
- **멀티모델 오케스트레이션** — 하나의 에이전트가 Codex와 Gemini를 동시에 활용하여 작업 분담 가능

하나의 패키지에서 `codex-mcp`와 `gemini-mcp` 두 개의 MCP 서버 바이너리를 제공하며, stdio transport 기반으로 동작합니다.


## Requirements

- Node.js 20+
- `codex` CLI 설치 (`npm i -g @openai/codex`)
- `gemini` CLI 설치 (`npm i -g @google/gemini-cli`)

MCP 서버는 각각의 CLI를 그대로 실행하므로, 먼저 로컬 터미널에서 로그인/인증이 완료되어 `codex` / `gemini` CLI를 바로 실행할 수 있는 상태인지 확인하세요.

## Install

npm에서 설치(배포된 경우):

```bash
npm i -g codex-gemini-mcp
```

전역 설치 없이 npx 사용:

```bash
npx -y -p codex-gemini-mcp codex-mcp
npx -y -p codex-gemini-mcp gemini-mcp
```

소스에서 설치(개발/테스트):

```bash
npm install
npm run build
npm link
```

## Example `.mcp.json`

전역 설치 기준:

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

전역 설치 없이 npx 기준:

```json
{
  "mcpServers": {
    "codex-mcp": {
      "command": "npx",
      "args": ["-y", "-p", "codex-gemini-mcp", "codex-mcp"]
    },
    "gemini-mcp": {
      "command": "npx",
      "args": ["-y", "-p", "codex-gemini-mcp", "gemini-mcp"]
    }
  }
}
```

클라이언트별 설정 파일 위치(참고):

- Claude Desktop (macOS): `~/Library/Application Support/Claude/claude_desktop_config.json`
- Claude Desktop (Windows): `%APPDATA%\Claude\claude_desktop_config.json`

환경 변수는 셸 프로필(`.zshrc` 등)에서 자동으로 주입되지 않을 수 있으므로, 가능하면 설정 파일의 `env` 블록으로 전달하세요.

## Default Models

기본 모델은 `src/config.ts`에 하드코딩되어 있으며, 환경 변수로 override할 수 있습니다.

| Provider | 기본 모델 | 환경 변수 override |
|----------|-----------|-------------------|
| codex | `gpt-5.3-codex` | `MCP_CODEX_DEFAULT_MODEL` |
| gemini | `gemini-3-pro-preview` | `MCP_GEMINI_DEFAULT_MODEL` |

모델 선택 우선순위: **요청 파라미터 `model`** > **환경 변수** > **하드코딩 기본값**

## Local development

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

## Runtime Files

- 기본 런타임 디렉토리: `<cwd>/.codex-gemini-mcp/`
  - background job 상태: `jobs/`
  - background job 입출력(content): `prompts/`
  - 구조화 로깅(JSONL): `logs/`
- 런타임 경로 override:
  - `MCP_RUNTIME_DIR`: 런타임 루트 디렉토리
  - `MCP_LOG_DIR`: 로그 디렉토리

정리(기본 경로 사용 시):

```bash
rm -rf .codex-gemini-mcp
```

## Security / Privacy Notes

- `background: true`(기본값) 요청은 `.codex-gemini-mcp/prompts/*content*.json`에 prompt/response를 저장합니다.
- 프롬프트에 시크릿(토큰, 비밀번호, 개인 정보 등)을 넣으면 로컬 파일에 남을 수 있습니다.
- 로깅은 기본적으로 본문 미저장이지만, 아래 플래그를 켜면 로그에 텍스트가 포함될 수 있습니다:
  - `MCP_LOG_PREVIEW=1`
  - `MCP_LOG_FULL_TEXT=1`

## Tool Schemas

### ask_codex

- `prompt` (string, required)
- `model` (string, optional)
- `model`은 `[A-Za-z0-9][A-Za-z0-9._:-]*` 패턴(최대 128자)만 허용
- `working_directory` (string, optional): CLI 프로세스의 실행 디렉토리(cwd)
- `background` (boolean, optional, default `true`)
- `reasoning_effort` (string, optional: `minimal` | `low` | `medium` | `high` | `xhigh`)

### ask_gemini

- `prompt` (string, required)
- `model` (string, optional)
- `model`은 `[A-Za-z0-9][A-Za-z0-9._:-]*` 패턴(최대 128자)만 허용
- `working_directory` (string, optional): CLI 프로세스의 실행 디렉토리(cwd)
- `background` (boolean, optional, default `true`)

### wait_for_job

- `job_id` (string, required, 8자리 hex)
- `timeout_ms` (number, optional, default 3600000, max 3600000; 3600000 초과 값은 3600000으로 cap)

### check_job_status

- `job_id` (string, required, 8자리 hex)

### kill_job

- `job_id` (string, required, 8자리 hex)
- `signal` (string, optional: `SIGTERM` | `SIGINT`, default `SIGTERM`)

### list_jobs

- `status_filter` (string, optional: `active`(spawned/running) | `completed` | `failed`(failed/timeout) | `all`, default `active`)
- `limit` (number, optional, default `50`)

## Runtime Notes

- `ask_codex`: `codex exec --ephemeral` 호출 (`reasoning_effort` 지정 시 `-c model_reasoning_effort=...` 추가)
- `ask_gemini`: `gemini --prompt <text>` 호출
- `ask_*`는 `background` 미지정 시 기본 `true`로 실행
- `background: true` 호출 시 `.codex-gemini-mcp/jobs`, `.codex-gemini-mcp/prompts`에 상태/입출력(content) 파일 저장
- 구조화 로깅(JSONL): `.codex-gemini-mcp/logs/mcp-YYYY-MM-DD.jsonl`
  - 기본: 메타데이터만 저장 (본문 미저장)
  - `MCP_LOG_PREVIEW=1`: preview 저장
  - `MCP_LOG_FULL_TEXT=1`: full text 저장
  - 로그 이벤트는 JSONL 파일 저장과 함께 `stderr`에도 미러링됨
- 모델 선택 우선순위: `request.model > env default > hardcoded default`
  - codex env: `MCP_CODEX_DEFAULT_MODEL` (기본값: `gpt-5.3-codex`)
  - gemini env: `MCP_GEMINI_DEFAULT_MODEL` (기본값: `gemini-3-pro-preview`)
- CLI timeout 기본값은 `MCP_CLI_TIMEOUT_MS` 또는 3600000ms(60분)
- `stdout + stderr` 합산 출력이 `MCP_MAX_OUTPUT_BYTES`를 넘으면 `CLI_OUTPUT_LIMIT_EXCEEDED`로 종료
- 출력은 안정적인 텍스트 파이프를 위해 색상/TTY를 비활성화하여 실행합니다 (`NO_COLOR=1`, `FORCE_COLOR=0`, `TERM=dumb`)

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
- `MCP_MAX_OUTPUT_BYTES`: 최대 출력 바이트(cap, 기본 1048576 = 1MiB)
- `MCP_RUNTIME_DIR`: 런타임 파일 기본 루트(`.codex-gemini-mcp`)
- `MCP_LOG_DIR`: 로그 경로 override
- `MCP_LOG_PREVIEW`: 로그 preview 저장 여부 (`1`이면 활성화)
- `MCP_LOG_FULL_TEXT`: 전체 텍스트 로그 여부 (`1`이면 활성화)

## Current Status

- 바이너리 엔트리: `codex-mcp`, `gemini-mcp`
- 검증 완료: `ask_codex`, `ask_gemini` foreground/background 실호출 성공
- 검증 완료: `wait_for_job`, `check_job_status`, `kill_job`, `list_jobs` 실호출 성공
- 구현 완료: 구조화 로깅(Phase D)
- 구현 완료: output cap 강제 + model regex validation

## Scope (deliberately minimal)

이 샘플에는 아래 기능이 없습니다:

- 모델 fallback chain
- standalone bridge 번들링

## Troubleshooting

- `CLI_NOT_FOUND`:
  - `codex` 또는 `gemini` CLI가 PATH에 없을 때 발생합니다.
  - `npm i -g @openai/codex` / `npm i -g @google/gemini-cli` 설치 후 재시도하세요.
- output이 잘림(`CLI_OUTPUT_LIMIT_EXCEEDED`):
  - `MCP_MAX_OUTPUT_BYTES`를 늘리거나, 프롬프트/출력을 줄이세요.
- background 파일이 너무 쌓임:
  - 필요 시 `.codex-gemini-mcp/`를 직접 정리하세요.
