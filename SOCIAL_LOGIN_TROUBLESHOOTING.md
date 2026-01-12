# 카카오톡 & 네이버 로그인 문제 해결 가이드

## 🎯 문제 요약
카카오톡과 네이버 로그인이 작동하지 않는 문제를 해결하려면 다음 단계를 따라주세요.

---

## ✅ 체크리스트

### 1️⃣ 환경 변수 설정 확인 (.env.local)

`.env.local` 파일에 다음 환경 변수들이 제대로 설정되어 있는지 확인하세요:

```bash
# Site URL (반드시 포트 3001 사용)
NEXT_PUBLIC_SITE_URL=http://localhost:3001

# Kakao Login JavaScript 키
NEXT_PUBLIC_KAKAO_JS_KEY=카카오_JavaScript_키_입력

# Naver Login Client ID
NEXT_PUBLIC_NAVER_CLIENT_ID=네이버_Client_ID_입력
NEXT_PUBLIC_NAVER_CLIENT_SECRET=네이버_Client_Secret_입력
```

**❗ 중요**: 키가 비어있거나 잘못된 경우 로그인이 작동하지 않습니다.

---

### 2️⃣ Kakao Developers 콘솔 설정

#### A. Kakao Login 활성화
1. **Kakao Developers** 콘솔 접속: https://developers.kakao.com/console
2. 앱 선택 → 좌측 메뉴 **[앱 설정]** 펼치기
3. **[플랫폼]** 메뉴 클릭 (주의: [앱 키] 메뉴가 아님!)
4. **Web 플랫폼** 추가 또는 수정
5. **사이트 도메인**에 다음 추가:
   - `http://localhost:3000`
   - `http://localhost:3001` ✅ (필수!)
   - `http://localhost:3002`

**⚠️ 주의사항**:
- 사이트 도메인에 **trailing slash (/)를 붙이지 마세요**
- 예: ✅ `http://localhost:3001` / ❌ `http://localhost:3001/`

#### B. Kakao Login 설정
1. 좌측 메뉴 **[제품 설정]** 펼치기
2. **[카카오 로그인]** 클릭
3. **활성화 설정**: **ON** 으로 변경
4. **Redirect URI** 등록:
   - `http://localhost:3001/login/callback`

#### C. JavaScript 키 확인
1. 좌측 메뉴 **[앱 설정] > [앱 키]** 클릭
2. **JavaScript 키** 복사
3. `.env.local` 파일의 `NEXT_PUBLIC_KAKAO_JS_KEY`에 붙여넣기

---

### 3️⃣ Naver Developers 콘솔 설정

#### A. Application 등록 및 설정
1. **Naver Developers** 콘솔 접속: https://developers.naver.com/apps
2. 애플리케이션 선택 또는 새로 생성
3. **API 설정** 탭 클릭
4. **사용 API**: "네이버 로그인" 선택
5. **환경 추가** > **PC 웹** 선택
6. **서비스 URL**: `http://localhost:3001` 입력
7. **Callback URL**: `http://localhost:3001/login/callback` 입력

#### B. Client ID/Secret 확인
1. **내 애플리케이션** 메뉴에서 앱 선택
2. **Client ID** 와 **Client Secret** 복사
3. `.env.local` 파일에 붙여넣기:
   ```bash
   NEXT_PUBLIC_NAVER_CLIENT_ID=복사한_Client_ID
   NEXT_PUBLIC_NAVER_CLIENT_SECRET=복사한_Client_Secret
   ```

---

### 4️⃣ 개발 서버 재시작

환경 변수를 수정한 후에는 **반드시 개발 서버를 재시작**해야 합니다:

```powershell
# 터미널에서 Ctrl+C로 서버 중지
# 그 다음 다시 시작:
npx next dev -p 3001
```

---

### 5️⃣ 로그인 테스트

1. 브라우저에서 `http://localhost:3001` 접속
2. 로그인 페이지 이동
3. **카카오톡으로 시작하기** 버튼 클릭
   - 팝업이 열리고 카카오 로그인 화면이 표시되어야 함
   - 로그인 후 자동으로 닫히고 메인 페이지로 이동
4. **네이버로 시작하기** 버튼도 동일하게 테스트

---

## 🚨 자주 발생하는 에러 및 해결책

### Kakao 에러

#### **KOE004**: Kakao Login Activation OFF
- **해결**: 카카오 개발자 콘솔 → [카카오 로그인] → 활성화 설정 ON

#### **KOE009**: Site Domain 미등록
- **해결**: [플랫폼] → [Web] → 사이트 도메인에 `http://localhost:3001` 추가

#### **KOE006**: Redirect URI 불일치
- **해결**: 코드의 redirect URI와 개발자 콘솔의 Redirect URI가 정확히 일치하는지 확인

#### 팝업이 열리지 않음
- **해결**: 브라우저 팝업 차단 해제 또는 허용
- Chrome: 주소창 우측의 팝업 차단 아이콘 클릭 → 항상 허용

### Naver 에러

#### **Redirect URI Mismatch**
- **해결**: Naver Developers 콘솔의 Callback URL이 정확히 `http://localhost:3001/login/callback`인지 확인

#### **Client authentication failed**
- **해결**: `.env.local`의 `NEXT_PUBLIC_NAVER_CLIENT_ID`와 `NEXT_PUBLIC_NAVER_CLIENT_SECRET` 확인

---

## 💡 추가 팁

### 포트 3001 고정 사용
- Kakao/Naver는 등록된 Redirect URI와 정확히 일치해야 함
- 포트 3000 대신 **항상 3001**을 사용하세요
- 명령어: `npx next dev -p 3001`

### 브라우저 캐시 문제
- 로그인이 이상하게 작동하면 브라우저 캐시 삭제:
  - Chrome: Ctrl+Shift+Delete → 쿠키 및 캐시 삭제

### COOP 헤더 확인
- `next.config.ts`에 이미 올바르게 설정되어 있음:
  ```typescript
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin-allow-popups",
  }
  ```

---

## 📝 다음 단계

1. **즉시 확인**:
   - `.env.local` 파일 열어서 위의 환경 변수들이 모두 설정되어 있는지 확인
   - 비어있거나 `your_..._here` 같은 플레이스홀더가 있다면 실제 키로 교체

2. **개발자 콘솔 설정**:
   - Kakao Developers와 Naver Developers 콘솔 방문
   - 위의 체크리스트대로 설정 확인

3. **서버 재시작**:
   - 환경 변수 수정 후 반드시 `npx next dev -p 3001` 재실행

4. **테스트**:
   - 실제 로그인 버튼 클릭하여 동작 확인

---

## 🆘 문제가 계속되면?

다음 정보를 공유해주세요:

1. 브라우저 콘솔에서 발생하는 에러 메시지 (F12 → Console 탭)
2. 카카오/네이버 로그인 버튼 클릭 시 어떤 일이 발생하는지 (팝업 열림 여부, 에러 메시지 등)
3. `.env.local` 파일에 키가 제대로 설정되어 있는지 확인 (키 값 자체가 아니라 "설정되어 있음/없음"만)

이 정보를 바탕으로 더 정확한 해결책을 제시할 수 있습니다.
