# Claude CLI 자동 시작 가이드

이 프로젝트는 Claude CLI와 antigravity-claude-proxy를 자동으로 설정하고 시작하는 스크립트를 포함하고 있습니다.

## 📋 사전 요구사항

### 1. 설치된 패키지
- **Claude CLI**: `npm install -g @anthropic-ai/claude-code`
- **antigravity-claude-proxy**: `npm install -g antigravity-claude-proxy`

### 2. 환경 변수
다음 환경 변수가 설정되어 있어야 합니다:

```bash
ANTHROPIC_API_KEY=your-api-key-here
ANTHROPIC_BASE_URL=http://localhost:9097
```

#### Windows에서 환경 변수 설정:
```cmd
setx ANTHROPIC_API_KEY "your-api-key-here"
setx ANTHROPIC_BASE_URL "http://localhost:9097"
```

#### Git Bash / Linux에서 환경 변수 설정:
```bash
export ANTHROPIC_API_KEY="your-api-key-here"
export ANTHROPIC_BASE_URL="http://localhost:9097"
```

영구적으로 설정하려면 `~/.bashrc` 또는 `~/.bash_profile`에 추가하세요.

## 🚀 사용 방법

### Windows (CMD)
프로젝트 루트에서:
```cmd
start-claude.bat
```

또는 더블클릭으로 실행

### Git Bash / Linux
프로젝트 루트에서:
```bash
chmod +x start-claude.sh
./start-claude.sh
```

## 📁 설정 파일

### `.claude/project-config.json`
프로젝트별 Claude CLI 설정을 저장합니다:
- 프로젝트 경로
- antigravity-claude-proxy 설정 (포트 9097)
- MCP 서버 설정
- 환경 변수

이 파일은 다음 세션에서 자동으로 로드됩니다.

## 🔧 동작 방식

자동 시작 스크립트는 다음을 수행합니다:

1. **프로젝트 디렉토리로 이동**
   ```
   D:\Entertainments\DevEnvironment\miryangosweb
   ```

2. **antigravity-claude-proxy 확인 및 시작**
   - 포트 9097에서 실행 중인지 확인
   - 실행 중이 아니면 자동 시작

3. **환경 변수 검증**
   - ANTHROPIC_API_KEY 확인
   - 설정되지 않은 경우 경고 표시

4. **Claude CLI 시작**
   - 프로젝트 컨텍스트 로드
   - MCP 서버 연결
   - SuperClaude 프레임워크 활성화

## 📊 MCP 서버

다음 MCP 서버들이 자동으로 활성화됩니다:

- **playwright**: 브라우저 자동화 및 E2E 테스트
- **filesystem**: 파일 시스템 접근
- **context7**: 라이브러리 문서 검색
- **sequential-thinking**: 복잡한 분석
- **memory**: 컨텍스트 메모리
- **magic**: UI 컴포넌트 생성

## 🔄 업데이트

설정을 업데이트하려면:

1. `.claude/project-config.json` 편집
2. `start-claude.bat` 또는 `start-claude.sh` 재실행

## ⚠️ 문제 해결

### antigravity-claude-proxy가 시작되지 않음
```bash
# 수동으로 시작
antigravity-claude-proxy

# 또는 포트 확인
netstat -ano | findstr :9097
```

### Claude가 프로젝트를 인식하지 못함
```bash
# 프로젝트 디렉토리 확인
cd D:\Entertainments\DevEnvironment\miryangosweb

# Git 상태 확인
git status
```

### MCP 서버 연결 실패
```bash
# MCP 서버 개별 테스트
npx -y context7-mcp
npx -y @modelcontextprotocol/server-sequential-thinking
```

## 📝 다음 단계

Claude CLI가 시작되면:
- SuperClaude 프레임워크가 자동 로드됩니다
- `.claude/CLAUDE.md`의 설정이 적용됩니다
- 프로젝트 컨텍스트가 유지됩니다

Happy coding! 🎉
