# NuancePad Full-Stack Vercel Deploy And Test Guide

Date: May 31, 2026  
Scope: Milestone A + Milestone B (frontend + backend)

## 1. What Gets Deployed

This deployment is full-stack in one Vercel project:

1. Frontend: Vite React app (`dist` output)
2. Backend API routes:
   - `POST /api/generate-report`
   - `POST /api/transcribe-recording`

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

Then open the local URL shown by Vercel and test both transcript and recording flows.

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
GEMINI_MODEL=gemini-1.5-flash
```

Apply to:

1. Preview
2. Production

Important:

1. Do not use `VITE_` prefix for backend secrets.
2. `GEMINI_API_KEY` must remain server-side only.

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

## 10. Negative Tests

1. Upload unsupported file (e.g. `.mov`) -> validation error expected
2. Remove `GEMINI_API_KEY` in Preview env and redeploy -> `AI provider not configured.` expected
3. Remove Firebase vars -> app still functions using local-storage mode

## 11. Go / No-Go Checklist

Go live only if all are true:

1. Deployment `Ready`
2. Transcript flow works end-to-end
3. Recording flow works end-to-end
4. Save/history/detail works
5. Exports work
6. No blocking runtime errors in browser console or Vercel function logs

## 12. Next Hardening Step

1. Add auth checks on `/api/*`
2. Add per-user rate limits
3. Add structured audit logs for compliance
