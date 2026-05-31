import { describe, expect, it } from "vitest";
import { defaultMeetingReport, normalizeMeetingReport } from "./meetingSchema";

describe("meetingSchema", () => {
  it("creates compliant defaults", () => {
    const report = defaultMeetingReport();

    expect(report.attendees).toEqual([]);
    expect(report.decisions[0].owner).toBe("Unassigned");
    expect(report.actionItems[0].status).toBe("Open");
    expect(report.risks[0].severity).toBe("Medium");
  });

  it("normalizes missing owners and dates", () => {
    const normalized = normalizeMeetingReport({
      title: "Q2 Governance",
      decisions: [{ decision: "Freeze scope", impact: "Delivery confidence" }],
      actionItems: [{ task: "Send deck" }]
    });

    expect(normalized.decisions[0].owner).toBe("Unassigned");
    expect(normalized.decisions[0].effectiveDate).toBe("Not specified");
    expect(normalized.actionItems[0].owner).toBe("Unassigned");
    expect(normalized.actionItems[0].dueDate).toBe("Not specified");
  });
});
