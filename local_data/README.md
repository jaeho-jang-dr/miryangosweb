# MiryangOS KCD-8 상병 검색 미니앱

## 무엇을 해주나?
- 상병명(한글) 또는 코드(M48...)를 입력하면 즉시 드롭다운 팝업으로 후보를 보여줍니다.
- 항목을 클릭하면 **ASSESSMENT(진단) 텍스트 영역에** 자동으로 다음 형식으로 삽입됩니다:

예) `M4806 / 척추협착, 요추부`

## 1) 준비물
- Node.js 18+ 권장
- 상병마스터 CSV 파일 (건강보험심사평가원-상병마스터-YYYYMMDD.csv)

## 2) CSV 넣기 (중요)
이 프로젝트 루트에 아래 폴더/파일을 넣으세요.

- `local_data/건강보험심사평가원-상병마스터-20250930.csv`

> 파일명이 다르면 `app/api/kcd/search/route.ts`의 파일명을 바꾸면 됩니다.

## 3) 실행
```bash
npm install
npm run dev
```
브라우저에서:
- http://localhost:3000

## 4) Antigravity 안에 넣기
- 이 앱의 `app/api/kcd/search/route.ts` (API)
- `app/components/KcdSearchInput.tsx` (검색 입력)
- `app/page.tsx` (사용 예시)

위 3개가 핵심입니다. 이미 Antigravity에 화면이 있다면 `KcdSearchInput`만 가져가서 붙이고,
`onPick`에서 원장님 화면의 ASSESSMENT state에 **자동 삽입**하도록 연결하면 됩니다.

## 팁(검색 체감 개선)
- "척추관협착증"처럼 입력하면 파일에는 "척추협착" 형태로 있는 경우가 많아,
  서버에서 간단 정규화를 넣어두었습니다(척추관→척추, '증' 제거 등).
