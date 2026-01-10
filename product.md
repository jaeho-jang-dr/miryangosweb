# Project Context: Miryang OS Web (밀양 정형외과)

## 1. Project Overview

- **Name**: Miryang OS Web (밀양 정형외과 웹사이트 & EMR 시스템)
- **Goal**: To provide a premium, Apple-style minimalist website for patients and a seamless, efficient EMR (Electronic Medical Record) interface for medical staff.
- **Design Philosophy**: "Simplicity is the ultimate sophistication." Focus on vibrant colors, glassmorphism, smooth animations, and a borderless layout.

## 2. Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (with custom design system for animations/glassmorphism)
- **Database/Backend**: Google Firebase (Firestore, Storage, Authentication)
- **AI Integration**: Google Gemini 2.0 (via Dr.Jay CLI & Assistant)

## 3. Core Modules

### A. Public Interface

- **Landing Page**: Dynamic background, smooth transitions.
- **Hospital Info**: Medical staff profiles, directions, working hours.
- **Community**: Announcements, Q&A (Webtoon style board).

### B. Clinical System (Staff Only)

- **Reception**: Patient check-in, waitlist management (Drag & Drop).
- **Medical Records**: History taking, diagnosis (KCD-8 Search), order entry.
- **Radiology**: X-ray/MRI order management (Left/Right/Both selection logic).

### C. Admin System

- **Dashboard**: System overview.
- **Settings**: Basic data management (Clinic info, holidays).

## 4. Development Workflow (Conductor)

- **CLI**: Dr.Jay CLI (Custom TUI) for development tasks.
- **Deployment**: Vercel (Frontend), Firebase (Backend Rules/Storage).
- **Conductor Mode**: Always adhere to this `product.md` context when generating code.
