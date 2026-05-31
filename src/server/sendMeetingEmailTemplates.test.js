import { describe, expect, it } from "vitest";
import { buildHtmlByType, buildTextByType, subjectByType } from "../../api/send-meeting-email.js";

const baseMeeting = {
  title: "TPMO Weekly",
  meetingDate: "2026-05-29",
  meetingType: "Internal Sync",
  clientProject: "Internal",
  platform: "Webex",
  reportJson: {
    executiveSummary: "Summary text",
    keyDiscussionPoints: [{ topic: "Project Update", summary: "Reviewed progress." }],
    decisions: [{ decision: "Proceed with QA", owner: "Unassigned", impact: "Schedule", effectiveDate: "Not specified" }],
    actionItems: [{ task: "Share status", owner: "Unassigned", dueDate: "Not specified", priority: "High", status: "Open" }],
    risks: [{ risk: "Delay", severity: "Medium", owner: "Unassigned", mitigation: "Track", targetDate: "Not specified" }],
    stakeholderConcerns: [{ stakeholder: "Leadership", concern: "Timeline", requiredResponse: "Weekly updates", owner: "Unassigned", dueDate: "Not specified" }],
    additionalDiscussedItems: [{ item: "Budget", notes: "Pending approval", followUpNeeded: "Yes" }],
    followUpEmail: "Hi Team,\nPlease review pending tasks."
  }
};

describe("send-meeting-email templates", () => {
  it("builds full_mom with all structured sections", () => {
    const html = buildHtmlByType(baseMeeting, "full_mom");
    expect(subjectByType("full_mom", baseMeeting)).toBe("MoM: TPMO Weekly");
    expect(html).toContain("Executive Summary");
    expect(html).toContain("Key Discussion Points");
    expect(html).toContain("Decisions");
    expect(html).toContain("Action Items");
    expect(html).toContain("Risks");
    expect(html).toContain("Stakeholder Concerns");
    expect(html).toContain("Additional Discussed Items");
    expect(html.toLowerCase()).not.toContain("hi team");
  });

  it("builds action_items with only action items section", () => {
    const html = buildHtmlByType(baseMeeting, "action_items");
    expect(subjectByType("action_items", baseMeeting)).toBe("Action Items: TPMO Weekly");
    expect(html).toContain("Action Items");
    expect(html).not.toContain("Executive Summary");
    expect(html).not.toContain("Decisions");
    expect(html).not.toContain("Stakeholder Concerns");
  });

  it("builds decisions with only decisions section", () => {
    const html = buildHtmlByType(baseMeeting, "decisions");
    expect(subjectByType("decisions", baseMeeting)).toBe("Decisions: TPMO Weekly");
    expect(html).toContain("Decisions");
    expect(html).not.toContain("Action Items");
    expect(html).not.toContain("Risks");
  });

  it("builds risks_and_concerns with both section tables", () => {
    const html = buildHtmlByType(baseMeeting, "risks_and_concerns");
    expect(subjectByType("risks_and_concerns", baseMeeting)).toBe("Risks & Concerns: TPMO Weekly");
    expect(html).toContain("Risks");
    expect(html).toContain("Stakeholder Concerns");
    expect(html).not.toContain("Decisions");
    expect(html).not.toContain("Action Items");
  });

  it("builds follow_up_email near exactly from generated draft", () => {
    const html = buildHtmlByType(baseMeeting, "follow_up_email");
    const text = buildTextByType(baseMeeting, "follow_up_email");
    expect(subjectByType("follow_up_email", baseMeeting)).toBe("Follow-up: TPMO Weekly");
    expect(text).toBe("Hi Team,\nPlease review pending tasks.");
    expect(html).toContain("Hi Team,");
    expect(html).not.toContain("Executive Summary");
    expect(html).not.toContain("Action Items");
  });

  it("returns explicit empty-section messages for section-specific sends", () => {
    const emptyMeeting = {
      ...baseMeeting,
      reportJson: {
        ...baseMeeting.reportJson,
        decisions: [],
        actionItems: [],
        risks: [],
        stakeholderConcerns: []
      }
    };

    expect(buildTextByType(emptyMeeting, "action_items")).toContain("No action items were captured for this meeting.");
    expect(buildTextByType(emptyMeeting, "decisions")).toContain("No decisions were captured for this meeting.");
    expect(buildTextByType(emptyMeeting, "risks_and_concerns")).toContain("No risks were captured for this meeting.");
    expect(buildTextByType(emptyMeeting, "risks_and_concerns")).toContain("No stakeholder concerns were captured for this meeting.");
  });
});
