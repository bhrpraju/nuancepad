import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { MeetingHistory } from "./MeetingHistory";

const mocks = vi.hoisted(() => ({
  list: vi.fn()
}));

vi.mock("../services/meetingService", () => ({
  meetingService: {
    list: mocks.list
  }
}));

describe("MeetingHistory", () => {
  it("passes search/filter params to service", async () => {
    mocks.list.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <MeetingHistory />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText("Search"), { target: { value: "budget" } });

    await waitFor(() => {
      expect(mocks.list).toHaveBeenLastCalledWith({
        query: "budget",
        clientProject: "",
        meetingType: "",
        platform: "",
        sourceType: "",
        linkImportStatus: ""
      });
    });
  });

  it("renders saved meeting records", async () => {
    mocks.list.mockResolvedValue([
      {
        id: "m-1",
        title: "TPMO Weekly",
        clientProject: "Internal",
        meetingDate: "2026-05-31",
        meetingType: "Status Review",
        platform: "Webex",
        sharedBy: "",
        sourceType: "transcript_paste",
        importStatus: "completed",
        linkImportStatus: "not_attempted",
        rawTranscript: "text",
        reportJson: {
          title: "TPMO Weekly",
          attendees: [],
          executiveSummary: "",
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
        createdAt: "2026-05-31T10:00:00.000Z",
        updatedAt: "2026-05-31T10:00:00.000Z"
      }
    ]);

    render(
      <MemoryRouter>
        <MeetingHistory />
      </MemoryRouter>
    );

    await waitFor(() => {
      const titleLink = screen.getByRole("link", { name: "TPMO Weekly" });
      expect(titleLink).toBeInTheDocument();
      const row = titleLink.closest("tr");
      expect(row).not.toBeNull();
      expect(within(row as HTMLTableRowElement).getByText("2026-05-31")).toBeInTheDocument();
      expect(within(row as HTMLTableRowElement).getByText("Status Review")).toBeInTheDocument();
      expect(within(row as HTMLTableRowElement).getByText("Pasted transcript")).toBeInTheDocument();
    });
  });
});
