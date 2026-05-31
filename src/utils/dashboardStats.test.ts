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
  createdAt: "2026-05-31T10:00:00.000Z",
  updatedAt: "2026-05-31T10:00:00.000Z",
  ...overrides
});

describe("buildDashboardStats", () => {
  it("computes weekly/monthly totals and aggregates", () => {
    const meetings = [
      baseMeeting({ meetingDate: "2026-05-31", platform: "Webex", meetingType: "Status Review" }),
      baseMeeting({ meetingDate: "2026-05-30", platform: "Zoom", meetingType: "Internal Sync" }),
      baseMeeting({ meetingDate: "2026-04-12", platform: "Webex", meetingType: "Status Review" })
    ];

    const stats = buildDashboardStats(meetings, new Date("2026-05-31T12:00:00.000Z"));

    expect(stats.totalMeetings).toBe(3);
    expect(stats.meetingsThisWeek).toBe(2);
    expect(stats.meetingsPreviousWeek).toBe(0);
    expect(stats.meetingsThisMonth).toBe(2);
    expect(stats.meetingsPreviousMonth).toBe(1);
    expect(stats.openActionItems).toBe(3);
    expect(stats.completionRate).toBe(0);
    expect(stats.highRisks).toBe(3);
    expect(stats.topPlatforms[0].name).toBe("Webex");
    expect(stats.weeklySeries).toHaveLength(8);
    expect(stats.monthlySeries).toHaveLength(6);
  });
});
