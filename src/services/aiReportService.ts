import type { MeetingMetadata, MeetingReport, UsageMetrics } from "../domain/meeting";
import { normalizeMeetingReport } from "../utils/meetingSchema";

export interface ReportGenerationResult {
  report: MeetingReport;
  usage: Pick<UsageMetrics, "provider" | "model" | "promptTokens" | "outputTokens" | "totalTokens">;
}

export const aiReportService = {
  async generateMeetingReport(transcript: string, metadata: MeetingMetadata): Promise<ReportGenerationResult> {
    const response = await fetch("/api/generate-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, metadata })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Failed to generate meeting report.");
    }

    const parsed = (await response.json()) as unknown;
    const wrapped = parsed && typeof parsed === "object" && ("report" in parsed || "usage" in parsed);
    const wrapper = wrapped ? (parsed as { report?: Partial<MeetingReport>; usage?: Partial<UsageMetrics> }) : null;
    const reportPayload = wrapper?.report ?? ((parsed as Partial<MeetingReport>) || {});
    const usagePayload = wrapper?.usage ?? {};

    return {
      report: normalizeMeetingReport({ ...reportPayload, title: reportPayload.title || metadata.title }),
      usage: {
        provider: typeof usagePayload.provider === "string" ? usagePayload.provider : undefined,
        model: typeof usagePayload.model === "string" ? usagePayload.model : undefined,
        promptTokens: Number(usagePayload.promptTokens || 0),
        outputTokens: Number(usagePayload.outputTokens || 0),
        totalTokens: Number(usagePayload.totalTokens || 0)
      }
    };
  }
};
