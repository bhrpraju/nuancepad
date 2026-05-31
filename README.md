# NuancePad

NuancePad is a corporate-safe meeting intelligence app.

## Milestone A included

- Transcript-first intake (`paste` + upload `.txt/.vtt/.srt/.md/.csv`)
- Structured Minutes of Meeting generation contract
- History and detail views
- Executive-friendly tabular sections
- Export/copy actions

## Milestone B included

- Advanced recording upload mode (`.mp3`, `.wav`, `.m4a`, `.mp4`, `.webm`)
- Recording transcription pipeline before MoM generation
- Same persistence/history/export pipeline as transcript mode
- Explicit processing and error messages for transcription/generation steps

## Milestone C included

- Authorized Webex link intake (`recording link + passcode` fields)
- Safe direct transcript-link import attempt (no bypass behavior)
- Explicit `manual_upload_required` fallback when provider interaction/controls are required

## Compliance boundary

NuancePad only processes authorized content and does not bypass SSO, CAPTCHA, DRM, disabled downloads, passcodes, or company access controls.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Add environment variables in `.env`:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-flash-latest
GEMINI_FALLBACK_MODEL=gemini-2.0-flash
```

If Firebase vars are missing, app runs in local-storage mode.
If backend Gemini key is missing, report generation/transcription return `AI provider not configured.`

## Full-stack runtime (frontend + backend)

NuancePad now uses backend API routes for AI operations:

- `POST /api/generate-report`
- `POST /api/transcribe-recording`

Set backend env vars in Vercel:

```bash
GEMINI_API_KEY=
GEMINI_MODEL=gemini-flash-latest
GEMINI_FALLBACK_MODEL=gemini-2.0-flash
```

For local full-stack testing, use:

```bash
vercel dev
```

## Scripts

```bash
npm run dev
npm run test
npm run typecheck
npm run build
```
