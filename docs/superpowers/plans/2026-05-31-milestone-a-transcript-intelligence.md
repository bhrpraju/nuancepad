# Milestone A Transcript Intelligence MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build NuancePad Milestone A so users can create executive-ready Minutes of Meeting from pasted/uploaded transcripts, save meetings, browse history/detail, and export markdown.

**Architecture:** Build a React + Vite + Tailwind frontend with Firebase Auth + Firestore persistence and a schema-first MoM transformation pipeline. Keep transcript-first as the default path, enforce compliance messaging, and render executive sections in compact tables.

**Tech Stack:** React 18, Vite 5, TailwindCSS, Firebase Web SDK, Vitest, Testing Library, TypeScript.

---

### Task 1: Project Scaffold and Tooling

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`

- [ ] **Step 1: Create Vite + React TypeScript project files with scripts and dependencies.**
- [ ] **Step 2: Add Tailwind-compatible global styling and app shell mount point.**
- [ ] **Step 3: Verify project scripts exist (`dev`, `build`, `test`, `typecheck`).**

### Task 2: Domain Types, Schema, and Core Utilities (TDD)

**Files:**
- Create: `src/domain/meeting.ts`
- Create: `src/utils/meetingSchema.ts`
- Create: `src/utils/transcriptParsers.ts`
- Test: `src/utils/meetingSchema.test.ts`
- Test: `src/utils/transcriptParsers.test.ts`

- [ ] **Step 1: Write failing tests for MoM schema defaults/normalization and transcript parser behavior.**
- [ ] **Step 2: Implement minimal domain utilities to pass tests.**
- [ ] **Step 3: Re-run tests and ensure green.**

### Task 3: Service Layer (Firebase + AI Provider Contracts)

**Files:**
- Create: `src/services/firebase.ts`
- Create: `src/services/meetingService.ts`
- Create: `src/services/aiReportService.ts`
- Create: `src/config/env.ts`

- [ ] **Step 1: Implement Firebase initialization and graceful "not configured" behavior.**
- [ ] **Step 2: Implement meeting CRUD/search/filter service with Firestore path `users/{uid}/meetings/{meetingId}`.**
- [ ] **Step 3: Implement AI report generation abstraction with strict schema validation and fallback messaging.**

### Task 4: UI Architecture and Routing

**Files:**
- Create: `src/router.tsx`
- Create: `src/layout/AppLayout.tsx`
- Create: `src/components/Sidebar.tsx`
- Create: `src/components/ComplianceNotice.tsx`
- Create: `src/pages/Dashboard.tsx`
- Create: `src/pages/NewMeeting.tsx`
- Create: `src/pages/MeetingHistory.tsx`
- Create: `src/pages/MeetingDetail.tsx`
- Create: `src/pages/Settings.tsx`

- [ ] **Step 1: Add route structure for Dashboard/New Meeting/History/Detail/Settings.**
- [ ] **Step 2: Build shell navigation and first-run transcript-first UX.**
- [ ] **Step 3: Place compliance notice on intake surfaces.**

### Task 5: New Meeting Flow and Executive Output Rendering

**Files:**
- Create: `src/components/TranscriptInputCard.tsx`
- Create: `src/components/MetadataForm.tsx`
- Create: `src/components/MomReportTables.tsx`
- Create: `src/components/ExportActions.tsx`
- Modify: `src/pages/NewMeeting.tsx`
- Modify: `src/pages/MeetingDetail.tsx`

- [ ] **Step 1: Implement paste transcript and transcript file upload (`txt`, `vtt`, `srt`, `md`, `csv`).**
- [ ] **Step 2: Generate structured MoM JSON and preview tabular executive sections.**
- [ ] **Step 3: Save meeting document and navigate to detail.**
- [ ] **Step 4: Add copy summary/action items/follow-up and markdown export.**

### Task 6: History Search/Filters and Final QA

**Files:**
- Modify: `src/pages/MeetingHistory.tsx`
- Test: `src/pages/MeetingHistory.test.tsx`
- Test: `src/pages/NewMeeting.test.tsx`
- Create: `README.md`

- [ ] **Step 1: Add search/filter by client/project, meeting type, and platform.**
- [ ] **Step 2: Add component tests for transcript-first flow and history filters.**
- [ ] **Step 3: Document setup/env vars and compliance behavior in README.**
- [ ] **Step 4: Run `npm run test`, `npm run typecheck`, and `npm run build`.**
