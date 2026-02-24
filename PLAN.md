# codex-gemini-mcp Production Readiness Plan (Revised)

## Context

이 프로젝트는 Codex/Gemini CLI를 MCP 프로토콜로 프록시하는 TypeScript 서버입니다.
GitHub/npm 공개 배포를 production 수준으로 맞추기 위해 패키징 계약, 런타임 안정성, 문서/메타데이터 정합성을 보강합니다.

## 목표

1. npm에 올렸을 때 불필요한 파일이 포함되지 않는다.
2. CLI 패키지 계약이 명확하고(`bin` 중심), import 시 의도치 않은 서버 실행이 없다.
3. 런타임 상태 파일 파싱/종료/폴링이 장애에 강하다.
4. README/메타데이터/버전 정보가 실제 배포물과 일치한다.

## 현재 baseline (2026-02-25 기준)

- 구현 완료: foreground/background 실행, job 관리(`wait_for_job`, `check_job_status`, `kill_job`, `list_jobs`)
- 구현 완료: output cap 강제, model validation
- 구현 완료: 구조화 로깅(JSONL)
- 미구현: production 배포 계약 정리(`bin/files/repository/...`), shebang, 단일 버전 소스, 상태 파일 parse 검증 강화, CI 품질 게이트

## 구현 범위 (우선순위 순)

상태 표기: `DONE` | `PARTIAL` | `TODO`

---

### P0-1. LICENSE 파일 생성 `[TODO]`
- **신규:** `LICENSE` (MIT, `package.json`의 `license`와 일치)

---

### P0-2. npm 패키지 계약 정리 (`main`/`exports`/`bin`) `[TODO]`

**수정: `package.json`**
- `name`: `"codex-gemini-mcp-sample"` -> `"codex-gemini-mcp"`
- `bin` 추가:
  - `"codex-mcp": "dist/mcp/codex-stdio-entry.js"`
  - `"gemini-mcp": "dist/mcp/gemini-stdio-entry.js"`
- `files` 추가: `["dist", "README.md", "LICENSE"]`
- `repository`, `bugs`, `homepage` 추가
- `prepublishOnly` 추가: `"npm run typecheck && npm run build"`

**중요 정책 (확정):**
- 이 패키지는 **CLI-only**로 배포한다.
- `main`은 제거한다 (stdio entry를 module 계약으로 노출하지 않음).
- `exports`는 **추가하지 않는다**.

> 이유: `dist/mcp/*-stdio-entry.js`는 import 시 `main()`이 실행되는 엔트리이므로, `main`/`exports` 대상으로 두면 import만으로 서버가 떠버리는 계약 위반 위험이 있음.

---

### P0-3. Entry 파일 shebang 추가 `[TODO]`

**수정: `src/mcp/codex-stdio-entry.ts`, `src/mcp/gemini-stdio-entry.ts`**
- 첫 줄 shebang 추가: `#!/usr/bin/env node`
- `bin` 필드를 통한 CLI 실행에 필수

---

### P0-4. README 배포 정합성 업데이트 `[PARTIAL]`

**수정: `README.md`**
- 패키지명 `codex-gemini-mcp`로 정리
- `MCP_REVERSE_ENGINEERING.md` 참조 문구를 현재 저장소 상태(파일 존재)와 일치하도록 정리
- `bin` 명령 기반 사용법(`codex-mcp`, `gemini-mcp`) 반영
- 배포 후 사용자 관점 설치/실행 흐름 정리 (`npm i -g` 또는 `npx`)
- 런타임 파일(`.codex-gemini-mcp/`) 수동 정리 안내 추가

---

### P0-5. 버전 단일 소스화 `[TODO]`

**신규: `src/version.ts`**
- `package.json` 버전을 읽는 단일 소스 제공

**수정: `src/mcp/codex-server.ts`, `src/mcp/gemini-server.ts`**
- 하드코딩된 `"0.1.0"`을 `VERSION` import로 교체

---

### P0-6. JSON.parse 런타임 검증 (상태 파일) `[TODO]`

**수정: `src/prompt-store.ts`**
- `readJobContent()`, `readJobStatus()`에서 blind cast 제거
- `JSON.parse` 결과를 Zod 스키마로 검증

**신규: `src/job-schema.ts`**
- `JobContentSchema`, `JobStatusSchema` 정의
- `src/types.ts`의 `JobContent`, `JobStatus`와 필드 정합 유지
- MCP 입력 스키마(`src/tools/schema.ts`)와 분리하여 관심사 구분

**오류 처리 정책:**
- parse/shape 불일치 시 원인 식별 가능한 에러 메시지로 래핑하여 상위 핸들러가 사용자에게 명확히 반환 가능하도록 처리

---

### P1-1. wait_for_job 폴링 backoff 도입 `[TODO]`

**수정: `src/job-management.ts`**
- `WAIT_POLL_MS = 250` ->
  - `INITIAL_POLL_MS = 250`
  - `MAX_POLL_MS = 5000`
  - `BACKOFF_FACTOR = 1.5`
- `waitForJob()` 루프에서 `pollMs`를 증가시키며 delay

---

### P1-2. Graceful shutdown 도입 `[TODO]`

**수정: `src/mcp/codex-stdio-entry.ts`, `src/mcp/gemini-stdio-entry.ts`**
- `process.on('SIGINT', () => server.close())` 최소 핸들러 추가
- guard 플래그 등 과도한 구조는 지양, 한 줄 수준으로 유지

---

### P1-3. CI 품질 게이트 자동화 `[TODO]`

**신규: `.github/workflows/ci.yml`**
- Node LTS 매트릭스(최소 2개 버전)에서 실행
- 기본 파이프라인:
  1) `npm ci`
  2) `npm run typecheck`
  3) `npm run build`
  4) `npm pack --dry-run`

## 구현 순서

```
1. LICENSE 생성
2. package.json 패키지 계약 정리 (name/bin/files/repository/bugs/homepage/prepublishOnly + main/exports 정책 확정)
3. stdio entry shebang 추가
4. README를 배포 계약에 맞춰 갱신 (`MCP_REVERSE_ENGINEERING.md` 참조 문구 정합화 + 런타임 파일 정리 안내 추가)
5. src/version.ts 추가 후 server 버전 하드코딩 제거
6. src/job-schema.ts 추가 + prompt-store 파싱 검증 전환
7. wait_for_job backoff 적용
8. graceful shutdown 최소 핸들러 추가
9. CI 품질 게이트(typecheck/build/pack dry-run) 추가
```

## 검증 방법

1. `npm run typecheck` 통과
2. `npm run build` 통과
3. `npm pack --dry-run` 확인
   - 의도 파일만 포함되는지 확인 (`dist`, `README.md`, `LICENSE`, `package.json` 등)
   - `PLAN.md`, `SPEC.md`, `src/`, `.serena/` 등 불필요 파일 제외 확인
4. 빌드 결과 entry 파일 shebang 확인
   - `dist/mcp/codex-stdio-entry.js`
   - `dist/mcp/gemini-stdio-entry.js`
5. smoke test
   - `npm run start:codex`
   - `npm run start:gemini`
   - 시그널 종료(`SIGINT`/`SIGTERM`) 시 clean shutdown 확인
6. CI 워크플로우에서 1~5 자동 검증 통과 확인
