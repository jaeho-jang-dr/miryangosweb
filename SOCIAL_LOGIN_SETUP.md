# 소셜 로그인 설정 가이드

## 🔧 필수 환경 변수 설정

카카오톡과 네이버 로그인이 작동하려면 다음 환경 변수가 `.env.local` 파일에 설정되어 있어야 합니다.

### 1. 네이버 Client Secret 추가

`.env.local` 파일을 열고 다음 줄을 추가하세요:

```bash
NAVER_CLIENT_SECRET=발급받은_네이버_Client_Secret
```

**네이버 Client Secret 발급 방법**:
1. [Naver Developers](https://developers.naver.com/apps/#/list) 접속
2. 내 애플리케이션 선택
3. API 설정 탭에서 `Client Secret` 확인
4. 위의 값을 `.env.local`에 추가

### 2. Firebase Admin SDK 설정 (선택사항)

더 나은 보안을 위해 Firebase Admin SDK Service Account Key를 설정할 수 있습니다:

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 설정 > 서비스 계정
3. "새 비공개 키 생성" 클릭
4. 다운로드된 JSON 파일 내용을 한 줄로 복사
5. `.env.local`에 추가:

```bash
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...전체 JSON 내용..."}
```

### 3. Callback URL 설정 확인

**카카오톡**:
- [Kakao Developers](https://developers.kakao.com/console/app) > 내 애플리케이션 > 앱 설정 > 플랫폼
- Web 플랫폼의 "Redirect URI" 설정:
  - 개발: `http://localhost:3000`
  - 프로덕션: `https://yourdomain.com`

**네이버**:
- [Naver Developers](https://developers.naver.com/apps/#/list) > 내 애플리케이션 > API 설정
- "Callback URL" 설정:
  - 개발: `http://localhost:3000/login/callback`
  - 프로덕션: `https://yourdomain.com/login/callback`

## ✅ 설정 완료 후

1. 서버 재시작: `npm run dev`
2. 로그인 페이지 접속: `http://localhost:3000/login`
3. 각 소셜 로그인 버튼 테스트

## 🔍 문제 해결

### 카카오톡 로그인 실패
- 브라우저 콘솔에서 에러 메시지 확인
- Kakao Developers에서 JavaScript 키와 Redirect URI 확인
- `.env.local`의 `NEXT_PUBLIC_KAKAO_JS_KEY` 값 확인

### 네이버 로그인 실패
- 네이버 Callback URL이 정확히 설정되어 있는지 확인
- `.env.local`에 `NAVER_CLIENT_SECRET`이 추가되어 있는지 확인
- Client ID와 Client Secret이 같은 애플리케이션의 것인지 확인

### Firebase Admin 오류
- Service Account Key JSON이 올바른지 확인
- Firebase Console에서 Authentication이 활성화되어 있는지 확인
- Firestore Database가 생성되어 있는지 확인

## 📝 보안 주의사항

- `.env.local` 파일은 절대 Git에 커밋하지 마세요
- Client Secret은 노출되지 않도록 주의하세요
- 프로덕션 환경에서는 환경 변수를 호스팅 플랫폼의 설정에서 관리하세요
