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

- Unified meeting-link intake (`link + optional passcode`) for:
  - Webex
  - Zoom
  - Microsoft Teams
  - Google Meet
  - Other
- Provider detection and adapter routing with standardized outcomes:
  - `completed`
  - `manual_upload_required`
  - `failed`
- Safe deterministic fallback guidance:
  - Open in browser
  - Complete authorized access
  - Download/export transcript or recording
  - Upload into NuancePad
- Persisted link-intake diagnostics (no passcode/secret persistence):
  - detected platform
  - link import status
  - fallback reason code
  - attempted/completed timestamps

## Email actions

After MoM generation, NuancePad supports backend email send options:

- Send Full MoM
- Send Action Items
- Send Decisions
- Send Risks & Concerns
- Send Follow-up Email

## Compliance boundary

NuancePad only processes authorized content and does not bypass SSO, CAPTCHA, DRM, disabled downloads, passcodes, or company access controls.

Milestone C fallback reason codes:

- `sso_or_login_required`
- `interactive_passcode_or_session_required`
- `captcha_or_bot_protection`
- `download_disabled_or_drm_protected`
- `tenant_or_policy_restricted`
- `unsupported_provider`
- `malformed_link`
- `no_transcript_available`
- `network_or_provider_error`
- `unknown_manual_fallback`

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
RESEND_API_KEY=
EMAIL_FROM=
EMAIL_PROVIDER=gmail
GMAIL_USER=
GMAIL_APP_PASSWORD=
EMAIL_REPLY_TO=
```

If Firebase vars are missing, app runs in local-storage mode.
If backend Gemini key is missing, report generation/transcription return `AI provider not configured.`

## Full-stack runtime (frontend + backend)

NuancePad now uses backend API routes for AI operations:

- `POST /api/generate-report`
- `POST /api/transcribe-recording`
- `POST /api/send-meeting-email`

Email provider options:

1. Gmail SMTP (recommended for your setup)
   - `EMAIL_PROVIDER=gmail`
   - `GMAIL_USER` = your Gmail address
   - `GMAIL_APP_PASSWORD` = Google App Password (not your normal Gmail password)
   - `EMAIL_FROM` = sender address (usually same as `GMAIL_USER`)
2. Resend
   - `EMAIL_PROVIDER=resend`
   - `RESEND_API_KEY`
   - `EMAIL_FROM` on verified domain

Set backend env vars in Vercel:

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
