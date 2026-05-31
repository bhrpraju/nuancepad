# Milestone B Recording Upload MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend NuancePad so users can upload recording files (`mp3`, `wav`, `m4a`, `mp4`, `webm`), transcribe them, generate executive-ready MoM output, and save to history.

**Architecture:** Keep transcript-first as the default path, then add a progressively disclosed recording mode. Introduce a transcription service abstraction (Gemini multimodal path first) with strict file validation and explicit error recovery.

**Tech Stack:** Existing Milestone A stack + Gemini multimodal transcription via existing API key.

---

### Task 1: Transcription Service + Validation (TDD)

**Files:**
- Create: `src/services/transcriptionService.ts`
- Test: `src/services/transcriptionService.test.ts`

- [ ] Write failing tests for supported recording extensions and validation errors.
- [ ] Implement validation + transcription contract with clear failure messages.
- [ ] Re-run tests until green.

### Task 2: Recording Intake UI

**Files:**
- Create: `src/components/RecordingInputCard.tsx`
- Modify: `src/pages/NewMeeting.tsx`

- [ ] Add mode switch with transcript-first default and advanced recording mode.
- [ ] Add recording file upload UI and supported-format constraints.
- [ ] Wire recording mode to transcription + MoM generation pipeline.

### Task 3: Source Semantics + Save Path

**Files:**
- Modify: `src/pages/NewMeeting.tsx`
- Modify: `src/domain/meeting.ts` (if needed)

- [ ] Ensure source type captures `recording_file` for recording mode and transcript modes otherwise.
- [ ] Persist generated transcript and report in existing meeting document format.

### Task 4: Tests + Docs + Verification

**Files:**
- Modify: `src/pages/NewMeeting.test.tsx`
- Modify: `README.md`

- [ ] Add tests for recording mode and transcription invocation.
- [ ] Update README with Milestone B recording workflow and constraints.
- [ ] Run `npm run test`, `npm run typecheck`, `npm run build`.
