import { NextRequest, NextResponse } from 'next/server';
import { detectVisitType } from '@/lib/medical/visit-type-detector';
import { extractInitialVisitInfo } from '@/lib/medical/info-extractor';
import { extractSoapNote } from '@/lib/medical/soap-extractor';
import { recommendXray as suggestXray } from '@/lib/medical/xray-recommender';
import { suggestDiagnosis } from '@/lib/medical/diagnosis-suggester';
import { identifySpeakers } from '@/lib/medical/speaker-diarization';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { transcript, visitType: requestedType } = body;

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript is required' }, { status: 400 });
    }

    // 1. Detect Visit Type (Phase 2)
    let visitType = requestedType;
    if (!visitType || visitType === 'auto') {
      visitType = await detectVisitType(transcript);
    }

    // 2. Extract Information (Phase 2)
    let chartData: any = {};
    if (visitType === 'initial') {
      chartData = await extractInitialVisitInfo(transcript);
    } else {
      chartData = await extractSoapNote(transcript);
    }

    // 3. Generate Suggestions (Phase 3)
    let xrayRecommendations: any[] = [];
    let diagnosisSuggestions: any[] = [];

    // For initial visit, check X-ray and Diagnosis
    if (visitType === 'initial') {
      // Extract symptoms & location for X-ray logic
      const symptoms = chartData.chiefComplaint?.complaint || '';
      // painLocation is string[]
      const location = chartData.history?.painLocation?.join(', ') || symptoms; 
      
      if (symptoms || location) {
         xrayRecommendations = await suggestXray(symptoms, location);
      }

      // Suggest diagnosis based on extracted chart data
      diagnosisSuggestions = await suggestDiagnosis(chartData);
    }


    // 4. Speaker Diarization (Phase 4)
    const diarizedSegments = await identifySpeakers(transcript);

    return NextResponse.json({
      visitType,
      chartData,
      suggestions: {
        xray: xrayRecommendations,
        diagnosis: diagnosisSuggestions
      },
      diarizedSegments // Add to response
    });

  } catch (error: any) {
    console.error('Error analyzing chart:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
