# Voice-Driven EMR Walkthrough

## 1. Overview
The **Reception -> Consultation** flow has been implemented with a focus on Voice-First interaction.

### Key URLs
- **Reception (접수)**: [http://localhost:3001/clinical/reception](http://localhost:3001/clinical/reception)
- **Consulting List (대기실)**: [http://localhost:3001/clinical/consulting](http://localhost:3001/clinical/consulting)

---

## 2. Usage Guide

### Step 1: Reception (Patient Check-in)
1. Navigate to `/clinical/reception`.
2. **Search**: Enter a patient name (must be >2 chars, e.g. "김철수").
   - If no patient exists, click **"신규 환자 등록"**.
3. **Register**: Click on a search result to register them to the waiting list.
4. **Verify**: They will appear in the **"실시간 대기 현황"** panel on the right.

### Step 2: Doctor's View (Consulting List)
1. Navigate to `/clinical/consulting`.
2. You will see the patient in the **"진료 대기 (Waiting)"** list.
3. Click the patient card to open their chart.

### Step 3: Voice Charting (The "Wow" Feature)
1. **Auto-Start**: Opening the chart automatically changes the visit status to `consulting`.
2. **Voice Control**:
   - Click the **Mic Icon** (or potentially mapped to Spacebar in future) to start dictation.
   - **Important**: Grant Microphone permissions when prompted by the browser.
3. **Field Selection**:
   - Click on the **Subjective (C.C)**, **Assessment**, or **Plan** box to make it active.
   - Speak clearly. The text will stream in real-time.
   - *Example*: "환자 기침과 콧물 증상 호소함. (pause) 급성 상기도 감염 의심됨."
4. **Completion**:
   - Click **"진료 완료"** to save and close the chart.

---

## 3. Technical Notes (Web Speech API)
- This feature relies on `window.webkitSpeechRecognition`.
- **Browser Support**: Primarily **Google Chrome** (Edge usually works too).
- **Permissions**: Requires explicit microphone access.
- **Language**: Hardcoded to `ko-KR`.

> [!NOTE]
> If testing on a different device (e.g., tablet) via `192.168.x.x`, the browser might block the Microphone API because it's not **HTTPS**. For full testing, use `localhost` or set up an SSL proxy.
