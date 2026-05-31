import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
        platform: ""
      });
    });
  });
});
