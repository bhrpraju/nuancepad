import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ExportActions } from "./ExportActions";
import type { MeetingDocument } from "../domain/meeting";

const mocks = vi.hoisted(() => ({
  sendMeetingEmail: vi.fn()
}));

vi.mock("../services/emailService", () => ({
  emailService: {
    sendMeetingEmail: mocks.sendMeetingEmail
  }
}));

const meeting: Pick<MeetingDocument, "title" | "meetingDate" | "meetingType" | "clientProject" | "platform" | "reportJson"> = {
  title: "Weekly Review",
  meetingDate: "2026-05-31",
  meetingType: "Status Review",
  clientProject: "Internal",
  platform: "Webex",
  reportJson: {
    title: "Weekly Review",
    attendees: ["A", "B"],
    executiveSummary: "Summary",
    keyDiscussionPoints: [{ topic: "Delivery", summary: "Updates shared." }],
    decisions: [{ decision: "Proceed", owner: "Unassigned", impact: "Timeline", effectiveDate: "Not specified" }],
    actionItems: [{ task: "Share plan", owner: "Unassigned", dueDate: "Not specified", priority: "High", status: "Open" as const }],
    risks: [{ risk: "Delay", severity: "Medium", owner: "Unassigned", mitigation: "Track", targetDate: "Not specified" }],
    openQuestions: [],
    stakeholderConcerns: [{ stakeholder: "Leadership", concern: "Schedule", requiredResponse: "Weekly update", owner: "Unassigned", dueDate: "Not specified" }],
    additionalDiscussedItems: [{ item: "Budget", notes: "Pending", followUpNeeded: "No" as const }],
    followUpEmail: "Draft follow-up",
    tags: []
  }
};

describe("ExportActions", () => {
  beforeEach(() => {
    mocks.sendMeetingEmail.mockReset();
  });

  it("renders separate email action buttons", () => {
    render(<ExportActions meeting={meeting} />);

    expect(screen.getByLabelText("Recipients")).toBeInTheDocument();
    expect(screen.getByText("Choose what you want to email from this MoM.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send Full MoM" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send Action Items" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send Decisions" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send Risks & Concerns" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send Follow-up Email" })).toBeInTheDocument();
  });

  it.each([
    { label: "Send Full MoM", emailType: "full_mom" },
    { label: "Send Action Items", emailType: "action_items" },
    { label: "Send Decisions", emailType: "decisions" },
    { label: "Send Risks & Concerns", emailType: "risks_and_concerns" },
    { label: "Send Follow-up Email", emailType: "follow_up_email" }
  ])("sends selected email type for %s", async ({ label, emailType }) => {
    mocks.sendMeetingEmail.mockResolvedValue(undefined);
    render(<ExportActions meeting={meeting} />);

    fireEvent.change(screen.getByLabelText("Recipients"), { target: { value: "a@x.com,b@y.com" } });
    fireEvent.click(screen.getByRole("button", { name: label }));

    await waitFor(() => {
      expect(mocks.sendMeetingEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "a@x.com,b@y.com",
          emailType
        })
      );
      expect(screen.getByText("Email sent successfully.")).toBeInTheDocument();
    });
  });
});
