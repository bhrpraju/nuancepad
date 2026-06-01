import { afterEach, describe, expect, it, vi } from "vitest";
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

describe("import-recording-link API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns failed with malformed_link for invalid URL", async () => {
    const req = { method: "POST", body: { platform: "Webex", recordingUrl: "not-a-url" } };
    const res = buildRes();
    await handler(req, res);
    const payload = JSON.parse(res.body);
    expect(payload.status).toBe("failed");
    expect(payload.reasonCode).toBe("malformed_link");
  });

  it("returns manual_upload_required for unsupported provider adapters", async () => {
    const req = { method: "POST", body: { platform: "Zoom", recordingUrl: "https://acme.zoom.us/rec/play/1" } };
    const res = buildRes();
    await handler(req, res);
    const payload = JSON.parse(res.body);
    expect(payload.status).toBe("manual_upload_required");
    expect(payload.reasonCode).toBe("unsupported_provider");
    expect(payload.detectedPlatform).toBe("zoom");
  });

  it("returns completed when direct transcript content is retrievable", async () => {
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

    const req = {
      method: "POST",
      body: { platform: "Webex", recordingUrl: "https://sutherland.webex.com/transcript.vtt", passcode: "abc" }
    };
    const res = buildRes();
    await handler(req, res);
    const payload = JSON.parse(res.body);
    expect(payload.status).toBe("completed");
    expect(payload.detectedPlatform).toBe("webex");
    expect(payload.transcript).toContain("Hello");
  });
});
