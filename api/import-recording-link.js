const MAX_TEXT_SIZE = 2 * 1024 * 1024;

const REASONS = {
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
  const lowerUrl = url.toLowerCase();
  const lowerType = String(contentType || "").toLowerCase();
  return (
    lowerUrl.endsWith(".txt") ||
    lowerUrl.endsWith(".vtt") ||
    lowerUrl.endsWith(".srt") ||
    lowerUrl.endsWith(".md") ||
    lowerUrl.endsWith(".csv") ||
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

function buildDiagnostics(provider, attemptedAt, overrides = {}) {
  return {
    detectedPlatform: provider,
    adapter: getAdapterName(provider),
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

function manualGuidance() {
  return "Open the link in your browser, complete access with your authorized account, download/export transcript or recording, then upload it in NuancePad.";
}

async function runWebexAdapter(recordingUrl, passcodeProvided, attemptedAt) {
  try {
    const response = await fetch(recordingUrl, { method: "GET", redirect: "follow" });
    const httpStatus = response.status;
    const responseContentType = String(response.headers.get("content-type") || "");
    const resolvedUrlHost = (() => {
      try {
        return new URL(response.url || recordingUrl).hostname;
      } catch {
        return "";
      }
    })();

    if (httpStatus === 401 || httpStatus === 403) {
      return manual("webex", attemptedAt, REASONS.TENANT_POLICY, manualGuidance(), {
        httpStatus,
        responseContentType,
        resolvedUrlHost
      });
    }

    if (!response.ok) {
      return failed("webex", attemptedAt, REASONS.NETWORK_PROVIDER, "Provider returned an unexpected response. Please retry or upload manually.", {
        httpStatus,
        responseContentType,
        resolvedUrlHost
      });
    }

    if (isProbablyTranscriptResource(recordingUrl, responseContentType)) {
      const transcript = await response.text();
      if (!transcript.trim()) {
        return manual("webex", attemptedAt, REASONS.NO_TRANSCRIPT, manualGuidance(), {
          httpStatus,
          responseContentType,
          resolvedUrlHost
        });
      }
      if (transcript.length > MAX_TEXT_SIZE) {
        return manual("webex", attemptedAt, REASONS.NO_TRANSCRIPT, "Transcript was too large for direct import. Download and upload transcript file manually.", {
          httpStatus,
          responseContentType,
          resolvedUrlHost
        });
      }
      return completed("webex", attemptedAt, transcript, { httpStatus, responseContentType, resolvedUrlHost });
    }

    if (responseContentType.toLowerCase().includes("text/html")) {
      const html = (await response.text()).toLowerCase();
      if (html.includes("captcha")) {
        return manual("webex", attemptedAt, REASONS.CAPTCHA, manualGuidance(), { httpStatus, responseContentType, resolvedUrlHost });
      }
      if (html.includes("disabled download") || html.includes("drm")) {
        return manual("webex", attemptedAt, REASONS.DOWNLOAD_DISABLED, manualGuidance(), {
          httpStatus,
          responseContentType,
          resolvedUrlHost
        });
      }
      if (html.includes("sign in") || html.includes("single sign-on") || html.includes("sso")) {
        return manual("webex", attemptedAt, REASONS.SSO, manualGuidance(), { httpStatus, responseContentType, resolvedUrlHost });
      }
      if (html.includes("recording password") || html.includes("enter the recording password") || passcodeProvided) {
        return manual("webex", attemptedAt, REASONS.INTERACTIVE, manualGuidance(), { httpStatus, responseContentType, resolvedUrlHost });
      }
      return manual("webex", attemptedAt, REASONS.NO_TRANSCRIPT, manualGuidance(), {
        httpStatus,
        responseContentType,
        resolvedUrlHost
      });
    }

    return manual("webex", attemptedAt, REASONS.NO_TRANSCRIPT, manualGuidance(), {
      httpStatus,
      responseContentType,
      resolvedUrlHost
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected provider error.";
    return failed("webex", attemptedAt, REASONS.NETWORK_PROVIDER, "Could not reach Webex link reliably. Retry or upload manually.", {
      message
    });
  }
}

async function runGenericManualAdapter(provider, attemptedAt) {
  const providerLabel = provider === "microsoft_teams" ? "Microsoft Teams" : provider === "google_meet" ? "Google Meet" : provider === "zoom" ? "Zoom" : "This provider";
  return manual(
    provider,
    attemptedAt,
    REASONS.UNSUPPORTED,
    `${providerLabel} direct link import is not enabled for automatic transcript extraction in this Milestone. ${manualGuidance()}`
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    json(res, 405, {
      status: "failed",
      reasonCode: REASONS.NETWORK_PROVIDER,
      message: "Method not allowed.",
      detectedPlatform: "other",
      diagnostics: buildDiagnostics("other", new Date().toISOString(), { message: "Invalid HTTP method" })
    });
    return;
  }

  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
  } catch {
    const attemptedAt = new Date().toISOString();
    json(res, 200, failed("other", attemptedAt, REASONS.MALFORMED, "Request payload is invalid."));
    return;
  }

  const recordingUrl = String(body?.recordingUrl || "").trim();
  const passcode = String(body?.passcode || "").trim();
  const provider = resolveProvider(body?.platform, recordingUrl);
  const attemptedAt = new Date().toISOString();

  if (!recordingUrl) {
    json(res, 200, failed(provider, attemptedAt, REASONS.MALFORMED, "Please provide a valid meeting or recording link."));
    return;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(recordingUrl);
  } catch {
    json(res, 200, failed(provider, attemptedAt, REASONS.MALFORMED, "Please provide a valid meeting or recording link."));
    return;
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    json(res, 200, failed(provider, attemptedAt, REASONS.MALFORMED, "Only secure http/https links are supported."));
    return;
  }

  if (provider === "webex") {
    const result = await runWebexAdapter(recordingUrl, Boolean(passcode), attemptedAt);
    json(res, 200, result);
    return;
  }

  const result = await runGenericManualAdapter(provider, attemptedAt);
  json(res, 200, result);
}
