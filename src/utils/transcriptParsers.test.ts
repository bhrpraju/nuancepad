import { describe, expect, it } from "vitest";
import { cleanTranscriptForMom, parseTranscriptByFileName } from "./transcriptParsers";

describe("transcript parser", () => {
  it("strips timestamps in srt", () => {
    const raw = "1\n00:00:00,000 --> 00:00:02,000\nHello\n\n2\n00:00:03,000 --> 00:00:04,000\nWorld";
    expect(parseTranscriptByFileName(raw, "meeting.srt")).toBe("Hello\n\nWorld");
  });

  it("strips WEBVTT markup", () => {
    const raw = "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nTeam sync";
    expect(parseTranscriptByFileName(raw, "meeting.vtt")).toBe("Team sync");
  });

  it("keeps plain text for txt", () => {
    expect(parseTranscriptByFileName("line 1\nline 2", "notes.txt")).toBe("line 1\nline 2");
  });

  it("cleans timestamp-only and duplicated lines", () => {
    const raw = `Gauri Sinha
35:51
We are done with updates.
We are done with updates.

Camilo Gaitan
36:04
Bye bye.`;
    expect(cleanTranscriptForMom(raw)).toBe("Gauri Sinha\nWe are done with updates.\n\nCamilo Gaitan\nBye bye.");
  });
});
