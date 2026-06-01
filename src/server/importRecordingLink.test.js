import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../api/import-recording-link.js";

const buildRes = () => {
  const response = {
    statusCode: 200,
    headers: {},
    body: "",
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(key, value) {
      this.headers[key] = value;
      return this;
    },
    end(payload) {
      this.body = payload;
      return this;
    }
  };
  return response;
};

const runRequest = async (body) => {
  const req = { method: "POST", body };
  const res = buildRes();
  await handler(req, res);
  return JSON.parse(res.body);
};

describe("import-recording-link API", () => {
  beforeEach(() => {
    delete process.env.ZOOM_OAUTH_ACCESS_TOKEN;
    delete process.env.ZOOM_ACCESS_TOKEN;
    delete process.env.ZOOM_SERVER_TO_SERVER_TOKEN;
    delete process.env.MS_GRAPH_ACCESS_TOKEN;
    delete process.env.MICROSOFT_GRAPH_ACCESS_TOKEN;
    delete process.env.TEAMS_GRAPH_ACCESS_TOKEN;
    delete process.env.GOOGLE_ACCESS_TOKEN;
    delete process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
    delete process.env.GOOGLE_DRIVE_ACCESS_TOKEN;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns failed with malformed_link for invalid URL", async () => {
    const payload = await runRequest({ platform: "Webex", recordingUrl: "not-a-url" });
    expect(payload.status).toBe("failed");
    expect(payload.reasonCode).toBe("malformed_link");
  });

  it("returns completed when Webex direct transcript content is retrievable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        url: "https://sutherland.webex.com/transcript.vtt",
        headers: { get: () => "text/vtt" },
        text: async () => "Speaker 1: Hello"
      })
    );

    const payload = await runRequest({
      platform: "Webex",
      recordingUrl: "https://sutherland.webex.com/transcript.vtt",
      passcode: "abc"
    });

    expect(payload.status).toBe("completed");
    expect(payload.detectedPlatform).toBe("webex");
    expect(payload.transcript).toContain("Hello");
  });

  it("returns manual_upload_required when Zoom OAuth is not configured", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      url: "https://acme.zoom.us/rec/play/1",
      headers: { get: () => "application/octet-stream" }
    });
    vi.stubGlobal("fetch", mockFetch);

    const payload = await runRequest({
      platform: "Zoom",
      recordingUrl: "https://acme.zoom.us/rec/play/1"
    });

    expect(payload.status).toBe("manual_upload_required");
    expect(payload.reasonCode).toBe("oauth_or_scope_missing");
    expect(payload.detectedPlatform).toBe("zoom");
  });

  it("returns completed when Zoom API transcript artifact is available", async () => {
    process.env.ZOOM_OAUTH_ACCESS_TOKEN = "zoom-token";

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          url: "https://acme.zoom.us/rec/play/12345678901",
          headers: { get: () => "application/octet-stream" }
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            recording_files: [
              { file_type: "TRANSCRIPT", download_url: "https://api.zoom.us/recording/download/transcript-file" }
            ]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: () => "text/vtt" },
          text: async () => "WEBVTT\nSpeaker A: update"
        })
    );

    const payload = await runRequest({
      platform: "Zoom",
      recordingUrl: "https://acme.zoom.us/rec/play/12345678901"
    });

    expect(payload.status).toBe("completed");
    expect(payload.detectedPlatform).toBe("zoom");
    expect(payload.transcript).toMatch(/Speaker A/);
  });

  it("returns manual_upload_required when Teams Graph token is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        url: "https://contoso.sharepoint.com/sites/a/recording.mp4",
        headers: { get: () => "application/octet-stream" }
      })
    );

    const payload = await runRequest({
      platform: "Microsoft Teams",
      recordingUrl: "https://contoso.sharepoint.com/sites/a/recording.mp4"
    });

    expect(payload.status).toBe("manual_upload_required");
    expect(payload.reasonCode).toBe("oauth_or_scope_missing");
    expect(payload.detectedPlatform).toBe("microsoft_teams");
  });

  it("returns completed when Teams Graph shared artifact is text transcript", async () => {
    process.env.MS_GRAPH_ACCESS_TOKEN = "graph-token";

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          url: "https://contoso.sharepoint.com/sites/a/recording.mp4",
          headers: { get: () => "application/octet-stream" }
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ id: "x1", name: "meeting-transcript.vtt" })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: () => "text/vtt" },
          text: async () => "WEBVTT\nSpeaker: status update"
        })
    );

    const payload = await runRequest({
      platform: "Microsoft Teams",
      recordingUrl: "https://contoso.sharepoint.com/sites/a/recording.mp4"
    });

    expect(payload.status).toBe("completed");
    expect(payload.detectedPlatform).toBe("microsoft_teams");
    expect(payload.transcript).toContain("status update");
  });

  it("returns manual_upload_required when Google API token is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        url: "https://drive.google.com/file/d/abc123/view",
        headers: { get: () => "application/octet-stream" }
      })
    );

    const payload = await runRequest({
      platform: "Google Meet",
      recordingUrl: "https://drive.google.com/file/d/abc123/view"
    });

    expect(payload.status).toBe("manual_upload_required");
    expect(payload.reasonCode).toBe("oauth_or_scope_missing");
    expect(payload.detectedPlatform).toBe("google_meet");
  });

  it("returns completed when Google Drive API transcript artifact is available", async () => {
    process.env.GOOGLE_ACCESS_TOKEN = "google-token";

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          url: "https://drive.google.com/file/d/abc123/view",
          headers: { get: () => "application/octet-stream" }
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            id: "abc123",
            name: "meeting-transcript.vtt",
            capabilities: { canDownload: true }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: () => "text/vtt" },
          text: async () => "WEBVTT\nSpeaker B: roadmap"
        })
    );

    const payload = await runRequest({
      platform: "Google Meet",
      recordingUrl: "https://drive.google.com/file/d/abc123/view"
    });

    expect(payload.status).toBe("completed");
    expect(payload.detectedPlatform).toBe("google_meet");
    expect(payload.transcript).toContain("roadmap");
  });

  it("returns manual_upload_required for unsupported other provider", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        url: "https://example.com/recordings/123",
        headers: { get: () => "application/octet-stream" }
      })
    );

    const payload = await runRequest({
      platform: "Other",
      recordingUrl: "https://example.com/recordings/123"
    });

    expect(payload.status).toBe("manual_upload_required");
    expect(payload.reasonCode).toBe("provider_unsupported");
    expect(payload.detectedPlatform).toBe("other");
  });
});
