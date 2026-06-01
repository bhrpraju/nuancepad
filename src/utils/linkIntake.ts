import type { LinkDetectedPlatform, LinkImportReasonCode, MomTemplate } from "../domain/meeting";

export const SUPPORTED_LINK_PLATFORMS = ["Webex", "Zoom", "Microsoft Teams", "Google Meet", "Other"] as const;
export const MOM_TEMPLATES: Array<{ value: MomTemplate; label: string }> = [
  { value: "standard_mom", label: "Standard MoM" },
  { value: "executive_summary", label: "Executive Summary" },
  { value: "project_status", label: "Project Status" },
  { value: "client_review", label: "Client Review" },
  { value: "risk_action_tracker", label: "Risk & Action Tracker" },
  { value: "technical_discussion", label: "Technical Discussion" }
];

export const detectPlatformFromLink = (link: string): LinkDetectedPlatform => {
  try {
    const { hostname } = new URL(link);
    const host = hostname.toLowerCase();

    if (host.includes("webex.com")) {
      return "webex";
    }
    if (host.includes("zoom.us") || host.includes("zoom.com")) {
      return "zoom";
    }
    if (host.includes("teams.microsoft.com") || host.includes("sharepoint.com") || host.includes("onedrive.com")) {
      return "microsoft_teams";
    }
    if (host.includes("meet.google.com") || host.includes("drive.google.com") || host.includes("docs.google.com")) {
      return "google_meet";
    }
    return "other";
  } catch {
    return "other";
  }
};

export const toDetectedPlatformFromLabel = (platform: string): LinkDetectedPlatform => {
  const value = platform.trim().toLowerCase();
  if (value === "webex") {
    return "webex";
  }
  if (value === "zoom") {
    return "zoom";
  }
  if (value === "microsoft teams" || value === "teams") {
    return "microsoft_teams";
  }
  if (value === "google meet" || value === "meet") {
    return "google_meet";
  }
  return "other";
};

export const linkSourceLabel = (sourceType: string): string => {
  if (sourceType === "transcript_paste") {
    return "Pasted transcript";
  }
  if (sourceType === "transcript_file") {
    return "Uploaded transcript";
  }
  if (sourceType === "recording_file") {
    return "Uploaded recording";
  }
  if (sourceType === "recording_link") {
    return "Link import";
  }
  if (sourceType === "manual_fallback_after_link") {
    return "Manual fallback after link attempt";
  }
  return "Unknown source";
};

export const toFriendlyFallbackMessage = (reason: LinkImportReasonCode): string => {
  if (reason === "malformed_link") {
    return "The link format looks invalid. Please check the URL and try again.";
  }
  if (reason === "unsupported_provider" || reason === "provider_unsupported") {
    return "This provider link is not directly importable yet. Open with your authorized account, export transcript or recording, and upload it in NuancePad.";
  }
  if (reason === "no_transcript_available" || reason === "transcript_not_available") {
    return "NuancePad could not safely fetch transcript text from this link. Open the link in your browser, download transcript or recording, and upload it here.";
  }
  if (reason === "oauth_or_scope_missing") {
    return "Your organization connection is missing required permissions. Open the provider link with your authorized account, download/export transcript or recording, then upload it in NuancePad.";
  }
  if (reason === "artifact_not_available" || reason === "recording_not_available") {
    return "NuancePad could not find an accessible transcript or recording artifact from this link. Open the provider link, export the artifact, and upload it here.";
  }
  if (reason === "policy_blocked_download") {
    return "Your provider policy currently blocks direct download through API import. Use your authorized account to export transcript or recording, then upload it in NuancePad.";
  }
  if (reason === "sso_or_login_required" || reason === "interactive_passcode_or_session_required") {
    return "Open the link in your browser, complete access with your authorized account, download transcript or recording, then upload it in NuancePad.";
  }
  if (reason === "captcha_or_bot_protection") {
    return "The provider requires a browser verification step. Open the link in your browser, complete access, then upload transcript or recording.";
  }
  if (reason === "download_disabled_or_drm_protected" || reason === "tenant_or_policy_restricted") {
    return "Your organization policy prevents direct download. Use your authorized account to export transcript or recording, then upload it in NuancePad.";
  }
  if (reason === "network_or_provider_error") {
    return "NuancePad could not reach the provider reliably. Please try again, or use transcript/recording upload.";
  }
  return "NuancePad could not import this link safely. Open it in your browser, complete access, download transcript or recording, and upload it here.";
};
