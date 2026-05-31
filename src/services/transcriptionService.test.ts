import { describe, expect, it } from "vitest";
import { isSupportedRecordingFileName, validateRecordingFile } from "./transcriptionService";

describe("transcriptionService validation", () => {
  it("accepts supported recording extensions", () => {
    expect(isSupportedRecordingFileName("sample.mp3")).toBe(true);
    expect(isSupportedRecordingFileName("sample.wav")).toBe(true);
    expect(isSupportedRecordingFileName("sample.m4a")).toBe(true);
    expect(isSupportedRecordingFileName("sample.mp4")).toBe(true);
    expect(isSupportedRecordingFileName("sample.webm")).toBe(true);
  });

  it("rejects unsupported extensions", () => {
    expect(isSupportedRecordingFileName("sample.mov")).toBe(false);

    const file = new File(["test"], "sample.mov", { type: "video/quicktime" });
    expect(() => validateRecordingFile(file)).toThrow("Unsupported recording format");
  });
});
