import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NewMeeting } from "./NewMeeting";

const mocks = vi.hoisted(() => ({
  generateMeetingReport: vi.fn(),
  createMeeting: vi.fn(),
  createMeetingWithStatus: vi.fn(),
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
    create: mocks.createMeeting,
    createWithStatus: mocks.createMeetingWithStatus
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
    mocks.createMeetingWithStatus.mockReset();
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
      reasonCode: "interactive_passcode_or_session_required",
      message: "Open browser and upload manually.",
      detectedPlatform: "webex",
      diagnostics: {
        detectedPlatform: "webex",
        adapter: "webex_link_adapter",
        attemptedAt: "2026-06-01T10:00:00.000Z"
      }
    });

    render(
      <MemoryRouter>
        <NewMeeting />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("Meeting title"), { target: { value: "Webex review" } });
    fireEvent.click(screen.getByRole("button", { name: "Meeting link import" }));
    fireEvent.change(screen.getByPlaceholderText("https://..."), { target: { value: "https://example.webex.com/replay" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate MoM" }));

    await waitFor(() => {
      expect(mocks.importAuthorizedLink).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/open the link in your browser/i)).toBeInTheDocument();
    });
  });

  it("persists link diagnostics when user falls back to manual transcript after link attempt", async () => {
    mocks.importAuthorizedLink.mockResolvedValue({
      status: "manual_upload_required",
      reasonCode: "sso_or_login_required",
      message: "Open browser and upload manually.",
      detectedPlatform: "webex",
      diagnostics: {
        detectedPlatform: "webex",
        adapter: "webex_link_adapter",
        attemptedAt: "2026-06-01T09:00:00.000Z"
      }
    });
    mocks.generateMeetingReport.mockResolvedValue({
      report: {
        title: "Weekly Review",
        attendees: [],
        executiveSummary: "Summary",
        keyDiscussionPoints: [],
        decisions: [],
        actionItems: [],
        risks: [],
        openQuestions: [],
        stakeholderConcerns: [],
        additionalDiscussedItems: [],
        followUpEmail: "Draft",
        tags: []
      },
      usage: { promptTokens: 1, outputTokens: 1, totalTokens: 2 }
    });
    mocks.createMeetingWithStatus.mockResolvedValue({ id: "meeting-2", storage: "firebase", fallbackUsed: false });

    render(
      <MemoryRouter>
        <NewMeeting />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("Meeting title"), { target: { value: "Weekly Review" } });
    fireEvent.click(screen.getByRole("button", { name: "Meeting link import" }));
    fireEvent.change(screen.getByPlaceholderText("https://..."), { target: { value: "https://example.webex.com/replay" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate MoM" }));

    await waitFor(() => {
      expect(screen.getByText(/open the link in your browser/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Paste transcript" }));
    fireEvent.change(screen.getByPlaceholderText("Paste transcript here"), { target: { value: "Manual transcript content." } });
    fireEvent.click(screen.getByRole("button", { name: "Generate MoM" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save meeting" })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Save meeting" }));

    await waitFor(() => {
      expect(mocks.createMeetingWithStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceType: "manual_fallback_after_link",
          linkImportStatus: "manual_upload_required",
          linkImportReasonCode: "sso_or_login_required",
          manualFallbackReason: "sso_or_login_required"
        })
      );
    });
  });

  it("shows saving and success states and sends usage metrics payload on save", async () => {
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
        stakeholderConcerns: [],
        additionalDiscussedItems: [],
        followUpEmail: "Draft",
        tags: []
      },
      usage: { promptTokens: 11, outputTokens: 22, totalTokens: 33 }
    });

    let resolveSave: ((value: { id: string; storage: "local" | "firebase"; fallbackUsed: boolean }) => void) | undefined;
    const savePromise = new Promise<{ id: string; storage: "local" | "firebase"; fallbackUsed: boolean }>((resolve) => {
      resolveSave = resolve;
    });
    mocks.createMeetingWithStatus.mockReturnValue(savePromise);

    render(
      <MemoryRouter>
        <NewMeeting />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("Meeting title"), { target: { value: "Weekly Review" } });
    fireEvent.change(screen.getByPlaceholderText("Paste transcript here"), { target: { value: "Team discussed timeline and tasks." } });
    fireEvent.click(screen.getByRole("button", { name: "Generate MoM" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save meeting" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Save meeting" }));
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();

    resolveSave?.({ id: "meeting-1", storage: "firebase", fallbackUsed: false });

    await waitFor(() => {
      expect(mocks.createMeetingWithStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Weekly Review",
          usageMetrics: expect.objectContaining({
            promptTokens: 11,
            outputTokens: 22,
            totalTokens: 33
          })
        })
      );
      expect(screen.getByText("Meeting saved successfully.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "View saved meeting" })).toBeInTheDocument();
    });
  });

  it("shows friendly save failure message", async () => {
    mocks.generateMeetingReport.mockResolvedValue({
      report: {
        title: "Weekly Review",
        attendees: [],
        executiveSummary: "Summary",
        keyDiscussionPoints: [{ topic: "Scope", summary: "Discussed scope" }],
        decisions: [],
        actionItems: [],
        risks: [],
        openQuestions: [],
        stakeholderConcerns: [],
        additionalDiscussedItems: [],
        followUpEmail: "Draft",
        tags: []
      },
      usage: { promptTokens: 1, outputTokens: 1, totalTokens: 2 }
    });
    mocks.createMeetingWithStatus.mockRejectedValue(new Error("Permission denied"));

    render(
      <MemoryRouter>
        <NewMeeting />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("Meeting title"), { target: { value: "Weekly Review" } });
    fireEvent.change(screen.getByPlaceholderText("Paste transcript here"), { target: { value: "Team discussed timeline." } });
    fireEvent.click(screen.getByRole("button", { name: "Generate MoM" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save meeting" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Save meeting" }));

    await waitFor(() => {
      expect(screen.getByText("Save failed: Permission denied")).toBeInTheDocument();
    });
  });
});
