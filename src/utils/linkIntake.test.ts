import { describe, expect, it } from "vitest";
import { detectPlatformFromLink, toFriendlyFallbackMessage } from "./linkIntake";

describe("link intake helpers", () => {
  it("detects provider from URL", () => {
    expect(detectPlatformFromLink("https://sutherland.webex.com/recording")).toBe("webex");
    expect(detectPlatformFromLink("https://acme.zoom.us/rec/play/123")).toBe("zoom");
    expect(detectPlatformFromLink("https://teams.microsoft.com/l/meetup-join/abc")).toBe("microsoft_teams");
    expect(detectPlatformFromLink("https://meet.google.com/abc-defg-hij")).toBe("google_meet");
    expect(detectPlatformFromLink("https://example.com/recordings/1")).toBe("other");
  });

  it("maps fallback reasons to user-friendly guidance", () => {
    expect(toFriendlyFallbackMessage("malformed_link")).toMatch(/invalid/i);
    expect(toFriendlyFallbackMessage("sso_or_login_required")).toMatch(/authorized account/i);
    expect(toFriendlyFallbackMessage("unsupported_provider")).toMatch(/not directly importable yet/i);
    expect(toFriendlyFallbackMessage("oauth_or_scope_missing")).toMatch(/permissions/i);
    expect(toFriendlyFallbackMessage("provider_unsupported")).toMatch(/not directly importable yet/i);
  });
});
