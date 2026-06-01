const MAX_TEXT_SIZE = 2 * 1024 * 1024;

const REASONS = {
  OAUTH_SCOPE: "oauth_or_scope_missing",
  POLICY_BLOCKED_DOWNLOAD: "policy_blocked_download",
  ARTIFACT_NOT_AVAILABLE: "artifact_not_available",
  TRANSCRIPT_NOT_AVAILABLE: "transcript_not_available",
  RECORDING_NOT_AVAILABLE: "recording_not_available",
  PROVIDER_UNSUPPORTED: "provider_unsupported",
  SSO: "sso_or_login_required",
  INTERACTIVE: "interactive_passcode_or_session_required",
  CAPTCHA: "captcha_or_bot_protection",
  DOWNLOAD_DISABLED: "download_disabled_or_drm_protected",
  TENANT_POLICY: "tenant_or_policy_restricted",
  UNSUPPORTED: "unsupported_provider",
  MALFORMED: "malformed_link",
  NO_TRANSCRIPT: "no_transcript_available",
  NETWORK_PROVIDER: "network_or_provider_error",
  UNKNOWN: "unknown_manual_fallback"
};

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function detectPlatformFromUrl(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("webex.com")) {
      return "webex";
    }
    if (host.includes("zoom.us") || host.includes("zoom.com")) {
      return "zoom";
    }
    if (host.includes("teams.microsoft.com") || host.includes("sharepoint.com") || host.includes("onedrive.com") || host.includes("microsoft.com")) {
      return "microsoft_teams";
    }
    if (host.includes("meet.google.com") || host.includes("drive.google.com") || host.includes("docs.google.com") || host.includes("googleusercontent.com")) {
      return "google_meet";
    }
    return "other";
  } catch {
    return "other";
  }
}

function normalizePlatformLabel(value) {
  const platform = String(value || "").trim().toLowerCase();
  if (platform === "webex") {
    return "webex";
  }
  if (platform === "zoom") {
    return "zoom";
  }
  if (platform === "microsoft teams" || platform === "teams") {
    return "microsoft_teams";
  }
  if (platform === "google meet" || platform === "meet") {
    return "google_meet";
  }
  return "other";
}

function resolveProvider(platform, url) {
  const userChosen = normalizePlatformLabel(platform);
  if (userChosen !== "other") {
    return userChosen;
  }
  return detectPlatformFromUrl(url);
}

function isProbablyTranscriptResource(url, contentType) {
  const lowerUrl = String(url || "").toLowerCase();
  const lowerType = String(contentType || "").toLowerCase();
  return (
    lowerUrl.endsWith(".txt") ||
    lowerUrl.endsWith(".vtt") ||
    lowerUrl.endsWith(".srt") ||
    lowerUrl.endsWith(".md") ||
    lowerUrl.endsWith(".csv") ||
    lowerUrl.includes("format=vtt") ||
    lowerType.includes("text/plain") ||
    lowerType.includes("text/vtt") ||
    lowerType.includes("application/x-subrip") ||
    lowerType.includes("text/markdown") ||
    lowerType.includes("text/csv")
  );
}

function getAdapterName(provider) {
  return `${provider}_link_adapter`;
}

function providerName(provider) {
  if (provider === "microsoft_teams") {
    return "Microsoft Teams";
  }
  if (provider === "google_meet") {
    return "Google Meet";
  }
  if (provider === "webex") {
    return "Webex";
  }
  if (provider === "zoom") {
    return "Zoom";
  }
  return "Other";
}

function buildDiagnostics(provider, attemptedAt, overrides = {}) {
  return {
    detectedPlatform: provider,
    adapter: getAdapterName(provider),
    providerName: providerName(provider),
    attemptedAt,
    ...overrides
  };
}

function manual(provider, attemptedAt, reasonCode, message, diagnostics = {}) {
  return {
    status: "manual_upload_required",
    reasonCode,
    message,
    detectedPlatform: provider,
    diagnostics: buildDiagnostics(provider, attemptedAt, diagnostics)
  };
}

function failed(provider, attemptedAt, reasonCode, message, diagnostics = {}) {
  return {
    status: "failed",
    reasonCode,
    message,
    detectedPlatform: provider,
    diagnostics: buildDiagnostics(provider, attemptedAt, diagnostics)
  };
}

function completed(provider, attemptedAt, transcript, diagnostics = {}) {
  return {
    status: "completed",
    transcript,
    source: "direct_transcript_link",
    detectedPlatform: provider,
    diagnostics: buildDiagnostics(provider, attemptedAt, {
      ...diagnostics,
      completedAt: new Date().toISOString()
    })
  };
}

function manualGuidance(provider) {
  return `Open the ${providerName(provider)} link in your browser, complete access with your authorized account, download/export transcript or recording, then upload it in NuancePad.`;
}

function asString(value) {
  return typeof value === "string" ? value : "";
}

function looksLikeInteractiveGate(htmlLower) {
  return (
    htmlLower.includes("sign in") ||
    htmlLower.includes("single sign-on") ||
    htmlLower.includes("sso") ||
    htmlLower.includes("recording password") ||
    htmlLower.includes("enter the recording password") ||
    htmlLower.includes("verify") ||
    htmlLower.includes("captcha")
  );
}

async function fetchTextFromResponse(response) {
  const text = await response.text();
  if (text.length > MAX_TEXT_SIZE) {
    return "";
  }
  return text;
}

async function attemptDirectTranscriptFetch({ provider, url, attemptedAt, passcodeProvided, headers = {} }) {
  try {
    const response = await fetch(url, { method: "GET", redirect: "follow", headers });
    const httpStatus = response.status;
    const responseContentType = String(response.headers.get("content-type") || "");
    const resolvedUrlHost = (() => {
      try {
        return new URL(response.url || url).hostname;
      } catch {
        return "";
      }
    })();

    const diagnosticBase = {
      httpStatus,
      responseContentType,
      resolvedUrlHost
    };

    if (httpStatus === 401 || httpStatus === 403) {
      return manual(provider, attemptedAt, REASONS.TENANT_POLICY, manualGuidance(provider), {
        ...diagnosticBase,
        summary: "Provider returned authorization or tenant policy restriction."
      });
    }

    if (!response.ok) {
      return failed(provider, attemptedAt, REASONS.NETWORK_PROVIDER, "Provider returned an unexpected response. Please retry or upload manually.", {
        ...diagnosticBase,
        summary: "Provider HTTP response was not successful."
      });
    }

    if (isProbablyTranscriptResource(url, responseContentType)) {
      const transcript = await fetchTextFromResponse(response);
      if (!transcript.trim()) {
        return manual(provider, attemptedAt, REASONS.TRANSCRIPT_NOT_AVAILABLE, manualGuidance(provider), {
          ...diagnosticBase,
          summary: "Transcript resource responded but content was empty."
        });
      }
      return completed(provider, attemptedAt, transcript, {
        ...diagnosticBase,
        summary: "Transcript content imported from provider URL."
      });
    }

    if (responseContentType.toLowerCase().includes("text/html")) {
      const html = (await response.text()).toLowerCase();
      if (html.includes("captcha")) {
        return manual(provider, attemptedAt, REASONS.CAPTCHA, manualGuidance(provider), {
          ...diagnosticBase,
          summary: "Interactive CAPTCHA or anti-bot challenge detected."
        });
      }
      if (html.includes("disabled download") || html.includes("download is disabled") || html.includes("drm")) {
        return manual(provider, attemptedAt, REASONS.DOWNLOAD_DISABLED, manualGuidance(provider), {
          ...diagnosticBase,
          summary: "Provider page indicates download restriction or DRM."
        });
      }
      if (looksLikeInteractiveGate(html) || passcodeProvided) {
        return manual(provider, attemptedAt, REASONS.INTERACTIVE, manualGuidance(provider), {
          ...diagnosticBase,
          summary: "Interactive browser session required after link open."
        });
      }
      return manual(provider, attemptedAt, REASONS.NO_TRANSCRIPT, manualGuidance(provider), {
        ...diagnosticBase,
        summary: "Provider page did not expose direct transcript content."
      });
    }

    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected provider error.";
    return failed(provider, attemptedAt, REASONS.NETWORK_PROVIDER, "Could not reach provider link reliably. Retry or upload manually.", {
      message,
      summary: "Network or provider fetch exception while attempting direct import."
    });
  }
}

function getToken(keys) {
  for (const key of keys) {
    const value = String(process.env[key] || "").trim();
    if (value) {
      return value;
    }
  }
  return "";
}

function extractZoomMeetingId(url) {
  try {
    const parsed = new URL(url);
    const queryMeeting = parsed.searchParams.get("meetingId") || parsed.searchParams.get("mn");
    if (queryMeeting) {
      return queryMeeting;
    }

    const digits = parsed.pathname.match(/\b\d{9,12}\b/);
    if (digits) {
      return digits[0];
    }
    return "";
  } catch {
    return "";
  }
}

function isZoomTranscriptFile(file) {
  const fileType = String(file?.file_type || "").toLowerCase();
  const recordingType = String(file?.recording_type || "").toLowerCase();
  const extension = String(file?.file_extension || "").toLowerCase();
  return (
    fileType.includes("transcript") ||
    recordingType.includes("transcript") ||
    recordingType.includes("closed_caption") ||
    extension === "vtt" ||
    extension === "txt" ||
    extension === "srt"
  );
}

async function runZoomAdapter({ recordingUrl, passcodeProvided, attemptedAt }) {
  const directAttempt = await attemptDirectTranscriptFetch({
    provider: "zoom",
    url: recordingUrl,
    attemptedAt,
    passcodeProvided
  });
  if (directAttempt) {
    return directAttempt;
  }

  const token = getToken(["ZOOM_OAUTH_ACCESS_TOKEN", "ZOOM_ACCESS_TOKEN", "ZOOM_SERVER_TO_SERVER_TOKEN"]);
  if (!token) {
    return manual("zoom", attemptedAt, REASONS.OAUTH_SCOPE, `${providerName("zoom")} API import needs authorized OAuth/scopes. ${manualGuidance("zoom")}`, {
      summary: "Zoom API token/scope not configured on server."
    });
  }

  const meetingId = extractZoomMeetingId(recordingUrl);
  if (!meetingId) {
    return manual("zoom", attemptedAt, REASONS.ARTIFACT_NOT_AVAILABLE, `NuancePad could not map this Zoom link to a recording artifact automatically. ${manualGuidance("zoom")}`, {
      summary: "No meeting identifier was extractable from Zoom URL for API lookup."
    });
  }

  try {
    const listResponse = await fetch(`https://api.zoom.us/v2/meetings/${encodeURIComponent(meetingId)}/recordings`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (listResponse.status === 401 || listResponse.status === 403) {
      return manual("zoom", attemptedAt, REASONS.OAUTH_SCOPE, `${providerName("zoom")} API permissions are missing or expired. ${manualGuidance("zoom")}`, {
        httpStatus: listResponse.status,
        summary: "Zoom API authorization rejected."
      });
    }

    if (listResponse.status === 404) {
      return manual("zoom", attemptedAt, REASONS.ARTIFACT_NOT_AVAILABLE, `No accessible Zoom recording artifact was found for this link. ${manualGuidance("zoom")}`, {
        httpStatus: 404,
        summary: "Zoom API could not find meeting recordings for the derived meeting id."
      });
    }

    if (!listResponse.ok) {
      return failed("zoom", attemptedAt, REASONS.NETWORK_PROVIDER, "Zoom API returned an unexpected response. Retry or upload manually.", {
        httpStatus: listResponse.status,
        summary: "Zoom recordings list endpoint failed."
      });
    }

    const payload = await listResponse.json();
    const files = Array.isArray(payload?.recording_files) ? payload.recording_files : [];
    const transcriptFile = files.find(isZoomTranscriptFile);

    if (!transcriptFile) {
      return manual("zoom", attemptedAt, REASONS.TRANSCRIPT_NOT_AVAILABLE, `Zoom recording exists but transcript artifact is unavailable through current permissions/settings. ${manualGuidance("zoom")}`, {
        summary: "Zoom recordings list returned no transcript-capable file artifacts."
      });
    }

    const downloadUrl = asString(transcriptFile.download_url || transcriptFile.play_url || transcriptFile.file_url);
    if (!downloadUrl) {
      return manual("zoom", attemptedAt, REASONS.ARTIFACT_NOT_AVAILABLE, `Transcript artifact URL is unavailable in Zoom response. ${manualGuidance("zoom")}`, {
        summary: "Zoom transcript artifact lacked a downloadable URL."
      });
    }

    const delimiter = downloadUrl.includes("?") ? "&" : "?";
    const authorizedUrl = `${downloadUrl}${delimiter}access_token=${encodeURIComponent(token)}`;
    const transcriptResponse = await fetch(authorizedUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (transcriptResponse.status === 401 || transcriptResponse.status === 403) {
      return manual("zoom", attemptedAt, REASONS.POLICY_BLOCKED_DOWNLOAD, `${providerName("zoom")} policy blocked API download of this artifact. ${manualGuidance("zoom")}`, {
        httpStatus: transcriptResponse.status,
        summary: "Zoom transcript download URL rejected by policy or permissions."
      });
    }

    if (!transcriptResponse.ok) {
      return failed("zoom", attemptedAt, REASONS.NETWORK_PROVIDER, "Zoom transcript download returned an unexpected response. Retry or upload manually.", {
        httpStatus: transcriptResponse.status,
        summary: "Zoom transcript artifact download failed."
      });
    }

    const transcript = await fetchTextFromResponse(transcriptResponse);
    if (!transcript.trim()) {
      return manual("zoom", attemptedAt, REASONS.TRANSCRIPT_NOT_AVAILABLE, `Zoom transcript content was empty. ${manualGuidance("zoom")}`, {
        summary: "Zoom transcript artifact was fetched but contained no text."
      });
    }

    return completed("zoom", attemptedAt, transcript, {
      summary: "Transcript imported via Zoom API recording artifact."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected Zoom adapter error.";
    return failed("zoom", attemptedAt, REASONS.NETWORK_PROVIDER, "Zoom API import failed due to network/provider error. Retry or upload manually.", {
      message,
      summary: "Unhandled exception while executing Zoom API import workflow."
    });
  }
}

function encodeGraphShareToken(url) {
  const encodedBase64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(url).toString("base64")
      : btoa(unescape(encodeURIComponent(url)));
  const encoded = encodedBase64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `u!${encoded}`;
}

async function runTeamsAdapter({ recordingUrl, passcodeProvided, attemptedAt }) {
  const directAttempt = await attemptDirectTranscriptFetch({
    provider: "microsoft_teams",
    url: recordingUrl,
    attemptedAt,
    passcodeProvided
  });
  if (directAttempt) {
    return directAttempt;
  }

  const token = getToken(["MS_GRAPH_ACCESS_TOKEN", "MICROSOFT_GRAPH_ACCESS_TOKEN", "TEAMS_GRAPH_ACCESS_TOKEN"]);
  if (!token) {
    return manual(
      "microsoft_teams",
      attemptedAt,
      REASONS.OAUTH_SCOPE,
      `${providerName("microsoft_teams")} import needs Microsoft Graph consent/permissions. ${manualGuidance("microsoft_teams")}`,
      { summary: "Microsoft Graph token or consented scope not configured." }
    );
  }

  try {
    const shareToken = encodeGraphShareToken(recordingUrl);
    const itemResponse = await fetch(`https://graph.microsoft.com/v1.0/shares/${shareToken}/driveItem?$select=id,name,file,webUrl`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (itemResponse.status === 401 || itemResponse.status === 403) {
      return manual("microsoft_teams", attemptedAt, REASONS.OAUTH_SCOPE, `${providerName("microsoft_teams")} API permissions are missing or restricted. ${manualGuidance("microsoft_teams")}`, {
        httpStatus: itemResponse.status,
        summary: "Graph share lookup rejected by tenant policy or missing scope."
      });
    }

    if (itemResponse.status === 404) {
      return manual("microsoft_teams", attemptedAt, REASONS.ARTIFACT_NOT_AVAILABLE, `No accessible Teams recording/transcript artifact found from this link. ${manualGuidance("microsoft_teams")}`, {
        httpStatus: 404,
        summary: "Graph could not resolve a drive item from the supplied Teams/SharePoint URL."
      });
    }

    if (!itemResponse.ok) {
      return failed("microsoft_teams", attemptedAt, REASONS.NETWORK_PROVIDER, "Teams import lookup failed. Retry or upload manually.", {
        httpStatus: itemResponse.status,
        summary: "Graph drive item lookup failed unexpectedly."
      });
    }

    const driveItem = await itemResponse.json();
    const contentResponse = await fetch(`https://graph.microsoft.com/v1.0/shares/${shareToken}/driveItem/content`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (contentResponse.status === 401 || contentResponse.status === 403) {
      return manual("microsoft_teams", attemptedAt, REASONS.POLICY_BLOCKED_DOWNLOAD, `${providerName("microsoft_teams")} policy blocked direct artifact download. ${manualGuidance("microsoft_teams")}`, {
        httpStatus: contentResponse.status,
        summary: "Graph resolved artifact but content download was policy-restricted."
      });
    }

    if (!contentResponse.ok) {
      return failed("microsoft_teams", attemptedAt, REASONS.NETWORK_PROVIDER, "Teams artifact download failed. Retry or upload manually.", {
        httpStatus: contentResponse.status,
        summary: "Graph content endpoint returned non-success response."
      });
    }

    const contentType = String(contentResponse.headers.get("content-type") || "").toLowerCase();
    if (!contentType.startsWith("text/") && !contentType.includes("json") && !contentType.includes("vtt")) {
      return manual("microsoft_teams", attemptedAt, REASONS.RECORDING_NOT_AVAILABLE, `The Teams artifact is not a direct transcript file. ${manualGuidance("microsoft_teams")}`, {
        responseContentType: contentType,
        summary: `Graph artifact content type (${contentType || "unknown"}) is not a transcript text format.`
      });
    }

    const transcript = await fetchTextFromResponse(contentResponse);
    if (!transcript.trim()) {
      return manual("microsoft_teams", attemptedAt, REASONS.TRANSCRIPT_NOT_AVAILABLE, `Teams transcript artifact was empty. ${manualGuidance("microsoft_teams")}`, {
        summary: "Teams transcript content returned empty payload."
      });
    }

    return completed("microsoft_teams", attemptedAt, transcript, {
      summary: `Transcript imported through Microsoft Graph shared artifact (${asString(driveItem?.name) || "unnamed"}).`
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected Teams adapter error.";
    return failed("microsoft_teams", attemptedAt, REASONS.NETWORK_PROVIDER, "Microsoft Teams import failed due to network/provider error. Retry or upload manually.", {
      message,
      summary: "Unhandled exception while executing Graph-based Teams import workflow."
    });
  }
}

function extractGoogleDriveFileId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.searchParams.get("id")) {
      return parsed.searchParams.get("id");
    }

    const filePathMatch = parsed.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (filePathMatch) {
      return filePathMatch[1];
    }

    const docsMatch = parsed.pathname.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (docsMatch) {
      return docsMatch[1];
    }

    return "";
  } catch {
    return "";
  }
}

async function runGoogleAdapter({ recordingUrl, passcodeProvided, attemptedAt }) {
  const directAttempt = await attemptDirectTranscriptFetch({
    provider: "google_meet",
    url: recordingUrl,
    attemptedAt,
    passcodeProvided
  });
  if (directAttempt) {
    return directAttempt;
  }

  const token = getToken(["GOOGLE_ACCESS_TOKEN", "GOOGLE_OAUTH_ACCESS_TOKEN", "GOOGLE_DRIVE_ACCESS_TOKEN"]);
  if (!token) {
    return manual("google_meet", attemptedAt, REASONS.OAUTH_SCOPE, `${providerName("google_meet")} import needs authorized Google API access. ${manualGuidance("google_meet")}`, {
      summary: "Google API access token/scope not configured on server."
    });
  }

  const fileId = extractGoogleDriveFileId(recordingUrl);
  if (!fileId) {
    return manual("google_meet", attemptedAt, REASONS.INTERACTIVE, `${providerName("google_meet")} links usually require browser session + Drive artifact resolution. ${manualGuidance("google_meet")}`, {
      summary: "No Drive file id could be extracted from Google Meet/Drive URL for API retrieval."
    });
  }

  try {
    const metadataUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,capabilities(canDownload)&supportsAllDrives=true`;
    const metaResponse = await fetch(metadataUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (metaResponse.status === 401 || metaResponse.status === 403) {
      return manual("google_meet", attemptedAt, REASONS.OAUTH_SCOPE, `${providerName("google_meet")} API permissions are missing or restricted. ${manualGuidance("google_meet")}`, {
        httpStatus: metaResponse.status,
        summary: "Google Drive API metadata lookup denied by permissions or policy."
      });
    }

    if (metaResponse.status === 404) {
      return manual("google_meet", attemptedAt, REASONS.ARTIFACT_NOT_AVAILABLE, `No accessible Google Drive transcript artifact was found for this link. ${manualGuidance("google_meet")}`, {
        httpStatus: 404,
        summary: "Google Drive file was not found for extracted file id."
      });
    }

    if (!metaResponse.ok) {
      return failed("google_meet", attemptedAt, REASONS.NETWORK_PROVIDER, "Google Drive lookup failed. Retry or upload manually.", {
        httpStatus: metaResponse.status,
        summary: "Google Drive metadata endpoint returned unexpected response."
      });
    }

    const fileMeta = await metaResponse.json();
    if (!fileMeta?.capabilities?.canDownload) {
      return manual("google_meet", attemptedAt, REASONS.POLICY_BLOCKED_DOWNLOAD, `${providerName("google_meet")} policy blocks direct download for this artifact. ${manualGuidance("google_meet")}`, {
        summary: "Google Drive reported canDownload=false for selected artifact."
      });
    }

    const mediaUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`;
    const mediaResponse = await fetch(mediaUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (mediaResponse.status === 401 || mediaResponse.status === 403) {
      return manual("google_meet", attemptedAt, REASONS.POLICY_BLOCKED_DOWNLOAD, `${providerName("google_meet")} policy blocked direct artifact download. ${manualGuidance("google_meet")}`, {
        httpStatus: mediaResponse.status,
        summary: "Google Drive media download denied by policy or rights."
      });
    }

    if (!mediaResponse.ok) {
      return failed("google_meet", attemptedAt, REASONS.NETWORK_PROVIDER, "Google Drive artifact download failed. Retry or upload manually.", {
        httpStatus: mediaResponse.status,
        summary: "Google Drive media endpoint returned non-success response."
      });
    }

    const contentType = String(mediaResponse.headers.get("content-type") || "").toLowerCase();
    if (!contentType.startsWith("text/") && !contentType.includes("json") && !contentType.includes("vtt")) {
      return manual("google_meet", attemptedAt, REASONS.RECORDING_NOT_AVAILABLE, `The Google artifact is not a transcript text file. ${manualGuidance("google_meet")}`, {
        responseContentType: contentType,
        summary: `Google artifact content type (${contentType || "unknown"}) is not text transcript format.`
      });
    }

    const transcript = await fetchTextFromResponse(mediaResponse);
    if (!transcript.trim()) {
      return manual("google_meet", attemptedAt, REASONS.TRANSCRIPT_NOT_AVAILABLE, `Google transcript artifact was empty. ${manualGuidance("google_meet")}`, {
        summary: "Google artifact returned empty transcript payload."
      });
    }

    return completed("google_meet", attemptedAt, transcript, {
      summary: `Transcript imported through Google Drive artifact (${asString(fileMeta?.name) || "unnamed"}).`
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected Google adapter error.";
    return failed("google_meet", attemptedAt, REASONS.NETWORK_PROVIDER, "Google Meet/Drive import failed due to network/provider error. Retry or upload manually.", {
      message,
      summary: "Unhandled exception while executing Google Meet/Drive API import workflow."
    });
  }
}

async function runWebexAdapter({ recordingUrl, passcodeProvided, attemptedAt }) {
  const directAttempt = await attemptDirectTranscriptFetch({
    provider: "webex",
    url: recordingUrl,
    attemptedAt,
    passcodeProvided
  });

  if (directAttempt) {
    return directAttempt;
  }

  return manual("webex", attemptedAt, REASONS.NO_TRANSCRIPT, manualGuidance("webex"), {
    summary: "Webex link did not expose direct transcript content and required manual export path."
  });
}

async function runGenericAdapter({ provider, recordingUrl, passcodeProvided, attemptedAt }) {
  const directAttempt = await attemptDirectTranscriptFetch({
    provider,
    url: recordingUrl,
    attemptedAt,
    passcodeProvided
  });
  if (directAttempt) {
    return directAttempt;
  }

  if (provider === "other") {
    return manual(
      "other",
      attemptedAt,
      REASONS.PROVIDER_UNSUPPORTED,
      `This provider is currently unsupported for direct import. ${manualGuidance("other")}`,
      { summary: "Provider URL was categorized as Other and no safe direct import path exists." }
    );
  }

  return manual(provider, attemptedAt, REASONS.UNSUPPORTED, manualGuidance(provider), {
    summary: `${providerName(provider)} adapter did not find a safe direct import path for this URL.`
  });
}

const ADAPTERS = {
  webex: runWebexAdapter,
  zoom: runZoomAdapter,
  microsoft_teams: runTeamsAdapter,
  google_meet: runGoogleAdapter,
  other: runGenericAdapter
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    json(res, 405, {
      status: "failed",
      reasonCode: REASONS.NETWORK_PROVIDER,
      message: "Method not allowed.",
      detectedPlatform: "other",
      diagnostics: buildDiagnostics("other", new Date().toISOString(), {
        summary: "Invalid HTTP method.",
        message: "Method not allowed"
      })
    });
    return;
  }

  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
  } catch {
    const attemptedAt = new Date().toISOString();
    json(res, 200, failed("other", attemptedAt, REASONS.MALFORMED, "Request payload is invalid.", {
      summary: "Request body could not be parsed as JSON."
    }));
    return;
  }

  const recordingUrl = String(body?.recordingUrl || "").trim();
  const passcode = String(body?.passcode || "").trim();
  const provider = resolveProvider(body?.platform, recordingUrl);
  const attemptedAt = new Date().toISOString();

  if (!recordingUrl) {
    json(res, 200, failed(provider, attemptedAt, REASONS.MALFORMED, "Please provide a valid meeting or recording link.", {
      summary: "Recording URL was empty."
    }));
    return;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(recordingUrl);
  } catch {
    json(res, 200, failed(provider, attemptedAt, REASONS.MALFORMED, "Please provide a valid meeting or recording link.", {
      summary: "Recording URL failed URL parsing validation."
    }));
    return;
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    json(res, 200, failed(provider, attemptedAt, REASONS.MALFORMED, "Only secure http/https links are supported.", {
      summary: "Link protocol is unsupported for import workflow."
    }));
    return;
  }

  try {
    const adapter = ADAPTERS[provider] || ADAPTERS.other;
    const result = await adapter({
      provider,
      recordingUrl,
      passcodeProvided: Boolean(passcode),
      attemptedAt
    });
    json(res, 200, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected import adapter error.";
    json(
      res,
      200,
      failed(provider, attemptedAt, REASONS.NETWORK_PROVIDER, "Provider import failed unexpectedly. Retry or upload manually.", {
        message,
        summary: "Unhandled error bubbled from provider adapter dispatch."
      })
    );
  }
}
