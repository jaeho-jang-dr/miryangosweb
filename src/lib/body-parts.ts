/**
 * 부위별 분류 체계 (정형외과 기준)
 * 웹앱 전체에서 공유되는 상수 및 유틸리티
 */

export interface BodyPart {
  id: string;
  label: string;
  keywords: string[];
}

export const BODY_PARTS: BodyPart[] = [
  {
    id: 'shoulder',
    label: '어깨 (견관절)',
    keywords: ['어깨', '견관절', '회전근개', '오십견', '석회성건염', '유착성피막염'],
  },
  {
    id: 'elbow',
    label: '팔꿈치 (주관절)',
    keywords: ['팔꿈치', '주관절', '테니스엘보', '골퍼엘보', '상과염'],
  },
  {
    id: 'hand_wrist',
    label: '손/손목',
    keywords: ['손목', '손가락', '수근관', '방아쇠', '건초염', '터널증후군'],
  },
  {
    id: 'hip',
    label: '고관절',
    keywords: ['고관절', '대퇴골두', '무혈성괴사', '대퇴골'],
  },
  {
    id: 'knee',
    label: '무릎 (슬관절)',
    keywords: ['무릎', '슬관절', '십자인대', '반월상', '연골'],
  },
  {
    id: 'foot_ankle',
    label: '발/발목',
    keywords: ['발목', '족저근막', '아킬레스', '발바닥', '발뒤꿈치'],
  },
  {
    id: 'spine',
    label: '척추',
    keywords: ['척추', '허리', '목', '디스크', '협착', '측만', '경추', '요추'],
  },
];

/**
 * 태그와 제목을 기반으로 부위를 판별
 * @returns 매칭된 부위 id 또는 매칭 없으면 'etc'
 */
export function matchBodyPart(tags: string[], title: string): string {
  const searchText = [...tags, title].join(' ').toLowerCase();

  let bestId = 'etc';
  let bestCount = 0;

  for (const part of BODY_PARTS) {
    const count = part.keywords.filter(kw => searchText.includes(kw)).length;
    if (count > bestCount) {
      bestCount = count;
      bestId = part.id;
    }
  }

  return bestId;
}
