import { NextRequest, NextResponse } from 'next/server';
import { detectVisitType } from '@/lib/medical/visit-type-detector';
import { extractInitialVisitInfo } from '@/lib/medical/info-extractor';
import { extractSoapNote } from '@/lib/medical/soap-extractor';
import { recommendXray as suggestXray } from '@/lib/medical/xray-recommender';
import { suggestDiagnosis } from '@/lib/medical/diagnosis-suggester';
import { identifySpeakers, DiarizedSegment } from '@/lib/medical/speaker-diarization';
import type { InitialVisitChart } from '@/lib/medical/templates/initial-visit-template';
import type { SoapNote } from '@/lib/medical/templates/soap-note-template';

interface XrayRecommendation {
  views: string[];
  reason: string;
}

interface DiagnosisSuggestion {
  icd10Code: string;
  name: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { transcript, visitType: requestedType, mode } = body;

    // mode: 'realtime' = 녹음 중 실시간 분석 (AI 1회만 호출)
    //        'final'    = 녹음 완료 후 최종 분석 (전체 AI 호출)
    //        undefined  = 기존 호환 (final과 동일)
    const isRealtime = mode === 'realtime';

    if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
      return NextResponse.json({ error: 'Transcript is required and must be a non-empty string' }, { status: 400 });
    }

    // 1. Detect Visit Type (실시간에서는 스킵 - visitType이 이미 지정됨)
    let visitType: 'initial' | 'followup' = requestedType === 'followup' ? 'followup' : 'initial';
    if (!isRealtime && (!requestedType || requestedType === 'auto')) {
      try {
        visitType = await detectVisitType(transcript);
      } catch (e) {
        console.warn('[AnalyzeChart] Visit type detection failed, defaulting to initial:', e);
        visitType = 'initial';
      }
    }

    // 2. Extract Information (핵심 - 항상 실행, AI 1회 호출)
    let chartData: InitialVisitChart | SoapNote | Record<string, unknown> = {};
    try {
      if (visitType === 'initial') {
        chartData = await extractInitialVisitInfo(transcript);
      } else {
        chartData = await extractSoapNote(transcript);
      }
    } catch (e) {
      console.error('[AnalyzeChart] Chart extraction failed:', e);
      throw e;
    }

    // 3~4: 실시간 모드에서는 추가 AI 호출 스킵 (쿼터 절약)
    let xrayRecommendations: XrayRecommendation[] = [];
    let diagnosisSuggestions: DiagnosisSuggestion[] = [];
    let diarizedSegments: DiarizedSegment[] = [];

    if (!isRealtime) {
      // 3. Generate Suggestions (non-critical, graceful degradation)
      if (visitType === 'initial' && 'chiefComplaint' in chartData) {
        const initialChart = chartData as unknown as InitialVisitChart;
        const symptoms = initialChart.chiefComplaint?.complaint || '';
        const location = initialChart.history?.painLocation?.join(', ') || symptoms;

        // X-ray suggestions (non-critical)
        if (symptoms || location) {
          try {
            xrayRecommendations = await suggestXray(symptoms, location);
          } catch (e) {
            console.warn('[AnalyzeChart] X-ray suggestion failed:', e);
          }
        }

        // Diagnosis suggestions (non-critical)
        try {
          diagnosisSuggestions = await suggestDiagnosis(chartData);
        } catch (e) {
          console.warn('[AnalyzeChart] Diagnosis suggestion failed:', e);
        }
      }

      // 4. Speaker Diarization (non-critical)
      try {
        diarizedSegments = await identifySpeakers(transcript);
      } catch (e) {
        console.warn('[AnalyzeChart] Speaker diarization failed:', e);
      }
    }

    console.log(`[AnalyzeChart] 완료 (mode=${mode || 'final'}, AI호출=${isRealtime ? '1회' : '4~5회'})`);

    return NextResponse.json({
      visitType,
      chartData,
      suggestions: {
        xray: xrayRecommendations,
        diagnosis: diagnosisSuggestions
      },
      diarizedSegments
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const is429 = message.includes('429') || message.includes('Too Many Requests') || message.includes('quota');
    console.error(`[AnalyzeChart] ${is429 ? 'Rate limit hit' : 'Critical error'}:`, message);
    return NextResponse.json(
      { error: message, rateLimited: is429 },
      { status: is429 ? 429 : 500 }
    );
  }
}
