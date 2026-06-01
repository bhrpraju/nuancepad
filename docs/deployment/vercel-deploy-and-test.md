# NuancePad Full-Stack Vercel Deploy And Test Guide

Date: June 1, 2026  
Scope: Milestone A + Milestone B + Milestone C + Milestone D (frontend + backend)

## 1. What Gets Deployed

This deployment is full-stack in one Vercel project:

1. Frontend: Vite React app (`dist` output)
2. Backend API routes:
   - `POST /api/generate-report`
   - `POST /api/transcribe-recording`
   - `POST /api/import-recording-link`
   - `POST /api/send-meeting-email`

## 2. Prerequisites

1. Node.js 18+ installed.
2. GitHub repo with this project.
3. Vercel account connected to GitHub.
4. Firebase credentials (optional; without them app uses local-storage mode).
5. Gemini API key (required for backend AI endpoints).

## 3. Local Verification (Frontend Build)

```bash
cd /Users/rajendrabh/Documents/NuancePad
npm install
npm run test
npm run typecheck
npm run build
```

Expected:

1. Tests pass
2. Typecheck passes
3. Build passes

## 4. Local Full-Stack Test (Frontend + Backend)

Use Vercel runtime locally so `/api/*` works:

```bash
vercel dev
```

Then open the local URL shown by Vercel and test transcript, recording upload, and multi-provider link import flows.

## 5. Push Code To GitHub

```bash
git add .
git commit -m "feat: full-stack milestone b on vercel api routes"
git push origin main
```

## 6. Create/Configure Vercel Project

1. Vercel Dashboard -> `Add New...` -> `Project`
2. Import NuancePad repo
3. Framework preset: `Vite`
4. Root directory: `/`
5. Build command: `npm run build`
6. Output directory: `dist`

## 7. Add Environment Variables In Vercel

### Frontend variables

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### Backend variables (server-side only)

```bash
GEMINI_API_KEY=
GEMINI_MODEL=gemini-flash-latest
GEMINI_FALLBACK_MODEL=gemini-2.0-flash
RESEND_API_KEY=
EMAIL_FROM=
EMAIL_PROVIDER=gmail
GMAIL_USER=
GMAIL_APP_PASSWORD=
EMAIL_REPLY_TO=
ZOOM_OAUTH_ACCESS_TOKEN=
MS_GRAPH_ACCESS_TOKEN=
GOOGLE_ACCESS_TOKEN=
```

Apply to:

1. Preview
2. Production

Important:

1. Do not use `VITE_` prefix for backend secrets.
2. `GEMINI_API_KEY` must remain server-side only.
3. `GEMINI_FALLBACK_MODEL` is optional but recommended to reduce outage impact during model saturation.
4. For Gmail provider, `GMAIL_APP_PASSWORD` must be a Google App Password generated after enabling 2-Step Verification.
5. For Resend provider, `EMAIL_FROM` must be a sender verified by your Resend account/domain.
6. `ZOOM_OAUTH_ACCESS_TOKEN` enables Zoom cloud recording/transcript API retrieval when permitted.
7. `MS_GRAPH_ACCESS_TOKEN` enables Teams/SharePoint/OneDrive Graph artifact retrieval when tenant permissions allow.
8. `GOOGLE_ACCESS_TOKEN` enables Google Meet/Drive artifact retrieval when permissions allow.

## 8. Deploy

1. Click `Deploy`
2. Wait until status is `Ready`
3. Open preview URL
4. Promote to production after tests pass

## 9. Post-Deploy Smoke Tests

### A. Health

1. Open `/`
2. Open `/meetings/new`
3. Confirm app renders without blank page

### B. Transcript Flow (Milestone A)

1. Enter metadata
2. Paste transcript
3. Click `Generate MoM`
4. Verify tabular sections (decisions/actions/risks/concerns/additional)
5. Click `Save meeting`
6. Verify `/meetings` shows saved item
7. Verify detail page + export actions

### C. Recording Flow (Milestone B)

1. Switch to `Recording upload (advanced)`
2. Upload `.mp3`/`.wav`/`.m4a`/`.mp4`/`.webm`
3. Click `Transcribe & Generate MoM`
4. Verify transcript generation + MoM output
5. Save and confirm in history

### D. Export Flow

1. `Copy summary`
2. `Copy action items`
3. `Copy follow-up email`
4. `Export markdown`
5. Enter recipients and test each backend email action:
   - `Send Full MoM`
   - `Send Action Items`
   - `Send Decisions`
   - `Send Risks & Concerns`
   - `Send Follow-up Email`

### E. Link Intake Flow (Milestone C)

1. Switch to `Recording upload (advanced)`
2. Select `Meeting link import`
3. Paste a link + passcode (if provided)
4. Supported platform expectations:
   - Webex: direct transcript import may complete for transcript URLs; otherwise clear fallback
   - Zoom / Teams / Google Meet / Other: deterministic safe fallback unless direct provider-safe path is supported
5. Click `Generate MoM`
6. Expected result status:
   - `completed`
   - `manual_upload_required`
   - `failed`
7. If fallback is returned, user sees simple next steps:
   - Open link in browser
   - Complete authorized access
   - Download/export transcript or recording
   - Upload into NuancePad

### F. Authorized Provider Expansion (Milestone D)

1. Zoom adapter:
   - Without `ZOOM_OAUTH_ACCESS_TOKEN`: expect `manual_upload_required` + `oauth_or_scope_missing`.
   - With valid token + accessible transcript artifact: may return `completed`.
2. Teams adapter:
   - Without `MS_GRAPH_ACCESS_TOKEN`: expect `manual_upload_required` + `oauth_or_scope_missing`.
   - With valid token + accessible text artifact: may return `completed`.
3. Google Meet/Drive adapter:
   - Without `GOOGLE_ACCESS_TOKEN`: expect `manual_upload_required` + `oauth_or_scope_missing`.
   - With valid token + accessible Drive text artifact: may return `completed`.
4. Ensure no bypass behavior:
   - Interactive gates, policy blocks, or restricted downloads must return manual fallback.

### G. Template Coverage

1. In `New Meeting`, test each template:
   - Standard MoM
   - Executive Summary
   - Project Status
   - Client Review
   - Risk & Action Tracker
   - Technical Discussion
2. Generate + save meetings for selected templates.
3. Confirm template visibility in Meeting History and Meeting Detail.
4. Confirm dashboard template usage metrics update.

## 10. Negative Tests

1. Upload unsupported file (e.g. `.mov`) -> validation error expected
2. Remove `GEMINI_API_KEY` in Preview env and redeploy -> `AI provider not configured.` expected
3. Remove Firebase vars -> app still functions using local-storage mode
4. Use a protected link requiring interactive sign-in/passcode page -> `manual_upload_required` expected
5. Use malformed link -> `failed` with `malformed_link`
6. Remove `RESEND_API_KEY` and click `Send follow-up email` -> `Email provider not configured` expected
7. With provider tokens removed, Zoom/Teams/Google link imports should fail safely with `oauth_or_scope_missing`.

## 11. Go / No-Go Checklist

Go live only if all are true:

1. Deployment `Ready`
2. Transcript flow works end-to-end
3. Recording flow works end-to-end
4. Link intake flow returns deterministic status (`completed`/`manual_upload_required`/`failed`) and clear guidance
5. Provider adapters fail safely when authorization/policy is unavailable
6. Template selection persists and is visible in history/detail/dashboard
7. Save/history/detail works
8. Exports work
9. No blocking runtime errors in browser console or Vercel function logs

## 12. Next Hardening Step

1. Add auth checks on `/api/*`
2. Add per-user rate limits
3. Add structured audit logs for compliance
