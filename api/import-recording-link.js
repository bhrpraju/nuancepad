const MAX_TEXT_SIZE = 2 * 1024 * 1024;

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function text(res, status, message) {
  res.status(status).setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end(message);
}

function manual(reason, details) {
  return { status: "manual_upload_required", reason, details };
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

function detectHtmlGateReason(html, passcodeProvided) {
  const content = html.toLowerCase();

  if (content.includes("recording password") || content.includes("enter the recording password")) {
    return manual(
      "passcode_entry_required",
      "Provider requires passcode entry inside hosted page. Download transcript or recording manually and upload to NuancePad."
    );
  }

  if (passcodeProvided) {
    return manual(
      "interactive_passcode_or_session_required",
      "Passcode was provided, but the provider still requires interactive browser flow. Open the recording in Webex, then download transcript/recording and upload manually."
    );
  }

  if (content.includes("sign in") || content.includes("single sign-on") || content.includes("sso")) {
    return manual(
      "sso_or_login_required",
      "Provider requires sign-in/SSO. Download transcript or recording with authorized account, then upload manually."
    );
  }

  if (content.includes("captcha")) {
    return manual(
      "captcha_required",
      "Provider requires CAPTCHA verification. Complete access manually, then upload transcript or recording."
    );
  }

  if (content.includes("download") || content.includes("playback")) {
    return manual(
      "download_step_required",
      "Recording page is accessible but transcript is not directly downloadable by API. Download manually and upload."
    );
  }

  return manual(
    "manual_upload_required",
    "NuancePad could not obtain a direct transcript file from this link without bypassing controls. Upload transcript or recording manually."
  );
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      text(res, 405, "Method not allowed");
      return;
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
    const platform = String(body?.platform || "").trim();
    const recordingUrl = String(body?.recordingUrl || "").trim();
    const passcode = String(body?.passcode || "").trim();

    if (!recordingUrl) {
      text(res, 400, "Recording URL is required.");
      return;
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(recordingUrl);
    } catch {
      text(res, 400, "Recording URL is invalid.");
      return;
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      text(res, 400, "Only http/https links are supported.");
      return;
    }

    if (platform && platform.toLowerCase() !== "webex") {
      json(
        res,
        200,
        manual(
          "platform_not_supported_for_link_import",
          "Link import MVP currently supports Webex links. For other platforms, upload transcript or recording manually."
        )
      );
      return;
    }

    // We only attempt direct retrieval using provided URL.
    // We do not automate page interaction, SSO, CAPTCHA, or any bypass mechanism.
    // Passcode is collected for audit/context only in this MVP and not forwarded to third parties.
    void passcode;
    const response = await fetch(recordingUrl, {
      method: "GET",
      redirect: "follow"
    });

    if (response.status === 401 || response.status === 403) {
      json(
        res,
        200,
        manual(
          "access_denied",
          "Access denied by provider controls. Use authorized account to download transcript/recording and upload manually."
        )
      );
      return;
    }

    if (!response.ok) {
      json(
        res,
        200,
        manual("link_unreachable", `Provider returned status ${response.status}. Use manual upload fallback.`)
      );
      return;
    }

    const contentType = response.headers.get("content-type") || "";

    if (isProbablyTranscriptResource(recordingUrl, contentType)) {
      const transcript = await response.text();
      if (!transcript.trim()) {
        json(
          res,
          200,
          manual("empty_transcript_content", "Direct transcript link returned no usable text. Upload transcript manually.")
        );
        return;
      }

      if (transcript.length > MAX_TEXT_SIZE) {
        json(
          res,
          200,
          manual("transcript_too_large", "Transcript file is too large for direct link import. Upload transcript file manually.")
        );
        return;
      }

      json(res, 200, { status: "success", transcript, source: "direct_transcript_link" });
      return;
    }

    if (String(contentType).toLowerCase().includes("text/html")) {
      const html = await response.text();
      json(res, 200, detectHtmlGateReason(html, Boolean(passcode)));
      return;
    }

    json(
      res,
      200,
      manual(
        "direct_file_not_transcript",
        "Link resolved to non-transcript content. Upload transcript or recording file manually."
      )
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    text(res, 500, `Backend error: ${message}`);
  }
}
