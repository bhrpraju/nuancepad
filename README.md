# NuancePad

NuancePad is a corporate-safe meeting intelligence web app that converts existing meeting assets—transcripts, uploaded recordings, and authorized meeting links—into structured, executive-ready Minutes of Meeting.

It is designed for teams that cannot rely on meeting bots, browser extensions, desktop recorders, or tenant-wide admin integrations. NuancePad prioritizes transcript-first workflows, safe recording upload, authorized link intake, structured MoM generation, searchable meeting history, dashboard insights, and export/email-ready outputs.

Core positioning: summaries from the recordings you already have, without bypassing SSO, CAPTCHA, DRM, passcodes, disabled downloads, or company access controls.

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

## Milestone D included

- Universal authorized import adapters expanded with compliance-safe routing:
  - Webex safe link adapter
  - Zoom API-backed adapter when OAuth token/scopes are configured
  - Microsoft Teams / Graph-backed adapter when tenant token/scopes are configured
  - Google Meet + Drive API-backed adapter when authorized token/scopes are configured
  - Generic/Other hard fallback adapter
- Standardized adapter outcomes across providers:
  - `completed`
  - `manual_upload_required`
  - `failed`
- Extended diagnostics persistence:
  - source type
  - final intake method
  - platform
  - import status/reason
  - attempted/completed timestamps
  - adapter/provider summary (safe non-sensitive only)
- Corporate intelligence templates for MoM emphasis (schema remains unchanged):
  - Standard MoM
  - Executive Summary
  - Project Status
  - Client Review
  - Risk & Action Tracker
  - Technical Discussion

## Email actions

After MoM generation, NuancePad supports backend email send options:

- Send Full MoM
- Send Action Items
- Send Decisions
- Send Risks & Concerns
- Send Follow-up Email

Email formatting expectation:

1. `Open email client` uses `mailto:` and opens your local mail app with a plain-text draft. Complex HTML table formatting is not preserved in this path.
2. Backend `Send ...` actions send structured HTML + text email content, and should be used for executive-ready formatted MoM delivery.

## Compliance boundary

NuancePad only processes authorized content and does not bypass SSO, CAPTCHA, DRM, disabled downloads, passcodes, or company access controls.

Milestone C/D fallback reason codes:

- `oauth_or_scope_missing`
- `policy_blocked_download`
- `artifact_not_available`
- `transcript_not_available`
- `recording_not_available`
- `provider_unsupported`
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
AI_PROVIDER_ORDER=deepseek,openai
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_FALLBACK_MODEL=deepseek-v4-pro
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OPENAI_FALLBACK_MODEL=gpt-4.1-mini
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

If Firebase vars are missing, app runs in local-storage mode.
If DeepSeek vars are missing, MoM generation skips DeepSeek and tries OpenAI.
If all report-generation provider keys are missing, report generation returns `AI provider not configured.`
Gemini is no longer used for MoM generation and old Gemini report env vars are ignored.
Recording transcription is a separate endpoint and is unchanged by this provider-router update.

## Full-stack runtime (frontend + backend)

NuancePad now uses backend API routes for AI operations:

- `POST /api/generate-report`
- `POST /api/transcribe-recording`
- `POST /api/send-meeting-email`

MoM generation provider routing:

1. `AI_PROVIDER_ORDER=deepseek,openai` tries DeepSeek first and OpenAI second.
2. DeepSeek primary model: `deepseek-v4-flash`.
3. DeepSeek fallback model: `deepseek-v4-pro`.
4. Deprecated DeepSeek model names `deepseek-chat` and `deepseek-reasoner` are not used.
5. OpenAI primary fallback model: `gpt-4o-mini`.
6. OpenAI secondary fallback model: `gpt-4.1-mini`.
7. Gemini env vars are ignored for MoM generation even if they still exist in Vercel.

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
AI_PROVIDER_ORDER=deepseek,openai
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_FALLBACK_MODEL=deepseek-v4-pro
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OPENAI_FALLBACK_MODEL=gpt-4.1-mini
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

Provider token notes:

1. `ZOOM_OAUTH_ACCESS_TOKEN`: required for Zoom API cloud recording/transcript lookup path.
2. `MS_GRAPH_ACCESS_TOKEN`: required for Teams/SharePoint/OneDrive Graph artifact retrieval path.
3. `GOOGLE_ACCESS_TOKEN`: required for Google Drive artifact retrieval path (Meet artifacts routed through Drive where applicable).

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
