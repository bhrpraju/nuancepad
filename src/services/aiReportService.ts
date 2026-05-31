import type { MeetingMetadata, MeetingReport } from "../domain/meeting";
import { normalizeMeetingReport } from "../utils/meetingSchema";

export const aiReportService = {
  async generateMeetingReport(transcript: string, metadata: MeetingMetadata): Promise<MeetingReport> {
    const response = await fetch("/api/generate-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, metadata })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Failed to generate meeting report.");
    }

    const parsed = (await response.json()) as Partial<MeetingReport>;
    return normalizeMeetingReport({ ...parsed, title: parsed.title || metadata.title });
  }
};
