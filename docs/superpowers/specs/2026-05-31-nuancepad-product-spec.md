# NuancePad Product Requirements and Specification (Pre-Implementation)

Status: Draft for review  
Date: May 31, 2026  
Product: NuancePad

## 1. Purpose

This document defines what NuancePad must build before any implementation starts. It converts the existing roadmap into a reviewable, execution-ready product specification.

NuancePad is **not** a desktop meeting recorder first. NuancePad is a **corporate-safe meeting intelligence web product** that converts existing meeting assets (transcripts, files, and authorized recording links) into structured outputs for teams.

Core positioning:

- "Summaries from the recordings you already have."
- No bot attendance required.
- No mandatory calendar integration.
- No assumption of admin OAuth access.

## 2. Product Vision

NuancePad transforms meeting inputs into structured, reliable outputs that teams can act on quickly.

Primary input channels:

1. Paste transcript text
2. Upload transcript file
3. Upload audio/video recording file
4. Paste recording link + passcode/password (authorized access only)
5. Save recording link as draft when extraction is blocked

Primary outputs (executive-ready Minutes of Meeting format):

1. Attendees
2. Executive summary
3. Key discussion points
4. Decisions (tabular)
5. Action items (tabular)
6. Risks/blockers (tabular)
7. Open questions
8. Stakeholder concerns (tabular)
9. Additional discussed items (tabular catch-all minutes notes)
10. Follow-up email draft
11. Tags
12. Full transcript
13. Exportable report

## 3. Problem Statement

Corporate users often receive meeting recordings and transcript artifacts across Webex, Zoom, Teams, Google Meet/Drive, and generic links. In many environments they cannot reliably install desktop software, use browser extensions, allow meeting bots, or secure tenant-wide OAuth approvals.

Users need a product that works with the assets they already have and produces high-quality meeting intelligence without violating enterprise controls.

## 4. Users and Jobs To Be Done

Primary user segments:

1. Delivery/project managers handling recurring client calls
2. Engineering/product leads tracking decisions and dependencies
3. Customer-facing teams preparing follow-ups and action trackers

Primary jobs:

1. "Turn this transcript/recording into accurate meeting output fast."
2. "Capture decisions, risks, and action items without hallucination."
3. "Keep searchable history by client/project and meeting type."
4. "Share follow-up summaries in established team workflows."

## 5. Product Scope

### 5.1 In Scope (Foundational)

1. Authentication and per-user meeting workspace
2. Transcript-first intelligence workflow
3. Recording file upload workflow
4. Structured report generation with strict output rules
5. Meeting library/history and detail views
6. Search and filters for operational retrieval
7. Export and copy actions for downstream use
8. Compliance-safe link importer with fallback behavior

### 5.2 Explicitly Out of Scope for Initial Build

1. Live desktop system-audio capture
2. Auto-join meeting bots
3. SSO/CAPTCHA/DRM bypass workflows
4. Enterprise tenant Graph/Workspace deep integration as MVP prerequisite
5. Mobile app parity in initial milestones
6. Real-time diarization-first feature set

## 6. Strategic Product Direction

NuancePad sequencing:

1. Transcript Intelligence (first useful product)
2. Recording upload/transcription
3. Webex link import
4. Zoom + Generic link import
5. Teams/Google Meet fallback and then adapter maturity
6. Corporate intelligence templates and tracking features
7. Meeting memory/search deepening
8. Desktop local mode later

Rationale:

- Fastest value with lowest risk starts from transcript-first.
- Link import is valuable but operationally sensitive and must respect platform controls.
- Desktop-first architecture delays value and does not match immediate user requirements.

## 7. Functional Requirements

### 7.1 Authentication and Access

1. User sign-in is required to create/read/update meeting artifacts.
2. Data is scoped per user identity.
3. Unauthorized access to meeting details is blocked.

### 7.2 New Meeting Input Experience

New Meeting must support:

1. Paste transcript text
2. Upload transcript files: `.txt`, `.vtt`, `.srt`, `.md`, `.csv`
3. Upload recording files (phase-gated): `.mp3`, `.wav`, `.m4a`, `.mp4`, `.webm`
4. Recording link import form (phase-gated):
   - Recording URL
   - Access code/passcode/password
   - Platform selector: Auto/Webex/Zoom/Teams/Google Meet/Other
   - Meeting title
   - Client/project
   - Meeting date
   - Shared by
5. Default first-run path must prioritize transcript-first input; advanced input modes must be progressively disclosed.
6. Input mode selection must avoid overwhelming the user with equal-priority options on the first screen.

### 7.3 Metadata Requirements

Each meeting must capture:

1. Meeting title
2. Client/project
3. Meeting date
4. Meeting type
5. Platform/source
6. Shared by
7. Source input type
8. Import/transcription/generation status

### 7.4 AI Report Generation Contract

The product must generate JSON output with this shape:

```json
{
  "title": "",
  "attendees": [],
  "executiveSummary": "",
  "keyDiscussionPoints": [
    {
      "topic": "",
      "summary": ""
    }
  ],
  "decisions": [
    {
      "decision": "",
      "owner": "Unassigned",
      "impact": "",
      "effectiveDate": "Not specified"
    }
  ],
  "actionItems": [
    {
      "task": "",
      "owner": "Unassigned",
      "dueDate": "Not specified",
      "priority": "",
      "status": "Open"
    }
  ],
  "risks": [
    {
      "risk": "",
      "severity": "Medium",
      "owner": "Unassigned",
      "mitigation": "",
      "targetDate": "Not specified"
    }
  ],
  "openQuestions": [],
  "stakeholderConcerns": [
    {
      "stakeholder": "",
      "concern": "",
      "requiredResponse": "",
      "owner": "Unassigned",
      "dueDate": "Not specified"
    }
  ],
  "additionalDiscussedItems": [
    {
      "item": "",
      "notes": "",
      "followUpNeeded": "No"
    }
  ],
  "followUpEmail": "",
  "tags": []
}
```

AI behavior rules:

1. Do not invent facts.
2. Do not invent people names.
3. Do not invent due dates.
4. If attendees are unclear, use an empty list.
5. If owner is unclear, use `Unassigned`.
6. If due date is unclear, use `Not specified`.
7. Keep `executiveSummary` concise (target 3-5 lines for executive readability).
8. If transcript is incomplete, explicitly state this in `executiveSummary`.
9. Capture uncategorized but important discussion under `additionalDiscussedItems`.
10. Return valid JSON only.

### 7.5 Meeting History and Detail

History requirements:

1. List prior meetings for the signed-in user.
2. Search by text across title/transcript/report fields.
3. Filter by client/project.
4. Filter by meeting type.
5. Filter by source platform.

Detail requirements:

1. Show metadata block.
2. Show attendees section.
3. Show summary sections.
4. Show key discussion points in table format.
5. Show decisions in table format.
6. Show action items table.
7. Show risks table.
8. Show stakeholder concerns table.
9. Show additional discussed items table.
10. Show open questions section.
11. Show follow-up email section.
12. Show transcript viewer.
13. Default view must prioritize executive brevity: summary and tabular sections first, transcript in a secondary/collapsible area.

### 7.6 Export and Sharing Actions

MVP export/copy requirements:

1. Copy summary
2. Copy action items
3. Copy follow-up email
4. Export Markdown report
5. Export compact executive-friendly MoM format that uses tables for:
   - Decisions
   - Action items
   - Risks
   - Stakeholder concerns
   - Additional discussed items
6. Executive export should follow inverted-pyramid ordering: executive summary first, then decisions/actions/risks, then supporting detail.

Future export capabilities (not MVP blocking): PDF, DOCX, task-system integrations.

### 7.7 Link Import and Compliance Behavior

System must support authorized extraction attempts without circumvention.

Must not do:

1. SSO bypass
2. CAPTCHA bypass
3. DRM bypass
4. Disabled-download bypass
5. Hidden/protected stream circumvention
6. Tenant restriction circumvention

On blocked extraction, system returns explicit fallback:

1. `manual_upload_required`
2. Reason text for why automation stopped
3. Optional saved draft of attempted link and metadata

### 7.8 Provider Extraction Feasibility and Contract

Research-based product contract for direct extraction:

1. NuancePad must not assume that a shared playback URL plus passcode is sufficient for backend extraction.
2. NuancePad must distinguish:
   - `direct_link_playback` (browser user can watch)
   - `api_authorized_download` (backend can fetch artifact with valid OAuth/app permissions)
   - `manual_upload_required` (interactive or policy block)
3. NuancePad must always prioritize legal/authorized API paths over browser automation for enterprise platforms.

Provider-specific requirements:

1. Zoom
   - Direct extraction is possible when OAuth/app scopes allow cloud recording access.
   - Backend path: Zoom Cloud Recording APIs (meeting recordings endpoints) and authenticated download URL usage.
   - Passcode-protected recordings still require token-authorized access.
   - If token/scope/policy validation fails, return `manual_upload_required` with explicit reason.

2. Microsoft Teams
   - Shared links generally point to OneDrive/SharePoint governed resources and are not reliable for unauthenticated backend fetch.
   - Direct extraction is possible through Microsoft Graph recording/transcript APIs with required Entra permissions and tenant consent.
   - Tenant policies may allow playback while blocking download; this must map to `manual_upload_required` (policy_blocked_download).
   - Meeting artifact fetch must treat Graph access and SharePoint/OneDrive access as separate authorization checks.

3. Google Meet
   - Artifacts are retained in organizer/authorized Drive context.
   - Direct extraction is possible via Meet artifact APIs plus Drive API download/export with OAuth scopes.
   - If Drive permissions or download restrictions prevent content retrieval, return `manual_upload_required`.
   - Transcript entries from Meet API and transcript docs may differ; both should be treated as valid sources with provenance metadata.

4. Webex
   - Link-only flows commonly require interactive browser/session completion even with passcode.
   - If interactive step is required (SSO/login/CAPTCHA/player-only controls), return `manual_upload_required` with guided recovery.

Standardized fallback reasons (minimum set):

1. `sso_or_login_required`
2. `interactive_passcode_or_session_required`
3. `policy_blocked_download`
4. `oauth_or_scope_missing`
5. `artifact_not_available`
6. `provider_unsupported`

## 8. UX and Interaction Specification

This section applies UI/UX quality standards for NuancePad web workflows.

### 8.1 UX Principles

1. Input-first workflow: user can start from whatever asset they already have.
2. Corporate-safe clarity: compliance notice is visible at import points.
3. Structured readability: outputs are skimmable and action-oriented.
4. Progressive disclosure: show complex import states only when needed.
5. Low-friction export: one-click copy for operational handoff.

### 8.2 Information Architecture

Required pages:

1. Dashboard
2. New Meeting
3. Meeting History
4. Meeting Detail
5. Settings

### 8.3 Core Interaction States

Required states:

1. Idle
2. Processing (upload/import/transcription/report generation)
3. Success
4. Partial success with fallback required
5. Error with actionable recovery
6. Missing AI provider configuration (`AI provider not configured.`)

### 8.4 Accessibility and Responsiveness

Minimum UX quality bars:

1. Keyboard-accessible forms and navigation
2. Visible labels for all inputs
3. Error messages tied to fields
4. Accessible contrast levels for text and controls
5. Mobile-responsive layouts with no horizontal overflow
6. Minimum touch target sizing for mobile interactions

## 9. Data and Domain Model

Storage baseline: per-user meeting documents.

Collection path:

`users/{uid}/meetings/{meetingId}`

Meeting document baseline:

```json
{
  "id": "",
  "title": "",
  "clientProject": "",
  "meetingDate": "",
  "meetingType": "",
  "sourceType": "",
  "platform": "",
  "recordingUrl": "",
  "sharedBy": "",
  "importStatus": "",
  "manualFallbackReason": "",
  "rawTranscript": "",
  "reportJson": {},
  "createdAt": "",
  "updatedAt": ""
}
```

Adapter result contract:

```json
{
  "status": "transcript_found",
  "transcriptText": "",
  "metadata": {}
}
```

```json
{
  "status": "recording_downloaded",
  "filePath": "",
  "metadata": {}
}
```

```json
{
  "status": "manual_upload_required",
  "reason": ""
}
```

## 10. System Architecture (Target)

### 10.1 Frontend

1. React + Vite
2. Tailwind CSS
3. Firebase Authentication
4. Meeting flows and visualization

### 10.2 Backend (Required for link import and heavier processing)

1. Node.js API layer (Fastify or Express)
2. Queue-backed job processing for long-running imports
3. Playwright-based adapter workers (authorized page interaction only)
4. Transcription service abstraction
5. AI summarization/report service abstraction

### 10.3 Processing Pipeline

1. Input submission
2. Validation and metadata capture
3. Transcript acquisition or transcription
4. Report generation with strict contract
5. Persistence
6. User-visible status updates

## 11. Milestones and Acceptance Criteria

### Milestone A: Transcript Intelligence MVP

Scope:

1. Paste transcript
2. Upload transcript files
3. Metadata capture
4. Structured report generation
5. Save/history/detail
6. Markdown export + copy actions

Acceptance criteria:

1. User can create a meeting from pasted transcript.
2. User can upload supported transcript formats.
3. Generated report follows required JSON schema and rules.
4. Meeting persists and appears in history.
5. Detail page shows all required sections.
6. Compliance notice is visible in relevant UI.

### Milestone B: Recording Upload MVP

Scope:

1. Audio/video upload
2. Transcription path
3. Report generation and persistence

Acceptance criteria:

1. Supported formats can be processed end-to-end.
2. Failures provide actionable UI recovery.

### Milestone C: Authorized Link Intake Foundation

Scope:

1. Link + passcode intake (simple UX)
2. Provider detection and routing (Webex/Zoom/Teams/Meet/Other)
3. Webex helper flow and standardized manual fallback path
4. Persisted import diagnostics (`importStatus`, fallback reason, provider)

Acceptance criteria:

1. User can paste authorized links and receive deterministic status/result.
2. Blocked paths return `manual_upload_required` with standardized reason and next step.
3. Import diagnostics are visible in history/detail and usable for KPI stats.
4. No bypass/circumvention behavior exists.

### Milestone D: Universal Import and Intelligence Expansion

Scope:

1. Zoom API-backed adapter (OAuth/scopes/download token path)
2. Teams Graph-backed adapter (tenant-consented artifact retrieval)
3. Google Meet + Drive adapter (artifact + file retrieval with OAuth scopes)
4. Generic adapter and enterprise fallback hardening
5. Corporate templates and enhanced tracking

Acceptance criteria:

1. Provider-specific API path is used where authorized and available.
2. Auto-detection routes to correct adapter/fallback path.
3. Teams/Meet/Zoom failures expose actionable reason codes, not generic errors.
4. Meeting intelligence templates are selectable and applied.

### Milestone E: Live Meeting Bot Join (Fireflies-Style, Controlled)

Scope:

1. Introduce optional "Live capture" mode for supported platforms.
2. Join flow inputs:
   - Meeting link
   - Meeting platform
   - Optional passcode
   - Preferred bot display name
3. Add calendar-assisted auto-join controls:
   - All meetings with conferencing link
   - Only meetings I own
   - Only when explicitly invited
4. Add manual "Add to live meeting" entry path for in-progress calls.
5. Add explicit participant presence model:
   - `waiting_lobby`
   - `admission_required`
   - `joined`
   - `left`
6. Capture and persist bot join diagnostics and participant/audit timeline.

Acceptance criteria:

1. User can launch live join request and receive deterministic join status.
2. System clearly indicates when host admission is required.
3. No hidden/unattributed bot joins occur.
4. Meeting capture starts only after bot is confirmed as joined participant.

### Milestone F: Provider-Native Bot and Compliance Hardening

Scope:

1. Zoom Meeting SDK/OAuth hardening for cross-account attribution requirements.
2. Teams Cloud Communications + real-time media bot path with tenant controls.
3. Webex SDK/API assisted join path where available and policy-compliant.
4. Google Meet strategy limited to approved integration surfaces (artifact APIs and add-ons); no undocumented bypass strategy.
5. Enterprise controls for allowlist/denylist, domain restrictions, and meeting policy checks.

Acceptance criteria:

1. Bot joins are attributable and policy-compliant per provider requirements.
2. Blocked joins produce explainable reason codes and safe fallback.
3. Security/compliance controls are enforceable at organization level.

## 12. Non-Functional Requirements

1. Reliability: long-running jobs must have explicit status and retry handling.
2. Security: no unauthorized data access; user-scoped data boundaries.
3. Compliance: no circumvention of platform controls.
4. Maintainability: modular architecture, no monolithic single-file app.
5. Observability: import/transcription/report failure reasons must be loggable and user-safe.
6. Performance: transcript-first workflow should produce results within practical interactive time limits under normal load.

## 13. Risks and Mitigations

1. Protected link variability across platforms
   - Mitigation: adapter abstraction + strict manual fallback path
2. AI hallucination in summary generation
   - Mitigation: strict prompt contract + schema validation + no-fabrication rules
3. Incomplete transcript quality
   - Mitigation: explicit completeness annotation in summary
4. Over-expanding MVP scope
   - Mitigation: phase gates and milestone acceptance criteria

## 14. Compliance Notice (Required Product Copy)

"Only process meeting content you are authorized to access. NuancePad does not bypass passcodes, SSO, disabled downloads, or company access controls."

## 15. Implementation Guardrails (Pre-Code)

Before writing implementation code:

1. This spec must be reviewed and approved.
2. Any scope additions should be logged as explicit amendments.
3. Planning should begin from Milestone A only unless approved otherwise.

## 16. Open Decisions for Review

These are the only remaining product decisions required before implementation planning:

1. Data backend baseline confirmation: Firestore-only MVP vs Firestore + server DB.
2. AI provider baseline: Gemini-only MVP vs provider abstraction at start.
3. Deployment target for backend worker jobs in Milestone C.
4. Whether Meeting Type should be fixed taxonomy or free-text + tags in Milestone A.

---

If approved, the next artifact should be an implementation plan document that executes this spec milestone by milestone without code yet.

## 17. Universal Design Principles Application (Applied)

Design context classification used for this PRD:

- A: Influence Perception
- B: Help People Learn
- C: Enhance Usability
- E: Make Better Design Decisions

Principles applied:

1. 80/20 Rule
   - What it says: Most value comes from a small number of features.
   - How it applies here: Transcript-first and executive-ready MoM outputs are the highest-frequency value path.
   - What to do: Keep Milestone A focused on transcript-to-MoM quality before expanding adapters.

2. Hierarchy of Needs
   - What it says: Functionality and reliability must precede advanced polish.
   - How it applies here: Reliable extraction, schema-safe output, and persistence must be stable before advanced integrations.
   - What to do: Gate later phases until Milestone A acceptance criteria are consistently met.

3. Progressive Disclosure
   - What it says: Show only what is needed now, reveal complexity on demand.
   - How it applies here: Input options can overwhelm first-run users if shown with equal weight.
   - What to do: Keep transcript-first as default and reveal advanced import modes contextually.

4. Hick's Law
   - What it says: More choices increase decision time.
   - How it applies here: New Meeting mode selection can become high-friction if all paths are equally prominent.
   - What to do: Use one primary CTA and defer secondary input paths behind an explicit mode switch.

5. Signal-to-Noise Ratio
   - What it says: Maximize relevant information and minimize noise.
   - How it applies here: C-level recipients need short, high-signal communication.
   - What to do: Enforce concise summary plus tabular sections for decisions, actions, risks, stakeholder concerns, and additional items.

6. Inverted Pyramid
   - What it says: Lead with the most important information first.
   - How it applies here: Executive emails should surface conclusions and actions before raw detail.
   - What to do: Require export order: summary first, then decisions/actions/risks, then supporting sections.

7. Recognition Over Recall
   - What it says: Users should recognize options rather than remember them.
   - How it applies here: Metadata and classification should not rely on free-form memory-heavy entry where avoidable.
   - What to do: Use controlled pickers/default values for platform, meeting type, and statuses with optional free-text extensions.

8. Forgiveness
   - What it says: Prevent harmful mistakes and make recovery easy.
   - How it applies here: AI/report generation and imports can fail or be incomplete.
   - What to do: Preserve user input on failures, provide retry paths, and keep clear manual-upload fallback for blocked imports.

9. Feedback Loop
   - What it says: Every important action needs immediate and clear feedback.
   - How it applies here: Long-running processing without visible state reduces trust.
   - What to do: Maintain explicit processing states, completion confirmations, and actionable error messages.

10. Consistency
    - What it says: Same meaning should map to same label and behavior everywhere.
    - How it applies here: Statuses and table semantics must remain consistent across detail view and exports.
    - What to do: Standardize terms (`Unassigned`, `Not specified`, `Open`) and reuse the same section order across all outputs.

Design verdict:

- Principles honored well:
  - 80/20 Rule (transcript-first MVP)
  - Signal-to-Noise Ratio (compact executive outputs)
  - Hierarchy of Needs (phase-gated roadmap)
- Principles previously under-specified and now corrected:
  - Progressive Disclosure
  - Hick's Law
  - Inverted Pyramid
  - Recognition Over Recall
- Single most critical fix to apply first:
  - Enforce executive output order and compact tabular MoM format as the default export/view mode for leadership communication.

## 18. Human Architect Architecture Blueprint (Design-Phase Only)

This section applies a complete architecture and rollout model for NuancePad using domain-first and constraint-aware system design.

### 18.1 Domain Model (What The System Must Represent)

Core domain objects:

1. Meeting Intake
   - Source type: transcript paste, transcript file, recording file, recording link.
   - Access context: platform, passcode/password, shared by, meeting metadata.
2. Access Attempt
   - Authorized access attempt against platform constraints.
   - Result: success, partial success, blocked, or unsupported.
3. Evidence Artifact
   - Transcript artifact, recording artifact, extracted metadata, processing logs.
4. Intelligence Artifact
   - Structured MoM JSON + executive-ready tabular rendering.
5. Actionability Artifact
   - Action items, risks, decisions, concerns, and follow-up draft.
6. Compliance Decision
   - Why access was allowed/blocked and whether manual fallback is required.

### 18.2 System Boundaries (What Lives Where)

1. NuancePad Web App (User Interaction Boundary)
   - Intake UX, job status, meeting history/detail, exports.
2. API and Orchestration Layer (Control Boundary)
   - Input validation, job creation, policy checks, routing to workers.
3. Adapter Execution Layer (Platform Access Boundary)
   - Webex/Zoom/Teams/Google/Generic adapters under strict authorized-access rules.
4. Intelligence Layer (Transformation Boundary)
   - Transcript normalization, MoM generation, schema validation, formatting.
5. Persistence and Audit Layer (Evidence Boundary)
   - Meeting store, artifacts, status events, compliance logs, retry history.

### 18.3 Compliance Control Plane (Non-Negotiable)

Before any adapter execution:

1. Policy Preflight Check
   - Confirm permitted source mode and allowed operation.
2. Access Legitimacy Check
   - Use only user-provided authorized URL/passcode/password paths.
3. Restriction Detection
   - If SSO/CAPTCHA/DRM/tenant/disabled-download controls block access, stop immediately.
4. Mandatory Fallback
   - Emit `manual_upload_required` and preserve user context for recovery.

Hard compliance invariant:

1. NuancePad must never attempt bypass behavior under any condition.

### 18.4 End-to-End Processing Architecture

1. Intake
   - User submits transcript/file/link + metadata.
2. Normalization
   - Standardize metadata and input payload.
3. Acquisition
   - Transcript available directly or extracted via authorized adapter.
4. Recovery Branch
   - On blocked access, route to manual upload flow with explicit reason.
5. Intelligence Generation
   - Produce strict JSON contract, validate schema, reject invalid output.
6. Executive Formatting
   - Generate compact tabular MoM for leadership communication.
7. Persistence and Retrieval
   - Save all artifacts and status transitions for history/detail/export.

### 18.5 Adapter Architecture (Pluggable and Isolated)

1. Adapter Contract
   - Input: recording URL, credentials context, metadata.
   - Output: `transcript_found`, `recording_downloaded`, or `manual_upload_required`.
2. Isolation
   - Each platform adapter runs with independent failure containment.
3. Priority Order
   - Webex first, then Zoom, then Generic, then Teams/Google fallback maturity.
4. Deterministic Fallback
   - Any ambiguous/blocked state resolves to manual upload, never to retry loops that risk policy breach.

### 18.6 Reliability and Observability Architecture

1. Status Model
   - `queued`, `processing`, `needs_user_action`, `completed`, `failed`.
2. User-Visible Feedback
   - Every long-running step exposes progress and next action.
3. Retry Model
   - Safe retries for transient failures only; policy blocks are non-retriable and routed to fallback.
4. Auditability
   - Store per-step outcome and compliance reason code for traceability.

### 18.7 Security and Data Governance Architecture

1. Per-user data isolation by authenticated identity.
2. Least-privilege adapter execution model.
3. Artifact lifecycle controls for recordings/transcripts.
4. Redaction-ready logs for enterprise-friendly audit use.

### 18.8 AI-Aware Decomposition (Design For Verifiable Chunks)

Bounded tasks:

1. Input parsing and normalization.
2. Adapter preflight and authorized extraction.
3. Transcript cleanup and segmentation.
4. Structured MoM generation with schema enforcement.
5. Executive table rendering and export formatting.

Verification checkpoints:

1. Schema validity checks.
2. Non-hallucination policy checks.
3. Fallback correctness checks on blocked access paths.

### 18.9 Complete Phased Roadmap (Architecture-Driven)

Phase 0: Architecture Baseline and Refactor Readiness

1. Define module boundaries, status model, and compliance controls.
2. Exit gate: architecture skeleton approved with no code-level ambiguity.

Phase 1: Transcript Intelligence MVP (Primary Value Path)

1. Paste transcript + transcript upload + MoM generation + history/detail/export.
2. Exit gate: executive-ready MoM output works reliably from transcript input.

Phase 2: Recording Upload Intelligence

1. Recording file ingestion + transcription + MoM generation.
2. Exit gate: supported recording formats process end-to-end with robust errors.

Phase 3: Webex Authorized Link Import

1. Link + passcode workflow with strict compliance gating and fallback.
2. Exit gate: at least one valid Webex flow succeeds, blocked cases route safely.

Phase 4: Universal Import Expansion

1. Zoom adapter, Generic adapter, Teams/Google fallback behavior.
2. Exit gate: cross-platform routing produces deterministic outcomes and never bypasses controls.

Phase 5: Corporate Intelligence Layer

1. Templates, action/risk tracking maturity, executive report quality improvements.
2. Exit gate: consistent leadership-grade outputs across meeting types.

Phase 6: Meeting Memory and Retrieval

1. Advanced search/filtering and optional question-answer workflows over stored meetings.
2. Exit gate: users can retrieve decisions/actions quickly across historical meetings.

Phase 7: Enterprise Hardening and Desktop-Local Exploration (Later)

1. Enterprise governance, deployment options, and optional local/desktop architecture exploration.
2. Exit gate: only start after web importer workflows are proven and stable.

### 18.10 Architecture Decision Summary

1. NuancePad is a compliance-safe importer and intelligence system first, not a live recorder.
2. Transcript-first path remains the architectural anchor for speed-to-value.
3. Link import is adapter-driven, policy-guarded, and fallback-first by design.
4. Executive communication format is compact, tabular, and default for sharing.

### 18.11 Live Bot Join Architecture (Future Milestones E/F)

Objective:

Enable Fireflies-style "join from link" behavior while remaining attributable, policy-compliant, and enterprise-safe.

Research-based operating model:

1. Fireflies-style behavior is not URL scraping; it is participant bot join orchestration (calendar/manual/live invite + admit flow).
2. Provider integrations must use official SDK/API paths where available.
3. Join automation must stop at policy barriers and request user action.

Architecture components:

1. Join Orchestrator Service
   - Receives join requests from UI/calendar triggers.
   - Normalizes provider, meeting coordinates, and credential context.
   - Emits lifecycle states (`queued`, `attempting_join`, `waiting_lobby`, `admission_required`, `joined`, `capture_started`, `ended`, `failed`).
2. Bot Identity and Session Manager
   - Manages named bot identities per workspace/org.
   - Handles token issuance/rotation and short-lived provider credentials.
   - Enforces per-tenant join policy (allowlist domains, blocked meeting labels, host-only rules).
3. Provider Join Adapters
   - Zoom adapter: Meeting SDK + OAuth attribution model for out-of-account meetings.
   - Teams adapter: Microsoft Graph Cloud Communications calling/meeting bot path with tenant permissions.
   - Webex adapter: SDK/API-backed meeting join path where allowed, plus recording/transcript API path post-meeting.
   - Google Meet adapter: approved integration surface only (Meet artifacts APIs + add-ons). No undocumented autonomous join bypass path.
4. Admission and Consent Handler
   - Detects and surfaces lobby waiting and host-admit events.
   - Requires explicit user-visible state before capture starts.
   - Supports configurable timeout and auto-abandon rules.
5. Capture and Processing Pipeline
   - Starts capture only after confirmed joined state.
   - Streams transcript/audio segments to Intelligence layer.
   - Produces MoM outputs using existing schema contract.
6. Compliance and Audit Plane
   - Logs who requested join, which policy allowed/blocked it, and timeline of join/capture events.
   - Stores non-sensitive reason codes for every failed/blocked step.

Non-negotiable constraints:

1. No bypass of SSO/CAPTCHA/DRM/tenant controls.
2. No hidden bot identity; bot must be attributable in participant list/lobby.
3. If provider policy requires explicit admit, NuancePad cannot force entry.
4. If provider integration is unavailable, route to transcript/recording upload fallback.

Delivery sequence for live join:

1. E1: Join orchestration + status model + manual live invite UI.
2. E2: Zoom adapter pilot with strict attribution and consent checks.
3. E3: Teams adapter pilot with tenant-admin gated rollout.
4. E4: Webex adapter pilot + admission telemetry.
5. F1: Unified governance controls and org-level bot policies.

Success metrics:

1. Join success rate by provider.
2. Admission-required rate and median admit time.
3. Policy-block rate with top reason codes.
4. Capture start reliability after joined state.
5. Manual fallback conversion (upload after blocked join).

## 19. Research References (Live Join and Provider Access)

1. Fireflies invite/join behavior:
   - https://guide.fireflies.ai/hc/en-us/articles/360020107997-How-to-invite-Fireflies-to-meetings
   - https://fireflies.zendesk.com/hc/en-us/articles/360020248498-How-Fireflies-joins-and-records-your-meetings-FAQs
2. Zoom meeting join and recording access:
   - https://developers.zoom.us/docs/meeting-sdk/
   - https://developers.zoom.us/docs/meeting-sdk/web/component-view/meetings-webinars/
   - https://developers.zoom.us/changelog/meeting-sdk/requiring-authorization-for-meetings-joined-outside-of-an-apps-account/
   - https://developers.zoom.us/docs/api/meetings/
3. Microsoft Teams bot join surfaces:
   - https://learn.microsoft.com/en-us/microsoftteams/platform/bots/calls-and-meetings/real-time-media-concepts
   - https://learn.microsoft.com/en-us/graph/cloud-communications-online-meetings?view=graph-rest-beta
4. Google Meet artifact and integration surfaces:
   - https://developers.google.com/workspace/meet/api/guides/artifacts
   - https://developers.google.com/workspace/meet/api/reference/rest/v2/conferenceRecords.transcripts.entries
   - https://developers.google.com/workspace/meet/add-ons/guides/concepts
5. Webex recording/transcript and meetings APIs:
   - https://developer.webex.com/meeting/docs/api/v1/recordings
   - https://developer.webex.com/docs/api/v1/meeting-transcripts
   - https://developer.webex.com/docs/sdks/webex-meetings-sdk-web-join-a-meeting

## Milestone D Addendum (Implemented)

Date: June 1, 2026

1. Universal authorized import adapters are now defined and implemented for:
   - Webex
   - Zoom (OAuth-gated)
   - Microsoft Teams / Graph (tenant-consent gated)
   - Google Meet / Drive (OAuth-gated)
   - Generic/Other provider hard fallback
2. Adapter outcomes are standardized:
   - `completed`
   - `manual_upload_required`
   - `failed`
3. Reason code set is expanded with provider-safe diagnostics:
   - `oauth_or_scope_missing`
   - `tenant_or_policy_restricted`
   - `policy_blocked_download`
   - `artifact_not_available`
   - `transcript_not_available`
   - `recording_not_available`
   - `provider_unsupported`
   - plus Milestone C reason codes
4. Compliance boundary remains unchanged:
   - No bypass of SSO, CAPTCHA, DRM, disabled downloads, passcodes, tenant controls, or policy controls.
   - Any blocked/interactive path must return `manual_upload_required` with clear user guidance.
5. Corporate intelligence template selection is part of meeting metadata and persistence:
   - Standard MoM
   - Executive Summary
   - Project Status
   - Client Review
   - Risk & Action Tracker
   - Technical Discussion
6. Template selection influences report emphasis only; JSON output schema contract remains unchanged.
7. History/detail/dashboard now include ingestion diagnostics and template analytics.
