# Task: Voice-Driven Clinical EMR (Phase 5)

## Overview
Implement the core Clinical EMR module focusing on Voice-First interactions for the Reception -> Consultation flow.

## 1. Reception (접수) Module
- [/] UI: Split Layout (Patient Search / Today's Waiting Queue)
- [/] Feature: Patient Search & Register (Create Visit)
- [/] Feature: Waiting List Display (Real-time subscription)
- [ ] Feature: "Call Patient" (Status Change: reception -> consulting)

## 2. Consulting (외래 진료) Module
- [/] UI: Waiting for Doctor List (Patients with status 'consulting')
- [/] Page: `/clinical/consulting/[id]` (Main Chart)
- [/] Feature: Voice Recorder Component (STT)
- [/] Feature: Transcript to Form Field Mapping (CC, Diagnosis, Plan)
- [ ] Feature: Completed Visit (Status Change: consulting -> completed)

## 3. Treatment & Testing (Orders)
- [ ] UI: Nursing Dashboard
- [ ] Feature: View Ordered Items
- [ ] Feature: Mark Complete

## 4. Voice Integration
- [ ] Component: `VoiceDictation` (Web Speech API)
- [ ] Util: TTS Helper (`speakText`)
