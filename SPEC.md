# codex-gemini-mcp SPEC (v0.3, developer draft)

## 0. 진행 현황 스냅샷 (2026-02-23)

- 완료: Phase A 1차 구조 분리 (`src/types.ts`, `src/tools/schema.ts`, `src/runtime/run-cli.ts`)
- 완료: MCP SDK deprecated API 제거 (`server.tool` -> `server.registerTool`)
- 완료: 기본 CLI timeout 10분 적용 (`600000ms`)
- 완료: MCP 실호출 검증 (`ask_codex`, `ask_gemini`)
- 완료: Gemini 호출 인자 `--prompt` 사용(현재 설치된 Gemini CLI 규격 호환)
- 완료: provider 분리 서버 엔트리(`codex-mcp`, `gemini-mcp`) 추가
- 미완료: background job/logging 고도화

## 1. 목적과 의사결정

이 문서는 `ask_codex`, `ask_gemini` 중심 MCP 서버 2개(`codex-mcp`, `gemini-mcp`)를 **단순하게 유지**하되, 개발자가 유지보수 가능한 구조로 구현하기 위한 상세 계획서다.

핵심 의사결정:

1. `index.ts` 단일 파일 구조는 v0.1 샘플로는 적절하지만, 이번 요구사항(모델 우선순위, 구조화 로깅, 에러 표준화)을 넣으면 책임이 과도하게 집중된다.
2. 따라서 v0.3에서는 **작은 다중 모듈 구조**로 분리한다.
3. background 실행은 oh-my-claudecode 패턴을 반영해 포함한다.
4. 단, SQLite/복잡한 오케스트레이션은 제외하고 파일 기반 상태 관리로 단순화한다.
5. 로깅은 콘솔 전용이 아니라 **파일 기반 영속 로그**를 기본으로 한다.
6. MCP 서버는 provider별로 분리한다 (`codex` 서버, `gemini` 서버).

---

## 2. 현재 상태(As-Is)와 문제점

기준: provider 분리 엔트리(`src/mcp/*-standalone-server.ts`) + 분리 모듈(`providers/`, `mcp/` 포함)

- 이미 `ask_codex`, `ask_gemini`, 공통 `runCli`가 동작 중
- `AskSchema`는 `src/tools/schema.ts`, `AskInput`은 `src/types.ts`, `runCli`는 `src/runtime/run-cli.ts`로 분리 완료
- MCP tool 등록은 `server.registerTool(...)`로 교체 완료
- `model` 파라미터는 존재하나 default model 전략 부재
- 로깅은 부트 로그 수준이며 요청/응답/실행시간 트래킹이 없음
- provider별 인자 규칙은 `src/providers/*`로 분리 완료. 다만 모델 정책(`config.ts`)과 background/job/logging 계층은 아직 미구현

문제 요약:

- provider 분리/server 분리는 완료됐지만 background/job/logging/모델정책이 미완료
- 테스트 단위 분리가 어려움
- 향후 tool 추가 시 동일 패턴 복붙 유도

---

## 3. 범위

### 3.1 In Scope (이번 구현)

1. MCP tool 유지
   - Codex 서버: `ask_codex`, `wait_for_job`, `check_job_status`, `kill_job`, `list_jobs`
   - Gemini 서버: `ask_gemini`, `wait_for_job`, `check_job_status`, `kill_job`, `list_jobs`
2. 모델 선택 정책
   - `request.model > env default > hardcoded default`
3. background 실행 정책
   - `ask_codex`, `ask_gemini`에서 `background: true` 지원
   - detached process + job status 파일 기반 추적
4. 구조화 로깅
   - request/response/error
   - duration, exit code, byte length
   - 파일 저장(분리된 로그 파일)
5. 표준화된 CLI 실행 계층
   - timeout
   - max output cap
   - ENOENT/exit code 에러 표준화
6. 문서화
   - README에 환경변수/우선순위/로깅정책 명시
   - README에 background tool 사용 예시 명시

### 3.2 Out of Scope (이번 구현 제외)

- SQLite 상태 저장
- 모델 fallback chain
- bridge 번들링

---

## 4. 제안 아키텍처 (To-Be)

provider별 MCP 서버 엔트리를 분리하고, 도메인 로직은 공유 모듈로 유지한다.

```text
src/
├── mcp/
│   ├── codex-server.ts      # Codex MCP 서버(tool 등록: ask_codex + job tools)
│   ├── gemini-server.ts     # Gemini MCP 서버(tool 등록: ask_gemini + job tools)
│   ├── codex-standalone-server.ts   # stdio transport entry (codex)
│   └── gemini-standalone-server.ts  # stdio transport entry (gemini)
├── types.ts                 # 공통 타입(Provider, AskCodexInput, AskGeminiInput, JobStatus, LogEvent)
├── config.ts                # env 읽기 + default model/timeout 결정
├── job-management.ts        # wait/check/kill/list job 도구 로직
├── prompt-store.ts          # prompt/response/status 파일 영속화
├── logger/
│   ├── index.ts             # logger facade
│   ├── event.ts             # log event schema/types
│   └── file-sink.ts         # JSONL append sink (.codex-gemini-mcp/logs)
├── tools/
│   ├── schema.ts            # zod schema(AskCodexSchema, AskGeminiSchema, JobSchemas)
│   ├── codex-handlers.ts    # codex 전용 핸들러
│   └── gemini-handlers.ts   # gemini 전용 핸들러
├── providers/
│   ├── codex.ts             # codex argv 구성
│   ├── gemini.ts            # gemini argv 구성
│   └── index.ts             # provider resolver
└── runtime/
    ├── run-cli.ts           # foreground spawn + timeout + capture + errors
    └── run-cli-background.ts # detached spawn + status update + lifecycle
```

분리 원칙:

- provider별 차이는 `providers/*`, `tools/*-handlers.ts`, `mcp/*-server.ts`에 한정
- 실행/로깅/에러 처리 공통은 `runtime`/`logger`로 집약
- background 상태추적은 `job-management.ts` + `prompt-store.ts`로 분리
- MCP SDK 의존성은 `mcp/*-server.ts`에 제한

클라이언트 등록 예시(`.mcp.json`):

```json
{
  "mcpServers": {
    "codex-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/dist/mcp/codex-standalone-server.js"]
    },
    "gemini-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/dist/mcp/gemini-standalone-server.js"]
    }
  }
}
```

---

## 5. 모듈 계약(Contract)

### 5.1 `types.ts`

- `type Provider = "codex" | "gemini"`
- `interface BaseAskInput { prompt: string; model?: string; timeout_ms?: number; working_directory?: string; background?: boolean }`
- `interface AskCodexInput extends BaseAskInput { reasoning_effort?: "minimal" | "low" | "medium" | "high" | "xhigh" }`
- `type AskGeminiInput = BaseAskInput`
- `interface RunCliRequest { provider: Provider; command: string; args: string[]; stdinText: string; cwd?: string; timeoutMs: number; requestId: string }`
- `interface RunCliSuccess { stdout: string; stderr: string; exitCode: 0; durationMs: number; truncated: boolean }`
- `type JobState = "spawned" | "running" | "completed" | "failed" | "timeout"`
- `interface JobStatus { provider: Provider; jobId: string; status: JobState; pid?: number; promptFile: string; responseFile: string; model: string; spawnedAt: string; completedAt?: string; error?: string; killedByUser?: boolean }`
- 네이밍 규칙: MCP tool 입력 파라미터는 `snake_case`(`job_id`, `status_filter`)를 유지하고, `JobStatus`/status JSON/metadata payload 키는 `camelCase`(`jobId`, `promptFile`)를 사용한다.

### 5.2 `config.ts`

필수 API:

- `getDefaultModel(provider: Provider): string`
- `resolveModel(provider: Provider, requestedModel?: string): string`
- `getDefaultTimeoutMs(): number`
- `getLoggingFlags(): { preview: boolean; fullText: boolean }`
- `getLogDir(cwd?: string): string`
- `getRuntimeDir(cwd?: string): string`
- `getJobsDir(cwd?: string): string`
- `getPromptsDir(cwd?: string): string`

환경변수:

- `MCP_CODEX_DEFAULT_MODEL` (default: `gpt-5.3-codex`)
- `MCP_GEMINI_DEFAULT_MODEL` (default: `gemini-3-pro-preview`)
- `MCP_CLI_TIMEOUT_MS` (default: `600000`)
- `MCP_MAX_OUTPUT_BYTES` (default: `1048576`)
- `MCP_LOG_DIR` (default: `<worktree>/.codex-gemini-mcp/logs`)
- `MCP_RUNTIME_DIR` (default: `<worktree>/.codex-gemini-mcp`)
- `MCP_LOG_PREVIEW` (default: `0`)
- `MCP_LOG_FULL_TEXT` (default: `0`)

### 5.3 `providers/codex.ts`

- 입력: `{ prompt, model, reasoning_effort? }`
- 출력: `{ command: "codex", args: [...] }`
- 호출 규약(oh-my-claudecode 동일):
  - 기본 args: `['exec', '-m', model, '--json', '--full-auto']`
  - `reasoning_effort`가 유효한 경우에만 `-c model_reasoning_effort="..."` 추가
  - prompt는 argv가 아니라 `stdin`으로 전달

### 5.4 `providers/gemini.ts`

- 입력: `{ prompt, model }`
- 출력: `{ command: "gemini", args: [...] }`
- 호출 규약(oh-my-claudecode 동일):
  - 기본 args: `['-p=.', '--yolo']`
  - model 지정 시: `['-p=.', '--yolo', '--model', model]`
  - prompt는 argv가 아니라 `stdin`으로 전달

### 5.5 `runtime/run-cli.ts`

책임:

- `spawn` 실행
- `stdinText`를 child stdin으로 write/end
- timeout 강제 종료
- stdout/stderr 수집
- output size cap + truncation
- 에러 정규화

에러 분류:

- `CLI_NOT_FOUND`
- `CLI_TIMEOUT`
- `CLI_NON_ZERO_EXIT`
- `CLI_OUTPUT_LIMIT`

### 5.6 `runtime/run-cli-background.ts`

책임:

- detached spawn으로 백그라운드 실행
- job status 파일 생성/갱신 (`spawned` -> `running` -> terminal)
- timeout 처리 + 프로세스 종료
- stdout 수집 후 response 파일 저장

제약:

- `background: true`일 때만 사용
- jobId는 8자리 hex 포맷으로 생성

### 5.7 `logger/*`

- `logEvent(event: LogEvent): void`
- 기본 sink: JSONL 파일 append (`.codex-gemini-mcp/logs/mcp-YYYY-MM-DD.jsonl`)
- 보조 sink: `stderr` 미러링(옵션, 기본 on)
- 기본은 메타데이터만 출력
- preview/full text는 env flag로 opt-in

파일 로깅 규칙:

1. 로그 파일은 provider/요청과 무관하게 일 단위 파일로 저장
2. 각 라인은 완전한 JSON object 1개
3. append 실패 시 `stderr`에 fallback 에러를 남기되 MCP 응답은 실패시키지 않음
4. 로그 파일 생성 시 상위 디렉토리 자동 생성 (`mkdir -p` 동등 동작)

### 5.8 `prompt-store.ts`

책임:

- prompt/response/status 파일 경로 생성
- prompt/response markdown 저장
- status JSON 저장(원자적 write)
- job 조회/목록 함수 제공

저장 경로:

- `<runtime>/prompts/{provider}-prompt-{slug}-{id}.md`
- `<runtime>/prompts/{provider}-response-{slug}-{id}.md`
- `<runtime>/jobs/{provider}-status-{slug}-{id}.json`

### 5.9 `job-management.ts`

주의:

- provider별 MCP 서버(`codex-mcp`, `gemini-mcp`)로 분리하면 job 관리 도구에서 provider 파라미터가 필요 없다.
- codex 서버와 gemini 서버는 각각 자기 provider의 job만 조회/제어한다.

도구 API:

- `wait_for_job(job_id, timeout_ms?)`
- `check_job_status(job_id)`
- `kill_job(job_id, signal?)`
- `list_jobs(status_filter?, limit?)`

핵심 규칙:

- signal 허용값: `SIGTERM`, `SIGINT`
- kill는 본 프로세스가 spawn한 pid만 허용(pid ownership 체크)

### 5.10 `tools/codex-handlers.ts`

- schema 파싱된 `AskCodexInput`을 받아
  - `resolveModel("codex", model)`
  - `background` 분기 처리
    - `false`: `runCli` 호출 후 응답 반환
    - `true`: `runCliBackground` 호출 후 job metadata 반환
  - MCP response 형식으로 래핑

### 5.11 `tools/gemini-handlers.ts`

- schema 파싱된 `AskGeminiInput`을 받아
  - `resolveModel("gemini", model)`
  - `background` 분기 처리
    - `false`: `runCli` 호출 후 응답 반환
    - `true`: `runCliBackground` 호출 후 job metadata 반환
  - MCP response 형식으로 래핑

### 5.12 `mcp/*-server.ts`

- `codex-server.ts`: `ask_codex` + job tools 등록
- `gemini-server.ts`: `ask_gemini` + job tools 등록
- 서버별 이름 예시: `codex-mcp`, `gemini-mcp`

---

## 6. Tool 스펙

### 6.1 `ask_codex`

입력:

- `prompt` (required)
- `model` (optional)
- `reasoning_effort` (optional: `minimal` | `low` | `medium` | `high` | `xhigh`)
- `timeout_ms` (optional, 1..600000)
- `working_directory` (optional)
- `background` (optional, default: `false`)

동작:

1. `resolveModel("codex", model)`
2. provider args 생성
3. `background`가 `false`면 `runCli` 실행 (prompt는 stdin write)
4. `background`가 `true`면 `runCliBackground` 실행 후 `jobId`/경로 메타데이터 반환
5. foreground일 때 Codex `--json` 출력(JSONL)에서 텍스트 이벤트를 파싱해 최종 text 반환

### 6.2 `ask_gemini`

입력:

- `prompt` (required)
- `model` (optional)
- `timeout_ms` (optional, 1..600000)
- `working_directory` (optional)
- `background` (optional, default: `false`)
- `reasoning_effort`는 지원하지 않음(입력 스키마에서 거부)

동작:

1. `resolveModel("gemini", model)`
2. provider args 생성
3. `background`가 `false`면 `runCli` 실행 (prompt는 stdin write)
4. `background`가 `true`면 `runCliBackground` 실행 후 `jobId`/경로 메타데이터 반환
5. foreground일 때 `stdout.trim()`을 응답으로 사용 (별도 JSON output-format 파싱 없음)

참고:

- `MCP_REVERSE_ENGINEERING.md` 구현체(`oh-my-claudecode/src/mcp/gemini-core.ts`)는
  `--output-format json`을 사용하지 않는다.

### 6.3 `wait_for_job`

입력:

- `job_id` (required)
- `timeout_ms` (optional, default: `3600000`, max: `3600000`)

주의:

- 호출한 MCP 서버(codex/gemini)에 맞는 job만 조회한다.

동작:

1. status 파일 폴링
2. terminal 상태(`completed`, `failed`, `timeout`) 도달 시 결과 반환
3. 시간 초과 시 timeout 응답 반환

### 6.4 `check_job_status`

입력:

- `job_id` (required)

동작:

1. status 파일 단건 조회
2. 현재 상태/메타데이터 반환

### 6.5 `kill_job`

입력:

- `job_id` (required)
- `signal` (optional, `SIGTERM` | `SIGINT`, default: `SIGTERM`)

동작:

1. status에서 pid 조회
2. pid ownership 확인 후 시그널 전달
3. `failed` + `killedByUser=true`로 상태 업데이트

### 6.6 `list_jobs`

입력:

- `status_filter` (optional: `active` | `completed` | `failed` | `all`, default: `active`)
- `limit` (optional, default: `50`)

동작:

1. jobs 디렉토리 스캔
2. 상태 필터 + 생성시간 내림차순 + limit 적용
3. 요약 목록 반환

### 6.7 응답 계약 (구현 필수)

`ask_codex`/`ask_gemini` foreground 성공:

- MCP `content[0].text`에 모델 응답 텍스트 반환

`ask_codex`/`ask_gemini` background 성공:

- MCP `content[0].text`에 최소 필드 포함 JSON 문자열 반환:
  - `provider`
  - `jobId`
  - `status` (`spawned`)
  - `promptFile`
  - `responseFile`
  - `statusFile`

`wait_for_job` 성공(terminal):

- `completed`: 응답 텍스트(또는 response file 경로 + 요약) 반환
- `failed`/`timeout`: `isError: true`와 함께 상태/원인 반환

`check_job_status` 성공:

- 현재 `JobStatus` JSON 문자열 반환

`kill_job` 성공:

- 종료 신호 전달 결과 + 갱신된 상태 요약 반환

`list_jobs` 성공:

- 필터 적용된 job 요약 배열(JSON 문자열) 반환

---

## 7. 로깅 스펙

로그 이벤트 타입:

- `request`
- `response`
- `error`

저장 위치:

- 기본: `<working_directory or process.cwd()>/.codex-gemini-mcp/logs/mcp-YYYY-MM-DD.jsonl`
- 환경변수 `MCP_LOG_DIR` 지정 시 해당 경로 사용
- 파일 로깅이 불가한 경우 fallback으로 `stderr`만 사용

공통 필드:

- `ts`, `request_id`, `provider`, `tool`, `model`, `timeout_ms`

request 필드:

- `prompt_chars`, `cwd`

response 필드:

- `duration_ms`, `exit_code`, `stdout_bytes`, `stderr_bytes`, `truncated`

error 필드:

- `duration_ms`, `error_code`, `error_message`, `stderr_preview?`

보안 원칙:

- 기본적으로 prompt/response 본문 미기록
- `MCP_LOG_PREVIEW=1`일 때만 앞 N자 기록
- `MCP_LOG_FULL_TEXT=1`은 로컬 디버깅에서만 사용 권고

운영 원칙:

- 로그는 분석 가능한 형태(JSONL)로 저장
- 로그 파일은 git 추적 제외(`.gitignore`에 `.codex-gemini-mcp/` 또는 `.codex-gemini-mcp/logs/` 권장)
- 로그 보존/정리는 운영 정책으로 분리(초기 구현은 rotate/cleanup 미포함)

---

## 8. RE 문서 기능 반영 여부 (명시)

| 기능 | 이번 단계 | 판단 |
|---|---|---|
| ask_codex / ask_gemini | 포함 | 필수 기능 |
| 모델 기본값 + override | 포함 | 요구사항 핵심 |
| request/response/time 로깅 | 포함 | 요구사항 핵심 |
| 파일 기반 로그 분리 저장 | 포함 | 사용자 요구사항 반영 |
| background jobs (`wait/check/kill/list`) | 포함 | oh-my-claudecode 사용성 반영 |
| prompt/response/status 파일 영속화 | 포함 | background 추적 필수 기반 |
| 모델명 검증(regex) | 포함 | 안전한 입력 검증 |
| timeout/에러 정규화 | 포함 | 운영 안정성 |
| Codex JSONL 파싱(`--json`) | 포함 | 호출 패턴 동일성 + 응답 품질 |
| fallback chain | 보류 | 단순성 우선 |
| SQLite Job DB | 제외 | 현재 목표와 불일치 |

---

## 9. 구현 단계(개발자 액션 플랜)

### Phase A - 구조 분리 (리팩터링, 기능 동일)

현재 상태: **완료**

1. `types.ts`, `tools/schema.ts`, `providers/*`, `runtime/run-cli.ts` 파일 생성
   - 완료: `types.ts`, `tools/schema.ts`, `providers/*`, `runtime/run-cli.ts`
2. `mcp/codex-server.ts`, `mcp/gemini-server.ts`와 standalone entry 파일 생성 (완료)
3. 기존 동작 동일성 확인
   - 완료: `ask_codex`/`ask_gemini` MCP 실호출 확인 (provider 분리 엔트리)

완료 기준:

- 타입체크/빌드 통과
- 기존 tool 호출 성공

### Phase B - 모델 정책 추가

현재 상태: **미시작**

1. `config.ts` 추가
2. `resolveModel()` 적용
3. README에 우선순위 문서화

완료 기준:

- model 미지정 시 env/hardcoded default 반영
- model 지정 시 요청값 우선 적용

### Phase C - background 실행/잡 관리 추가

현재 상태: **미시작**

1. `runtime/run-cli-background.ts`, `prompt-store.ts`, `job-management.ts` 구현
2. `ask_codex`, `ask_gemini`에 `background` 분기 추가
3. `wait_for_job`, `check_job_status`, `kill_job`, `list_jobs` 도구 등록 (server-local provider 규칙)
4. `.codex-gemini-mcp/prompts`, `.codex-gemini-mcp/jobs` 파일 생성/갱신 확인

완료 기준:

- background 호출 시 `jobId` 반환
- `wait/check/kill/list` 도구 정상 동작
- status 파일 상태 전이(`spawned -> running -> terminal`) 검증

### Phase D - 구조화 로깅 추가

현재 상태: **미시작**

1. `logger/index.ts`, `logger/file-sink.ts` 구현
2. handler + run-cli에 request/response/error 로그 삽입
3. stdout 오염 여부 확인
4. `.codex-gemini-mcp/logs` 파일 생성/append 확인

완료 기준:

- stderr JSONL 출력 확인
- stdout MCP payload 정상

- `.codex-gemini-mcp/logs/mcp-YYYY-MM-DD.jsonl` 이벤트 기록 확인

### Phase E - 안정성 강화(경량)

현재 상태: **미시작**

1. 모델명 검증(regex)
2. output cap/truncation
3. ENOENT/timeout/non-zero exit 에러 메시지 표준화

완료 기준:

- 실패 케이스에서 사용자 친화 에러 반환

### 다음 진행 단계 (권장 순서)

1. **Phase B 착수**: `src/config.ts`를 추가해 `resolveModel()`/기본 timeout/env 정책을 단일 진입점으로 확정
2. **Phase B 반영 연결**: `src/providers/*` 또는 tool handler에서 `request.model > env default > hardcoded default` 우선순위 적용
3. **Phase C 착수**: `runtime/run-cli-background.ts`, `prompt-store.ts`, `job-management.ts` 최소 골격 구현
4. **도구 확장**: `wait_for_job`, `check_job_status`, `kill_job`, `list_jobs`를 provider 서버별로 등록
5. **Phase D/E 순차 적용**: 구조화 로깅(JSONL) -> 에러 표준화/출력 cap/모델명 검증 순으로 마감

---

## 10. 검증 계획

필수 명령:

```bash
npm run typecheck
npm run build
```

기능 검증:

1. codex 서버(`codex-mcp`)에서 `ask_codex` + model 없음
2. codex 서버(`codex-mcp`)에서 `ask_codex` + model 지정
3. gemini 서버(`gemini-mcp`)에서 `ask_gemini` + model 없음
4. gemini 서버(`gemini-mcp`)에서 `ask_gemini` + model 지정
5. timeout 강제 테스트
6. 존재하지 않는 CLI 이름 테스트(ENOENT)
7. `ask_codex(background=true)` -> `wait_for_job(job_id)`
8. `ask_gemini(background=true)` -> `check_job_status(job_id)`
9. background job `kill_job(job_id)` 시 상태 전이 확인
10. `list_jobs(status_filter, limit)` 동작 확인

로그 검증:

- stderr에 JSONL request/response/error
- 파일 로그에 JSONL request/response/error
- stdout에 MCP 응답만 존재

상태 파일 검증:

- `.codex-gemini-mcp/jobs/*.json` 생성 및 필드 유효성
- `.codex-gemini-mcp/prompts/*prompt*.md`, `*response*.md` 생성

---

## 11. 유지보수 기준

코드 규칙:

- provider-specific 로직은 `providers/`에만
- 환경변수 접근은 `config.ts`에서만
- `console.error` 직접 호출은 `logger/*`에서만 (예외: 부트 실패)
- 신규 tool 추가 시 handler + (필요 시 provider) + 서버 등록만 추가, runtime 재사용

성장 기준(언제 기능 확장?):

- job 수가 증가하면 SQLite 도입 검토
- provider별 고급 파라미터 요구가 늘면 schema를 provider별로 분리
- 분산 실행/다중 워커가 필요해지면 job orchestrator 계층 추가

---

## 12. 리스크

1. Gemini CLI 출력 포맷(plain text) 변동 가능성
   - 대응: stdout/stderr 수집 + 에러 패턴 기반 판별 유지
2. CLI 버전 차이로 옵션 동작 차이
   - 대응: README에 권장 버전 범위 명시
3. 과도한 로깅으로 민감정보 노출
   - 대응: 메타데이터-only 기본값 유지
4. 로그 파일 용량 증가
   - 대응: 초기에는 일 단위 파일 분리 + 운영 cleanup 가이드 제공
5. background 프로세스 orphan 위험
   - 대응: timeout + kill 도구 + pid ownership 체크

---

## 13. 결론

질문한 내용에 대한 판단: **맞다. 이제는 `index.ts` 하나로 유지하는 것이 불리하다.**

다만 대규모 아키텍처로 점프하지 않고, 위와 같은 소형 모듈 분리(16~20개 파일)로 가면

- 복잡도는 크게 늘리지 않으면서
- 책임 분리가 명확해지고
- 이후 확장(파라미터/도구 추가)이 쉬워진다.

---

## 불확실성 지도

1. 내가 가장 덜 자신있는 부분
   - Gemini CLI `--prompt`/모델 플래그 규격이 버전 업데이트에서 유지될지
   - Codex/Gemini CLI 옵션이 빠르게 변할 때 문서 동기화 비용

2. 지나치게 단순화했을 수 있는 부분
   - fallback chain을 완전히 보류한 결정(트래픽 증가 시 재검토 필요)
   - 초기 버전에서 SQLite 없이 파일 기반 job 상태만 사용하는 결정(다중 프로세스/고동시성에서 재검토 필요)

3. 어떤 정보가 내 의견을 바꿀 수 있는가
   - 실제 사용 패턴(동시 요청량, 평균 실행시간, 실패율)
   - 운영 요구(감사 로그 보존 기간, 보안 정책, 배포 채널)
   - 목표 사용자(개인 개발용 vs 팀/조직 배포용)
