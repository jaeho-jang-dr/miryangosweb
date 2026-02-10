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
    const { transcript, visitType: requestedType } = body;

    if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
      return NextResponse.json({ error: 'Transcript is required and must be a non-empty string' }, { status: 400 });
    }

    // 1. Detect Visit Type
    let visitType: 'initial' | 'followup' = requestedType === 'followup' ? 'followup' : 'initial';
    if (!requestedType || requestedType === 'auto') {
      try {
        visitType = await detectVisitType(transcript);
      } catch (e) {
        console.warn('[AnalyzeChart] Visit type detection failed, defaulting to initial:', e);
        visitType = 'initial';
      }
    }

    // 2. Extract Information
    let chartData: InitialVisitChart | SoapNote | Record<string, unknown> = {};
    try {
      if (visitType === 'initial') {
        chartData = await extractInitialVisitInfo(transcript);
      } else {
        chartData = await extractSoapNote(transcript);
      }
    } catch (e) {
      console.error('[AnalyzeChart] Chart extraction failed:', e);
      throw e; // Propagate to the main catch block for 500 error
    }

    // 3. Generate Suggestions (non-critical, graceful degradation)
    let xrayRecommendations: XrayRecommendation[] = [];
    let diagnosisSuggestions: DiagnosisSuggestion[] = [];

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
    let diarizedSegments: DiarizedSegment[] = [];
    try {
      diarizedSegments = await identifySpeakers(transcript);
    } catch (e) {
      console.warn('[AnalyzeChart] Speaker diarization failed:', e);
    }

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
    console.error('[AnalyzeChart] Critical error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
