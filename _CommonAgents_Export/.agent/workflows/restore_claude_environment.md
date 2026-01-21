---
description: Antigravity Claude 환경(Proxy + CLI)을 복구합니다.
---
# Claude 환경 복구 (Restore Claude Environment)

이 워크플로우는 "Antigravity + Claude" 개발 환경을 복구합니다. 로컬 프록시가 실행 중인지 확인하고 Claude CLI를 실행합니다.

## 사용법

이 목적으로 생성된 배치 스크립트를 실행하십시오:

```powershell
.\scripts\start_claude.bat
```

## 스크립트 기능

1. **프록시 확인**: `8080` 포트에서 리스너를 찾습니다.
2. **자동 시작**: 발견되지 않으면 `antigravity-claude-proxy`를 백그라운드 최소화 창으로 시작합니다.
3. **상태 확인**: `http://localhost:8080/v1/models`가 응답할 때까지 대기합니다.
4. **Claude 실행**: 환경 변수(`ANTHROPIC_BASE_URL`)를 설정하고 `claude` CLI를 실행합니다.

## 수동 단계 (스크립트 실패 시)

1. 터미널을 엽니다.
2. 프록시 폴더로 이동: `cd antigravity-claude-proxy`
3. 실행: `npm start`
4. 새 터미널에서 실행: `claude`
