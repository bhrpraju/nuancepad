# NuancePad State

Last Updated: June 8, 2026 (IST)
Owner: Rajendra
Project Mode: Build paused after Milestone D (intentional hold)

## 1. Executive Snapshot

NuancePad is stable through Milestone D and already solves the active use case:
- Generate executive-ready MoM from transcript/recording inputs.
- Save, review, search, export, and email MoM outputs.
- Safely handle provider links with compliance-safe fallback.

Decision taken on June 1, 2026:
- Milestones E+ are on hold.
- No additional spend should be incurred for provider APIs/bot-join work unless ROI is clear.

## 2. Milestone Status

1. Milestone A (Transcript Intelligence MVP): Completed
2. Milestone B (Recording Upload MVP): Completed
3. Milestone C (Safe Deterministic Link Intake): Completed
4. Milestone D (Universal Authorized Import + Intelligence Expansion): Completed in code and tested
5. Milestone E (Live Meeting Bot Join): On Hold
6. Milestone F (Provider-Native Bot + Compliance Hardening): On Hold

## 3. What Is Working (A-D)

### 3.1 Intake and Generation

1. Paste transcript flow.
2. Transcript file upload flow (`.txt`, `.vtt`, `.srt`, `.md`, `.csv`).
3. Recording file upload flow (`.mp3`, `.wav`, `.m4a`, `.mp4`, `.webm`).
4. Recording transcription + transcript cleaning.
5. MoM generation against fixed JSON contract.
6. MoM generation now routes through DeepSeek primary with OpenAI fallback.

### 3.2 Link Intake (Safe/Deterministic)

1. One clean link import flow with optional passcode.
2. Platform detection and routing:
   - Webex
   - Zoom
   - Microsoft Teams
   - Google Meet
   - Other
3. Standard outcomes:
   - `completed`
   - `manual_upload_required`
   - `failed`
4. Clear reason codes and fallback guidance.
5. No bypass behavior (SSO/CAPTCHA/DRM/login/policy restrictions respected).

### 3.3 Persistence and Views

1. Reliable save flow with visible status.
2. Firebase primary storage when configured.
3. Local-storage fallback when Firebase unavailable/fails.
4. Meeting History list + filters.
5. Meeting Detail with ingestion diagnostics.
6. Dashboard KPI cards and trend charts.

### 3.4 Export and Email

1. Copy summary.
2. Copy action items.
3. Copy follow-up email.
4. Export markdown.
5. Modular email actions:
   - Send Full MoM
   - Send Action Items
   - Send Decisions
   - Send Risks & Concerns
   - Send Follow-up Email
6. Backend email send path supports structured HTML and text bodies.
7. `Open email client` (`mailto`) intentionally opens plain-text draft (documented in README).

### 3.5 Template Support

MoM template selector implemented and persisted:
1. Standard MoM
2. Executive Summary
3. Project Status
4. Client Review
5. Risk & Action Tracker
6. Technical Discussion

## 4. Compliance and Security Boundary (Current)

NuancePad only processes content user is authorized to access.

Explicit non-goals in current implementation:
1. No live meeting bot auto-join.
2. No hidden participant/bot identity behavior.
3. No SSO bypass.
4. No CAPTCHA bypass.
5. No passcode/session wall bypass.
6. No DRM/disabled download bypass.
7. No tenant policy bypass.

If blocked, system must return deterministic fallback (`manual_upload_required`) with user action steps.

## 5. Import Diagnostics Captured

Per meeting (safe, non-sensitive):
1. `sourceType`
2. `finalIntakeMethod`
3. `detectedPlatform`
4. `linkImportStatus`
5. `linkImportReasonCode`
6. `linkImportAttemptedAt`
7. `linkImportCompletedAt`
8. `linkImportDiagnostics` (adapter/provider summary, HTTP context where available)

Never stored:
1. Passcodes
2. OAuth access tokens
3. Provider secrets

## 6. Dashboard Coverage (Current)

### 6.1 Meeting and Usage KPIs

1. Meetings: today / this week / this month / overall
2. Credits usage: today / this week / this month
3. Word conversion: today / this week / this month
4. Trends: meeting trend, credits trend, monthly meetings

### 6.2 Intake Intelligence KPIs

1. Imports attempted
2. Imports completed
3. Manual upload required
4. Failed imports
5. Fallback rate
6. Platform breakdown
7. Reason-code breakdown
8. Template usage breakdown

## 7. Provider Adapter Behavior (Milestone D)

### 7.1 Webex

1. Attempts safe direct transcript retrieval when possible.
2. Falls back safely for interactive or restricted pages.

### 7.2 Zoom

1. OAuth-token gated API path implemented.
2. Missing/invalid scope or policy constraints => safe manual fallback.

### 7.3 Microsoft Teams

1. Graph-token gated artifact retrieval path implemented.
2. Tenant permission/policy/download constraints => safe manual fallback.

### 7.4 Google Meet / Drive

1. OAuth-token gated Drive artifact retrieval path implemented.
2. Access/policy/download constraints => safe manual fallback.

### 7.5 Other

1. Hardened generic handling.
2. Unsupported/protected/malformed links return deterministic non-bypass outcomes.

## 8. Cost Posture (Current Decision)

To minimize cost now:
1. Keep provider API tokens unset unless needed.
2. Run transcript-first/manual upload workflows.
3. Use local storage mode if Firebase is not required.
4. Use backend email only when needed; otherwise `Open email client` is sufficient.
5. Avoid unnecessary regenerate loops.

Result:
- Product remains usable and safe with near-zero incremental provider API cost.

## 9. Known Limitations (Accepted)

1. Direct provider import depends on authorized API credentials and permissions.
2. Many shared playback links require interactive browser context and cannot be imported server-side safely.
3. `mailto` path cannot preserve full HTML table formatting.
4. Vite build shows chunk-size warning (>500KB) but build passes.

## 10. Testing and Verification Status

Latest local verification completed on June 1, 2026:
1. `npm run test` passed
2. `npm run typecheck` passed
3. `npm run build` passed

Milestone D production token-path gate status:
- Deferred intentionally due cost-control decision.

## 11. Deployment and Environment Notes

### 11.1 Core Env Vars

Frontend:
1. `VITE_FIREBASE_API_KEY`
2. `VITE_FIREBASE_AUTH_DOMAIN`
3. `VITE_FIREBASE_PROJECT_ID`
4. `VITE_FIREBASE_STORAGE_BUCKET`
5. `VITE_FIREBASE_MESSAGING_SENDER_ID`
6. `VITE_FIREBASE_APP_ID`

Backend:
1. `AI_PROVIDER_ORDER=deepseek,openai`
2. `DEEPSEEK_API_KEY`
3. `DEEPSEEK_MODEL=deepseek-v4-flash`
4. `DEEPSEEK_FALLBACK_MODEL=deepseek-v4-pro`
5. `OPENAI_API_KEY`
6. `OPENAI_MODEL=gpt-4o-mini`
7. `OPENAI_FALLBACK_MODEL=gpt-4.1-mini`
8. `EMAIL_PROVIDER`
9. `GMAIL_USER`
10. `GMAIL_APP_PASSWORD`
11. `EMAIL_FROM`
12. `EMAIL_REPLY_TO`
13. `RESEND_API_KEY` (if using Resend path)

Optional provider import tokens (currently optional/on hold):
1. `ZOOM_OAUTH_ACCESS_TOKEN` (or equivalent)
2. `MS_GRAPH_ACCESS_TOKEN` (or equivalent)
3. `GOOGLE_ACCESS_TOKEN` (or equivalent)

### 11.2 Storage Mode

1. Firebase configured => primary persistence in Firebase.
2. Firebase missing/fails => local browser storage fallback.

## 12. Files to Read First When Resuming

1. `README.md`
2. `docs/deployment/vercel-deploy-and-test.md`
3. `docs/superpowers/specs/2026-05-31-nuancepad-product-spec.md`
4. `state.md` (this file)
5. Core implementation files:
   - `api/import-recording-link.js`
   - `api/generate-report.js`
   - `src/pages/NewMeeting.tsx`
   - `src/services/meetingService.ts`
   - `src/utils/dashboardStats.ts`

## 13. Resume Plan (When Restarting)

If continuing with no additional spend:
1. Keep Milestone D baseline.
2. Focus on UX polish/performance/documentation only.

If continuing to Milestone E (later):
1. Reconfirm compliance/legal constraints per provider.
2. Decide scope for explicit/attributed bot-join only.
3. Add gated architecture spec before coding.
4. Re-run full regression after any E changes.

## 14. Final Project Decision for This Pause

Milestone D is sufficient for current needs.
Project is intentionally paused to avoid spending on capabilities that may not be used immediately.
Resume only when there is clear business need for live-join or deeper enterprise integrations.
