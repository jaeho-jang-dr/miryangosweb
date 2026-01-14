# 🚀 Claude CLI 자동 시작 가이드

## 📌 개요

다음번 Claude 시작 시 **자동으로** 모든 설정이 적용됩니다.
(윈도우 부팅 시 자동 시작이 아니라, 사용자가 실행할 때 자동 설정 적용)

---

## ✅ 현재 구성된 자동 실행 방법

### 1️⃣ 바탕화면 바로가기 (가장 간편)

**위치**: 바탕화면 → `Miryang Claude.lnk`

**동작**:
- 더블클릭만 하면 됩니다
- 자동으로 프로젝트 디렉토리로 이동
- antigravity-claude-proxy 자동 감지/시작
- Claude CLI 실행

**생성 방법** (이미 생성됨):
```cmd
바탕화면에서 "Miryang Claude" 바로가기 더블클릭
```

---

### 2️⃣ NPM 명령어

프로젝트 디렉토리에서:

```bash
npm run claude
```

**동작**:
- start-claude.sh 스크립트 실행
- 모든 환경 자동 설정
- Claude CLI 시작

---

### 3️⃣ 직접 스크립트 실행

**Windows CMD**:
```cmd
D:\Entertainments\DevEnvironment\miryangosweb\start-claude.bat
```

**Git Bash**:
```bash
./start-claude.sh
```

**PowerShell**:
```powershell
.\start-claude.ps1
```

---

## 🔧 자동으로 수행되는 작업

사용자가 위 방법 중 하나로 실행하면 **자동으로**:

### 1. 프로젝트 디렉토리 이동 ✅
```
D:\Entertainments\DevEnvironment\miryangosweb
```

### 2. Proxy 자동 감지 및 시작 ✅
- 포트 9097 확인
- antigravity-claude-proxy가 없으면 자동 시작
- 있으면 그대로 사용

### 3. 환경 변수 검증 ✅
- ANTHROPIC_API_KEY 확인
- ANTHROPIC_BASE_URL 확인

### 4. Claude CLI 시작 ✅
- 프로젝트 컨텍스트 자동 로드
- `.claude/project-config.json` 설정 적용
- MCP 서버 자동 연결

### 5. SuperClaude 프레임워크 활성화 ✅
- `.claude/CLAUDE.md` 자동 로드
- 모든 커스텀 명령어 사용 가능

---

## 📁 저장된 설정

### `.claude/project-config.json`
```json
{
  "projectName": "miryangosweb",
  "projectPath": "D:\\Entertainments\\DevEnvironment\\miryangosweb",
  "proxy": {
    "enabled": true,
    "port": 9097,
    "autoStart": true
  },
  "mcpServers": {
    "playwright": "enabled",
    "context7": "enabled",
    "sequential-thinking": "enabled",
    "magic": "enabled",
    ...
  }
}
```

이 설정이 **매번 자동으로 적용**됩니다.

---

## 🎯 다음 Claude 시작 시 해야 할 일

**단 하나**: 바탕화면에서 `Miryang Claude` 바로가기 더블클릭!

그러면:
1. ✅ 프로젝트 경로로 자동 이동
2. ✅ Proxy 자동 시작
3. ✅ Claude CLI 실행
4. ✅ 모든 설정 자동 로드
5. ✅ SuperClaude 프레임워크 활성화

**아무것도 추가로 설정할 필요 없습니다!**

---

## 🔄 추가 옵션 (선택사항)

### Windows 시작 프로그램에 추가 (원할 경우만)

윈도우 부팅 시 자동 시작을 원하면:
```cmd
add-to-startup.bat
```

하지만 현재는 **수동 실행만** 설정되어 있습니다.

---

## 📝 요약

| 방법 | 명령어 | 자동 설정 |
|------|--------|-----------|
| 바탕화면 바로가기 | 더블클릭 | ✅ 모두 자동 |
| NPM | `npm run claude` | ✅ 모두 자동 |
| 배치 파일 | `start-claude.bat` | ✅ 모두 자동 |
| PowerShell | `start-claude.ps1` | ✅ 모두 자동 |
| Git Bash | `./start-claude.sh` | ✅ 모두 자동 |

---

**🎉 설정 완료! 다음번엔 바로가기 클릭만 하시면 됩니다!**
