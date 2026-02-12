/**
 * EMR 연동 통합 서비스
 *
 * 기존 HIRA/MFDS 단위 API를 조합하여 EMR 워크플로우에 맞는
 * 고수준 기능을 제공합니다.
 *
 * 1. performBatchDurCheck  — 처방전 약물 일괄 DUR 점검
 * 2. lookupDrugForEmr      — 의약품 통합 조회 (성분+약효+통계+DUR)
 * 3. findNearbyPharmacies  — 처방전 연계용 약국 검색
 */

import {
  getDurContraindications,
  getDurAgeTaboos,
  getDurPregnancyTaboos,
  getDurDosageCautions,
  getDurDurationCautions,
  getDurDuplicateEfficacy,
  getDurSplitCautions,
} from './dur-ingredient';
import { getDrugIngredients, getDrugEffects } from './drug-info';
import { getDrugPrescriptionInfo } from './drug-usage';
import { getPharmacyDetail } from './pharmacy-info';
import type {
  EmrDurCheckRequest,
  EmrDurCheckResult,
  EmrDurAlert,
  EmrDrugLookupResult,
  EmrNearbyPharmacyResult,
  EmrIngredientEntry,
  DurIngredientItem,
  DurIngredientCheckType,
  PharmacyDetailInfo,
} from '@/types/hira';

// ─── 1. 처방전 DUR 일괄 체크 ────────────────────────────

/**
 * 처방전에 포함된 모든 약물에 대해 7종 DUR 체크를 병렬 수행.
 *
 * - 병용금기: 처방 약물 간 상호작용 교차 대조
 * - 연령금기: patientAge 제공 시 체크
 * - 임부금기: isPregnant=true 시 체크
 * - 용량주의 / 투여기간주의 / 효능중복 / 서방정분할: 항상 체크
 *
 * @example
 * const result = await performBatchDurCheck({
 *   ingredients: [
 *     { name: '아세트아미노펜' },
 *     { name: '이부프로펜' },
 *     { name: '록소프로펜' },
 *   ],
 *   patientAge: 72,
 *   isPregnant: false,
 * });
 * // result.critical → 병용금기 알림
 * // result.isSafe   → false (금기 존재)
 */
export async function performBatchDurCheck(
  request: EmrDurCheckRequest,
): Promise<EmrDurCheckResult> {
  const { ingredients, patientAge, isPregnant } = request;
  const alerts: EmrDurAlert[] = [];
  const ingredientNames = ingredients.map(i => i.name);

  // ── 병렬 DUR 체크 작업 구성 ──
  const tasks: Promise<void>[] = [];

  for (const ingr of ingredients) {
    const searchParam = ingr.code
      ? { ingrCode: ingr.code, numOfRows: 100 }
      : { ingrName: ingr.name, numOfRows: 100 };

    // (1) 병용금기 — 처방 내 다른 약물과 교차 대조
    tasks.push(
      getDurContraindications(searchParam)
        .then(res => {
          for (const item of res.items) {
            const conflictName = item.MIXTURE_INGR_KOR_NAME || item.INGR_KOR_NAME || '';
            // 처방 목록에 금기 상대 성분이 포함되어 있는지 확인
            const matched = ingredientNames.find(
              n => n !== ingr.name && conflictName.includes(n),
            );
            if (matched) {
              alerts.push({
                type: 'contraindication',
                severity: 'critical',
                ingredient: ingr.name,
                relatedIngredient: matched,
                message: `병용금기: ${ingr.name} + ${matched}`,
                detail: item.PROHBT_CONTENT || undefined,
              });
            }
          }
        })
        .catch(() => { /* 개별 실패 무시 — 다른 체크 계속 */ }),
    );

    // (2) 특정연령대금기 (나이 정보 있을 때)
    if (patientAge !== undefined) {
      tasks.push(
        getDurAgeTaboos(searchParam)
          .then(res => {
            for (const item of res.items) {
              alerts.push({
                type: 'age-taboo',
                severity: 'warning',
                ingredient: ingr.name,
                message: `연령금기: ${ingr.name} (환자 ${patientAge}세, 금기연령: ${item.AGE || '확인필요'})`,
                detail: item.PROHBT_CONTENT || undefined,
              });
            }
          })
          .catch(() => {}),
      );
    }

    // (3) 임부금기 (임신 시)
    if (isPregnant) {
      tasks.push(
        getDurPregnancyTaboos(searchParam)
          .then(res => {
            for (const item of res.items) {
              alerts.push({
                type: 'pregnancy-taboo',
                severity: 'critical',
                ingredient: ingr.name,
                message: `임부금기: ${ingr.name}`,
                detail: item.PROHBT_CONTENT || undefined,
              });
            }
          })
          .catch(() => {}),
      );
    }

    // (4) 용량주의
    tasks.push(
      getDurDosageCautions(searchParam)
        .then(res => {
          for (const item of res.items) {
            alerts.push({
              type: 'dosage-caution',
              severity: 'warning',
              ingredient: ingr.name,
              message: `용량주의: ${ingr.name} (최대 ${item.MAX_DOSAGE || '확인필요'})`,
              detail: item.PROHBT_CONTENT || undefined,
            });
          }
        })
        .catch(() => {}),
    );

    // (5) 투여기간주의
    tasks.push(
      getDurDurationCautions(searchParam)
        .then(res => {
          for (const item of res.items) {
            alerts.push({
              type: 'duration-caution',
              severity: 'warning',
              ingredient: ingr.name,
              message: `투여기간주의: ${ingr.name} (최대 ${item.MAX_DURATION || '확인필요'})`,
              detail: item.PROHBT_CONTENT || undefined,
            });
          }
        })
        .catch(() => {}),
    );

    // (6) 효능군중복주의
    tasks.push(
      getDurDuplicateEfficacy(searchParam)
        .then(res => {
          for (const item of res.items) {
            const dupName = item.MIXTURE_INGR_KOR_NAME || item.INGR_KOR_NAME || '';
            const matched = ingredientNames.find(
              n => n !== ingr.name && dupName.includes(n),
            );
            if (matched) {
              alerts.push({
                type: 'duplicate-efficacy',
                severity: 'info',
                ingredient: ingr.name,
                relatedIngredient: matched,
                message: `효능중복: ${ingr.name} ↔ ${matched} (${item.CLASS_NAME || '동일 약효군'})`,
                detail: item.PROHBT_CONTENT || undefined,
              });
            }
          }
        })
        .catch(() => {}),
    );

    // (7) 서방정분할주의
    tasks.push(
      getDurSplitCautions(searchParam)
        .then(res => {
          for (const item of res.items) {
            alerts.push({
              type: 'split-caution',
              severity: 'info',
              ingredient: ingr.name,
              message: `서방정분할주의: ${ingr.name} — 분할/분쇄 금지`,
              detail: item.PROHBT_CONTENT || undefined,
            });
          }
        })
        .catch(() => {}),
    );
  }

  // 모든 DUR 체크 병렬 실행
  await Promise.allSettled(tasks);

  // ── 중복 알림 제거 (병용금기 A↔B 양방향) ──
  const deduped = deduplicateAlerts(alerts);

  // ── 심각도별 분류 ──
  const critical = deduped.filter(a => a.severity === 'critical');
  const warnings = deduped.filter(a => a.severity === 'warning');
  const info = deduped.filter(a => a.severity === 'info');

  return {
    critical,
    warnings,
    info,
    totalAlerts: deduped.length,
    isSafe: critical.length === 0,
    drugCount: ingredients.length,
    checkedAt: new Date().toISOString(),
  };
}

/** 양방향 병용금기 중복 제거 (A+B ≡ B+A) */
function deduplicateAlerts(alerts: EmrDurAlert[]): EmrDurAlert[] {
  const seen = new Set<string>();
  return alerts.filter(alert => {
    // 병용금기/효능중복은 양방향이므로 정렬된 키로 중복 체크
    if (alert.relatedIngredient) {
      const pair = [alert.ingredient, alert.relatedIngredient].sort().join('|');
      const key = `${alert.type}:${pair}`;
      if (seen.has(key)) return false;
      seen.add(key);
    } else {
      const key = `${alert.type}:${alert.ingredient}:${alert.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
    }
    return true;
  });
}

// ─── 2. 의약품 통합 조회 ────────────────────────────────

/**
 * 성분명/코드로 의약품 정보를 통합 조회합니다.
 * 성분 상세 + 약효 분류 + 처방 통계 + DUR 해당 유형을 한번에 반환.
 *
 * @example
 * const info = await lookupDrugForEmr('록소프로펜');
 * // info.ingredient  → 성분 상세
 * // info.effects     → 약효 분류 목록
 * // info.prescription → 처방 건수/총량
 * // info.durFlags    → ['dosage-caution', 'duration-caution']
 */
export async function lookupDrugForEmr(
  drugName: string,
  drugCode?: string,
): Promise<EmrDrugLookupResult> {
  const searchByName = { cpntNm: drugName, numOfRows: 5 };
  const searchByCode = drugCode ? { cpntCd: drugCode, numOfRows: 5 } : searchByName;

  // 성분 + 약효 + 처방통계 + DUR 플래그를 병렬 조회
  const [ingredientRes, effectRes, prescRes, durFlags] = await Promise.allSettled([
    getDrugIngredients(searchByCode),
    getDrugEffects(searchByName),
    getDrugPrescriptionInfo({ mdcinCpntNm: drugName, numOfRows: 1 }),
    detectDurFlags(drugName, drugCode),
  ]);

  return {
    ingredient: ingredientRes.status === 'fulfilled'
      ? ingredientRes.value.items[0] ?? null
      : null,
    effects: effectRes.status === 'fulfilled'
      ? effectRes.value.items
      : [],
    prescription: prescRes.status === 'fulfilled'
      ? prescRes.value.items[0] ?? null
      : null,
    durFlags: durFlags.status === 'fulfilled'
      ? durFlags.value
      : [],
  };
}

/**
 * 해당 성분에 적용되는 DUR 유형을 탐지합니다.
 * 각 DUR API에 조회하여 결과가 1건 이상이면 해당 유형 플래그를 반환.
 */
async function detectDurFlags(
  name: string,
  code?: string,
): Promise<string[]> {
  const param = code
    ? { ingrCode: code, numOfRows: 1 }
    : { ingrName: name, numOfRows: 1 };

  const checks: { type: DurIngredientCheckType; fn: typeof getDurContraindications }[] = [
    { type: 'contraindication', fn: getDurContraindications },
    { type: 'age-taboo', fn: getDurAgeTaboos },
    { type: 'pregnancy-taboo', fn: getDurPregnancyTaboos },
    { type: 'dosage-caution', fn: getDurDosageCautions },
    { type: 'duration-caution', fn: getDurDurationCautions },
    { type: 'duplicate-efficacy', fn: getDurDuplicateEfficacy },
    { type: 'split-caution', fn: getDurSplitCautions },
  ];

  const results = await Promise.allSettled(
    checks.map(c => c.fn(param).then(r => ({ type: c.type, count: r.totalCount }))),
  );

  return results
    .filter(r => r.status === 'fulfilled' && r.value.count > 0)
    .map(r => (r as PromiseFulfilledResult<{ type: string; count: number }>).value.type);
}

// ─── 3. 주변 약국 조회 ──────────────────────────────────

/**
 * 지역 기반 약국 검색 (영업시간 포함).
 * 현재 시각 기준으로 영업 중인 약국 수를 추정합니다.
 *
 * @example
 * const result = await findNearbyPharmacies({ sidoCd: '48', sgguCd: '880' });
 * // result.pharmacies     → 약국 목록 (영업시간 포함)
 * // result.openNowEstimate → 현재 영업 중 추정 수
 */
export async function findNearbyPharmacies(params: {
  sidoCd?: string;
  sgguCd?: string;
  yadmNm?: string;
  numOfRows?: number;
}): Promise<EmrNearbyPharmacyResult> {
  const result = await getPharmacyDetail({
    sidoCd: params.sidoCd,
    sgguCd: params.sgguCd,
    yadmNm: params.yadmNm,
    numOfRows: params.numOfRows ?? 30,
  });

  const pharmacies = result.items;
  const openNowEstimate = countOpenNow(pharmacies);

  return {
    pharmacies,
    totalCount: result.totalCount,
    openNowEstimate,
  };
}

/**
 * 현재 KST 시각 기준으로 영업 중인 약국 수 추정.
 * dutyTime 필드는 "0900" 형식 (HHMM).
 */
function countOpenNow(pharmacies: PharmacyDetailInfo[]): number {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const day = kst.getUTCDay(); // 0=Sun, 1=Mon, ...
  const hhmm = kst.getUTCHours() * 100 + kst.getUTCMinutes();

  // 요일 → dutyTime 필드 매핑
  const dayMap: Record<number, { start: string; close: string }> = {
    1: { start: 'dutyTime1s', close: 'dutyTime1c' },
    2: { start: 'dutyTime2s', close: 'dutyTime2c' },
    3: { start: 'dutyTime3s', close: 'dutyTime3c' },
    4: { start: 'dutyTime4s', close: 'dutyTime4c' },
    5: { start: 'dutyTime5s', close: 'dutyTime5c' },
    6: { start: 'dutyTime6s', close: 'dutyTime6c' },
    0: { start: 'dutyTime7s', close: 'dutyTime7c' },
  };

  const fields = dayMap[day];
  if (!fields) return 0;

  let count = 0;
  for (const p of pharmacies) {
    const openStr = (p as Record<string, unknown>)[fields.start] as string | undefined;
    const closeStr = (p as Record<string, unknown>)[fields.close] as string | undefined;
    if (!openStr || !closeStr) continue;
    const open = parseInt(openStr, 10);
    const close = parseInt(closeStr, 10);
    if (!isNaN(open) && !isNaN(close) && hhmm >= open && hhmm <= close) {
      count++;
    }
  }
  return count;
}
