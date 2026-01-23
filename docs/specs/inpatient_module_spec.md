# Inpatient Ward Management (입원 관리) Module Specification

This document outlines the design for the new Inpatient Ward Management module for the Miryang OS Clinical App.

## 1. PM Requirements (User Stories)

### Epic 1: Patient Admission (입원 수속)
**Goal**: Streamline the process of converting an outpatient visit or ER visit into an inpatient stay.

*   **Story 1.1: Admit Patient & Bed Assignment**
    *   **As a** Ward Nurse,
    *   **I want to** select a patient with an admission order and assign them to a specific bed,
    *   **So that** the system tracks the bed occupancy and patient location.
    *   *Acceptance Criteria*:
        *   User can view a list of patients with "Admission Ordered" status.
        *   User can select a Ward > Room > Bed from available inventory.
        *   System validates that the selected bed is not currently occupied.
        *   Admission record is created with timestamp and initial status.

### Epic 2: Daily Care & Monitoring (병동 간호)
**Goal**: Efficiently record and visualize patient status, vitals, and fluids.

*   **Story 2.1: Vital Signs Recording**
    *   **As a** Nurse,
    *   **I want to** quickly input vital signs (BP, HR, RR, BT, SpO2) for a patient,
    *   **So that** trends can be monitored by the medical team.
    *   *Constraint*: Input must be optimized for speed (tab-navigation support).

*   **Story 2.2: Fluid Balance (I/O) Sheet**
    *   **As a** Nurse,
    *   **I want to** record fluid intake (IV, Oral) and output (Urine, Drainage),
    *   **So that** the patient's hydration status is automatically calculated.

*   **Story 2.3: Nursing Notes**
    *   **As a** Nurse,
    *   **I want to** write free-text progress notes attached to the admission timeline,
    *   **So that** specific events or patient complaints are documented.

### Epic 3: Discharge Process (퇴원)
**Goal**: Manage the completion of care and release of bed resources.

*   **Story 3.1: Discharge Patient**
    *   **As a** Nurse/Admin,
    *   **I want to** mark a patient as discharged,
    *   **So that** the bed becomes available for new admissions and the stay duration is calculated.

---

## 2. UI/UX Component Structure

**Root Path**: `/clinical/ward`

### 2.1 Navigation Structure
*   **WardLayout** (`/clinical/ward/layout.tsx`)
    *   Sidebar/TopNav items: "Bed Map" (Dashboard), "Pending Admissions", "My Patients".

### 2.2 Core Pages & Components

*   **1. Ward Dashboard (Bed Map)**
    *   **Path**: `/clinical/ward` (or `/clinical/ward/dashboard`)
    *   **Component**: `BedBoard.tsx`
        *   Visual grid representation of rooms/beds.
        *   **Sub-component**: `BedCard.tsx`
            *   Displays: Patient Name, Age/Sex, Admission Day (D+3), Acuity Status (Color-coded).
            *   Actions: Click to open *Patient Quick View* or navigate to *Chart*.
    
*   **2. Admission Wizard**
    *   **Path**: `/clinical/ward/admission`
    *   **Component**: `AdmissionForm.tsx`
        *   **Step 1**: Select Patient (Filter: `Visit` with Admission Order).
        *   **Step 2**: Select Bed (Dropdown or Visual Select).
        *   **Step 3**: Confirm Basic Info (Diagnosis, Attending Doctor).

*   **3. Inpatient Chart**
    *   **Path**: `/clinical/ward/patient/[admissionId]`
    *   **Component**: `InpatientChart.tsx`
        *   **Header**: Sticky header with Patient Demographics & Allergies.
        *   **Tabs**:
            *   **Overview**: Active orders, recent vitals.
            *   **Vitals**: `VitalSignGraph.tsx` (Line chart for trends), `VitalEntryForm.tsx`.
            *   **I/O**: `FluidBalanceTable.tsx` (Calculates Total In/Total Out).
            *   **Notes**: Timeline view of `NursingNote`.

---

## 3. System Architecture (Firestore Schema)

### 3.1 New Collection: `admissions`
Represents a single continuous stay in the hospital.

```typescript
interface Admission {
  id: string;               // UUID or Auto-ID
  visitId: string;          // Link to the parent Visit (Outpatient/ER encounter that triggered this)
  patientId: string;        // Link to Patient
  
  // Denormalized for List Views
  patientName: string;
  patientGender: 'male' | 'female';
  patientBirthDate: string;

  status: 'admitted' | 'discharged' | 'transferred';
  
  // Location Tracking
  location: {
    ward: string;           // e.g., "General Ward", "ICU"
    room: string;           // e.g., "301"
    bed: string;            // e.g., "A", "B"
  };

  // Clinical Context
  diagnosis: string;        // Admitting Diagnosis
  attendingDoctorId: string;
  acuityLevel: 'stable' | 'observation' | 'critical';
  tags: string[];           // e.g., ['fall_risk', 'npo', 'contact_isolation']

  // Timestamps
  admittedAt: Timestamp;
  dischargedAt?: Timestamp;
}
```

### 3.2 New Collection: `ward_updates`
A unified log for all temporal data points (Vitals, I/O, Notes) to allow for efficient time-series querying.

*   **Indexing**: Compound index on `[admissionId, recordedAt]` for fast chart generation.

```typescript
interface WardUpdate {
  id: string;
  admissionId: string;      // Ref to Admission
  patientId: string;        // Ref to Patient (for backup/search)
  
  type: 'vital' | 'intake' | 'output' | 'note';
  
  // Dynamic Payload based on Type
  data: {
    // IF type == 'vital'
    bpSys?: number;         // mmHg
    bpDia?: number;
    pulse?: number;         // bpm
    temp?: number;          // Celsius
    resp?: number;          // breaths/min
    spo2?: number;          // %

    // IF type == 'intake' || 'output'
    fluidType?: string;     // e.g., "Normal Saline", "Urine", "Oral"
    amount?: number;        // ml
    
    // IF type == 'note'
    content?: string;       // Free text
  };

  recordedAt: Timestamp;
  recordedBy: string;       // Staff User ID
}
```

### 3.3 Integration with Existing `Visit`
*   The `Visit` interface (in `src/types/clinical.ts`) should be updated to track the admission status, or a new `MedicalOrder` type `'admission'` should be created to trigger the admission workflow.
