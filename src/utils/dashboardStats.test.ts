import { describe, expect, it } from "vitest";
import type { MeetingDocument } from "../domain/meeting";
import { buildDashboardStats } from "./dashboardStats";

const baseMeeting = (overrides: Partial<MeetingDocument>): MeetingDocument => ({
  id: "meeting-id",
  title: "Weekly sync",
  clientProject: "Internal",
  meetingDate: "2026-05-31",
  meetingType: "Status Review",
  platform: "Webex",
  sharedBy: "Ops",
  momTemplate: "standard_mom",
  sourceType: "transcript_paste",
  importStatus: "completed",
  rawTranscript: "...",
  reportJson: {
    title: "Weekly sync",
    attendees: [],
    executiveSummary: "",
    keyDiscussionPoints: [],
    decisions: [],
    actionItems: [{ task: "Task", owner: "Unassigned", dueDate: "Not specified", priority: "High", status: "Open" }],
    risks: [{ risk: "Risk", severity: "High", owner: "Unassigned", mitigation: "", targetDate: "Not specified" }],
    openQuestions: [],
    stakeholderConcerns: [],
    additionalDiscussedItems: [],
    followUpEmail: "",
    tags: []
  },
  usageMetrics: {
    promptTokens: 10,
    outputTokens: 20,
    totalTokens: 30,
    transcriptWordCount: 120
  },
  createdAt: "2026-05-31T10:00:00.000Z",
  updatedAt: "2026-05-31T10:00:00.000Z",
  ...overrides
});

describe("buildDashboardStats", () => {
  it("computes meeting and usage totals with chart series", () => {
    const meetings = [
      baseMeeting({
        meetingDate: "2026-05-31",
        platform: "Webex",
        meetingType: "Status Review",
        linkImportStatus: "completed",
        detectedPlatform: "webex"
      }),
      baseMeeting({
        meetingDate: "2026-05-30",
        platform: "Zoom",
        meetingType: "Internal Sync",
        usageMetrics: { promptTokens: 5, outputTokens: 5, totalTokens: 10, transcriptWordCount: 60 },
        linkImportStatus: "manual_upload_required",
        linkImportReasonCode: "oauth_or_scope_missing",
        detectedPlatform: "zoom"
      }),
      baseMeeting({
        meetingDate: "2026-04-12",
        platform: "Webex",
        meetingType: "Status Review",
        linkImportStatus: "failed",
        linkImportReasonCode: "network_or_provider_error"
      })
    ];

    const stats = buildDashboardStats(meetings, new Date("2026-05-31T12:00:00.000Z"));

    expect(stats.totalMeetings).toBe(3);
    expect(stats.meetingsToday).toBe(1);
    expect(stats.meetingsThisWeek).toBe(2);
    expect(stats.meetingsThisMonth).toBe(2);
    expect(stats.creditsToday).toBe(30);
    expect(stats.creditsThisWeek).toBe(40);
    expect(stats.creditsThisMonth).toBe(40);
    expect(stats.wordsToday).toBe(120);
    expect(stats.wordsThisWeek).toBe(180);
    expect(stats.wordsThisMonth).toBe(180);
    expect(stats.openActionItems).toBe(3);
    expect(stats.highRisks).toBe(3);
    expect(stats.weeklyMeetingSeries).toHaveLength(8);
    expect(stats.monthlyMeetingSeries).toHaveLength(6);
    expect(stats.dailyUsageSeries).toHaveLength(14);
    expect(stats.linkImportsAttempted).toBe(3);
    expect(stats.linkImportsCompleted).toBe(1);
    expect(stats.linkImportsManualUploadRequired).toBe(1);
    expect(stats.linkImportsFailed).toBe(1);
    expect(stats.linkImportFallbackRate).toBe(33.3);
    expect(stats.linkPlatformBreakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "webex", count: 1 }),
        expect.objectContaining({ label: "zoom", count: 1 })
      ])
    );
    expect(stats.linkReasonBreakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "none", count: 1 }),
        expect.objectContaining({ label: "oauth or scope missing", count: 1 }),
        expect.objectContaining({ label: "network or provider error", count: 1 })
      ])
    );
    expect(stats.templateUsageBreakdown).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: "standard mom", count: 3 })])
    );
  });
});
