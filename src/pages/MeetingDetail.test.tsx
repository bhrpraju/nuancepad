import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { MeetingDetail } from "./MeetingDetail";

const mocks = vi.hoisted(() => ({
  getById: vi.fn()
}));

vi.mock("../services/meetingService", () => ({
  meetingService: {
    getById: mocks.getById
  }
}));

describe("MeetingDetail", () => {
  it("renders ingestion metadata for link-import fallback records", async () => {
    mocks.getById.mockResolvedValue({
      id: "m-1",
      title: "TPMO Weekly",
      clientProject: "Internal",
      meetingDate: "2026-06-01",
      meetingType: "Status Review",
      platform: "Webex",
      sharedBy: "",
      momTemplate: "standard_mom",
      sourceType: "manual_fallback_after_link",
      finalIntakeMethod: "manual_fallback_after_link",
      importStatus: "completed",
      detectedPlatform: "webex",
      linkImportStatus: "manual_upload_required",
      linkImportReasonCode: "sso_or_login_required",
      linkImportAttemptedAt: "2026-06-01T10:00:00.000Z",
      rawTranscript: "Transcript",
      reportJson: {
        title: "TPMO Weekly",
        attendees: [],
        executiveSummary: "Summary",
        keyDiscussionPoints: [],
        decisions: [],
        actionItems: [],
        risks: [],
        openQuestions: [],
        stakeholderConcerns: [],
        additionalDiscussedItems: [],
        followUpEmail: "",
        tags: []
      },
      createdAt: "2026-06-01T10:10:00.000Z",
      updatedAt: "2026-06-01T10:10:00.000Z"
    });

    render(
      <MemoryRouter initialEntries={["/meetings/m-1"]}>
        <Routes>
          <Route path="/meetings/:id" element={<MeetingDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Ingestion Metadata")).toBeInTheDocument();
      expect(screen.getAllByText(/manual fallback after link attempt/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/manual upload required/i)).toBeInTheDocument();
    });
  });
});
