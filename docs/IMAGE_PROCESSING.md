# 이미지 처리 가이드 (GraphicsMagick)

GraphicsMagick을 사용한 이미지 처리 기능이 프로젝트에 통합되었습니다.

## 설치된 도구

- **GraphicsMagick 1.3.46** - 시스템 레벨 이미지 처리 도구
- **gm npm 패키지** - Node.js에서 GraphicsMagick 사용

## 파일 구조

```
src/
├── lib/
│   └── image-processor.ts          # 이미지 처리 유틸리티 함수들
├── app/
│   └── api/
│       └── image/
│           └── process/
│               └── route.ts        # 이미지 처리 API 엔드포인트
└── components/
    └── ImageProcessor.tsx          # 이미지 처리 UI 컴포넌트
```

## 주요 기능

### 1. 이미지 리사이즈
```typescript
import { resizeImage } from '@/lib/image-processor';

await resizeImage('input.jpg', 'output.jpg', 800, 600);
```

### 2. 이미지 압축
```typescript
import { compressImage } from '@/lib/image-processor';

await compressImage('input.jpg', 'output.jpg', 80); // 품질 80%
```

### 3. 포맷 변환
```typescript
import { convertImageFormat } from '@/lib/image-processor';

await convertImageFormat('input.png', 'output.jpg', 'jpg');
```

### 4. 이미지 자르기
```typescript
import { cropImage } from '@/lib/image-processor';

await cropImage('input.jpg', 'output.jpg', 400, 400, 100, 100);
// 너비 400, 높이 400, x좌표 100, y좌표 100
```

### 5. 이미지 회전
```typescript
import { rotateImage } from '@/lib/image-processor';

await rotateImage('input.jpg', 'output.jpg', 90); // 90도 회전
```

### 6. 썸네일 생성
```typescript
import { createThumbnail } from '@/lib/image-processor';

await createThumbnail('input.jpg', 'thumb.jpg', 200, 200);
```

### 7. PDF를 이미지로 변환
```typescript
import { pdfToImage } from '@/lib/image-processor';

await pdfToImage('document.pdf', 'page-1.png', 0); // 첫 페이지
```

### 8. 워터마크 추가
```typescript
import { addWatermark } from '@/lib/image-processor';

await addWatermark('input.jpg', 'output.jpg', 'watermark.png', 'SouthEast');
```

### 9. 이미지 정보 가져오기
```typescript
import { getImageInfo } from '@/lib/image-processor';

const info = await getImageInfo('image.jpg');
console.log(info);
// { width: 1920, height: 1080, format: 'JPEG', size: 245760 }
```

### 10. 일괄 처리
```typescript
import { processImage } from '@/lib/image-processor';

await processImage('input.jpg', 'output.jpg', {
  width: 800,
  height: 600,
  quality: 85,
  format: 'jpg',
  crop: {
    width: 400,
    height: 400,
    x: 100,
    y: 100
  }
});
```

## API 사용법

### API 엔드포인트
```
POST /api/image/process
```

### 요청 예제 (JavaScript)
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('width', '800');
formData.append('height', '600');
formData.append('quality', '80');
formData.append('format', 'jpg');

const response = await fetch('/api/image/process', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result);
```

### 응답 예제
```json
{
  "success": true,
  "original": {
    "filename": "photo.jpg",
    "width": 4000,
    "height": 3000,
    "format": "JPEG",
    "size": 2048000
  },
  "processed": {
    "filename": "1738761234567-processed.jpg",
    "url": "/uploads/1738761234567-processed.jpg",
    "width": 800,
    "height": 600,
    "format": "JPEG",
    "size": 102400
  }
}
```

## UI 컴포넌트 사용법

```tsx
import ImageProcessor from '@/components/ImageProcessor';

export default function Page() {
  return (
    <div>
      <ImageProcessor />
    </div>
  );
}
```

## 지원 포맷

- **입력**: JPEG, PNG, GIF, TIFF, BMP, WebP, PDF 등
- **출력**: JPEG, PNG, GIF, WebP, TIFF, BMP 등

## 추가 기능

GraphicsMagick은 다음과 같은 고급 기능도 지원합니다:

- 이미지 효과 (blur, sharpen, emboss 등)
- 색상 조정
- 필터 적용
- 배치 처리
- 애니메이션 GIF 처리

필요한 기능이 있으면 `src/lib/image-processor.ts`에 추가 함수를 작성하세요.

## 디렉토리 구조

```
public/
├── uploads/      # 처리된 이미지 저장
└── temp/         # 임시 파일 저장 (자동 생성)
```

## 주의사항

1. `public/uploads` 폴더는 자동으로 생성되지만, `.gitignore`에 추가하는 것을 권장합니다.
2. 대용량 파일 처리 시 메모리 사용에 주의하세요.
3. 프로덕션 환경에서는 파일 크기 제한을 설정하세요.
4. 임시 파일은 주기적으로 삭제하는 것을 권장합니다.

## 문제 해결

### GraphicsMagick이 인식되지 않는 경우
```bash
# Windows (PowerShell)
$env:Path = "C:\Users\antigravity\scoop\shims;" + $env:Path

# 또는 시스템 재시작
```

### 모듈을 찾을 수 없는 경우
```bash
npm install gm @types/gm --legacy-peer-deps
```

## 참고 자료

- [GraphicsMagick 공식 문서](http://www.graphicsmagick.org/)
- [gm npm 패키지](https://www.npmjs.com/package/gm)
