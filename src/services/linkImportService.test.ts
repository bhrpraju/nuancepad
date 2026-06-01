import { afterEach, describe, expect, it, vi } from "vitest";
import { linkImportService } from "./linkImportService";

describe("linkImportService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns completed response for transcript import", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "completed",
          transcript: " hello world ",
          source: "direct_transcript_link",
          detectedPlatform: "webex",
          diagnostics: {
            detectedPlatform: "webex",
            adapter: "webex_link_adapter",
            attemptedAt: "2026-06-01T10:00:00.000Z"
          }
        })
      })
    );

    const result = await linkImportService.importAuthorizedLink({
      platform: "Webex",
      recordingUrl: "https://example.webex.com/recording",
      passcode: "123"
    });

    expect(result.status).toBe("completed");
    if (result.status === "completed") {
      expect(result.transcript).toBe("hello world");
    }
  });

  it("returns manual_upload_required response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "manual_upload_required",
          reasonCode: "sso_or_login_required",
          message: "Open in browser and upload manually.",
          detectedPlatform: "webex",
          diagnostics: {
            detectedPlatform: "webex",
            adapter: "webex_link_adapter",
            attemptedAt: "2026-06-01T10:00:00.000Z"
          }
        })
      })
    );

    const result = await linkImportService.importAuthorizedLink({
      platform: "Webex",
      recordingUrl: "https://example.webex.com/recording"
    });

    expect(result.status).toBe("manual_upload_required");
  });

  it("returns failed status for HTTP errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        text: async () => "Upstream unavailable"
      })
    );

    const result = await linkImportService.importAuthorizedLink({
      platform: "Zoom",
      recordingUrl: "https://acme.zoom.us/rec/play/1"
    });

    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.reasonCode).toBe("network_or_provider_error");
    }
  });
});
