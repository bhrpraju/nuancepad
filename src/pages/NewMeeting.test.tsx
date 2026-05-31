import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NewMeeting } from "./NewMeeting";

const mocks = vi.hoisted(() => ({
  generateMeetingReport: vi.fn(),
  createMeeting: vi.fn(),
  transcribeRecording: vi.fn(),
  importAuthorizedLink: vi.fn()
}));

vi.mock("../services/aiReportService", () => ({
  aiReportService: {
    generateMeetingReport: mocks.generateMeetingReport
  }
}));

vi.mock("../services/meetingService", () => ({
  meetingService: {
    create: mocks.createMeeting
  }
}));

vi.mock("../services/transcriptionService", () => ({
  transcriptionService: {
    transcribeRecording: mocks.transcribeRecording
  }
}));

vi.mock("../services/linkImportService", () => ({
  linkImportService: {
    importAuthorizedLink: mocks.importAuthorizedLink
  }
}));

describe("NewMeeting", () => {
  beforeEach(() => {
    mocks.generateMeetingReport.mockReset();
    mocks.createMeeting.mockReset();
    mocks.transcribeRecording.mockReset();
    mocks.importAuthorizedLink.mockReset();
  });

  it("disables generation without required data", () => {
    render(
      <MemoryRouter>
        <NewMeeting />
      </MemoryRouter>
    );

    const button = screen.getByRole("button", { name: "Generate MoM" });
    expect(button).toBeDisabled();
  });

  it("calls AI generation when title and transcript are present", async () => {
    mocks.generateMeetingReport.mockResolvedValue({
      report: {
        title: "Weekly Review",
        attendees: [],
        executiveSummary: "Summary",
        keyDiscussionPoints: [{ topic: "Scope", summary: "Discussed scope" }],
        decisions: [{ decision: "Move ahead", owner: "Unassigned", impact: "Schedule", effectiveDate: "Not specified" }],
        actionItems: [{ task: "Share plan", owner: "Unassigned", dueDate: "Not specified", priority: "High", status: "Open" }],
        risks: [{ risk: "Delay", severity: "Medium", owner: "Unassigned", mitigation: "Track", targetDate: "Not specified" }],
        openQuestions: [],
        stakeholderConcerns: [{ stakeholder: "Leadership", concern: "Timeline", requiredResponse: "Weekly update", owner: "Unassigned", dueDate: "Not specified" }],
        additionalDiscussedItems: [{ item: "Budget", notes: "Pending", followUpNeeded: "Yes" }],
        followUpEmail: "Draft",
        tags: []
      },
      usage: { promptTokens: 10, outputTokens: 20, totalTokens: 30 }
    });

    render(
      <MemoryRouter>
        <NewMeeting />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("Meeting title"), { target: { value: "Weekly Review" } });
    fireEvent.change(screen.getByPlaceholderText("Paste transcript here"), { target: { value: "Team discussed timeline." } });
    fireEvent.click(screen.getByRole("button", { name: "Generate MoM" }));

    await waitFor(() => {
      expect(mocks.generateMeetingReport).toHaveBeenCalledTimes(1);
    });
  });

  it("transcribes recording before AI generation in recording mode", async () => {
    mocks.transcribeRecording.mockResolvedValue({
      transcript: "Transcript from recording",
      usage: { promptTokens: 5, outputTokens: 5, totalTokens: 10 }
    });
    mocks.generateMeetingReport.mockResolvedValue({
      report: {
        title: "Recording Review",
        attendees: [],
        executiveSummary: "Summary",
        keyDiscussionPoints: [{ topic: "Scope", summary: "Discussed scope" }],
        decisions: [{ decision: "Move ahead", owner: "Unassigned", impact: "Schedule", effectiveDate: "Not specified" }],
        actionItems: [{ task: "Share plan", owner: "Unassigned", dueDate: "Not specified", priority: "High", status: "Open" }],
        risks: [{ risk: "Delay", severity: "Medium", owner: "Unassigned", mitigation: "Track", targetDate: "Not specified" }],
        openQuestions: [],
        stakeholderConcerns: [{ stakeholder: "Leadership", concern: "Timeline", requiredResponse: "Weekly update", owner: "Unassigned", dueDate: "Not specified" }],
        additionalDiscussedItems: [{ item: "Budget", notes: "Pending", followUpNeeded: "Yes" }],
        followUpEmail: "Draft",
        tags: []
      },
      usage: { promptTokens: 10, outputTokens: 20, totalTokens: 30 }
    });

    render(
      <MemoryRouter>
        <NewMeeting />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("Meeting title"), { target: { value: "Recording Review" } });
    fireEvent.click(screen.getByRole("button", { name: "Upload file" }));

    const file = new File(["audio"], "call.mp3", { type: "audio/mpeg" });
    fireEvent.change(screen.getByTestId("recording-file-input"), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Generate MoM" }));

    await waitFor(() => {
      expect(mocks.transcribeRecording).toHaveBeenCalledTimes(1);
      expect(mocks.generateMeetingReport).toHaveBeenCalledWith(
        "Transcript from recording",
        expect.objectContaining({ sourceType: "recording_file" })
      );
    });
  });

  it("shows manual fallback error when authorized link import is blocked", async () => {
    mocks.importAuthorizedLink.mockResolvedValue({
      status: "manual_upload_required",
      reason: "passcode_entry_required",
      details: "Provider requires passcode entry in hosted player."
    });

    render(
      <MemoryRouter>
        <NewMeeting />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("Meeting title"), { target: { value: "Webex review" } });
    fireEvent.click(screen.getByRole("button", { name: "Webex link helper" }));
    fireEvent.change(screen.getByPlaceholderText("https://...webex.com/..."), { target: { value: "https://example.webex.com/replay" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate MoM" }));

    await waitFor(() => {
      expect(mocks.importAuthorizedLink).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/passcode must be entered inside webex playback page/i)).toBeInTheDocument();
    });
  });
});
