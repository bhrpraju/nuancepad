import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  initFirebase: vi.fn(),
  addDoc: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  updateDoc: vi.fn()
}));

vi.mock("./firebase", () => ({
  initFirebase: mocks.initFirebase
}));

vi.mock("firebase/firestore", () => ({
  addDoc: mocks.addDoc,
  collection: mocks.collection,
  doc: mocks.doc,
  getDoc: mocks.getDoc,
  getDocs: mocks.getDocs,
  orderBy: mocks.orderBy,
  query: mocks.query,
  updateDoc: mocks.updateDoc
}));

const basePayload = {
  title: "Weekly Review",
  clientProject: "Internal",
  meetingDate: "2026-05-31",
  meetingType: "Status Review",
  platform: "Webex",
  sharedBy: "",
  sourceType: "transcript_paste" as const,
  importStatus: "completed" as const,
  rawTranscript: "Transcript",
  reportJson: {
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
    followUpEmail: "",
    tags: []
  }
};

const localStore = new Map<string, string>();
const localStorageMock = {
  getItem: vi.fn((key: string) => localStore.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => {
    localStore.set(key, value);
  }),
  removeItem: vi.fn((key: string) => {
    localStore.delete(key);
  }),
  clear: vi.fn(() => {
    localStore.clear();
  }),
  key: vi.fn((index: number) => Array.from(localStore.keys())[index] ?? null),
  get length() {
    return localStore.size;
  }
};

describe("meetingService persistence", () => {
  beforeEach(() => {
    localStore.clear();
    vi.stubGlobal("localStorage", localStorageMock as unknown as Storage);
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
    localStorageMock.key.mockClear();
    vi.resetModules();
    mocks.initFirebase.mockReset();
    mocks.addDoc.mockReset();
    mocks.collection.mockReset();
    mocks.doc.mockReset();
    mocks.getDoc.mockReset();
    mocks.getDocs.mockReset();
    mocks.orderBy.mockReset();
    mocks.query.mockReset();
    mocks.updateDoc.mockReset();
  });

  it("saves and lists meetings in local mode when firebase is unavailable", async () => {
    mocks.initFirebase.mockReturnValue({ configured: false, db: undefined });
    const { meetingService } = await import("./meetingService");

    const saved = await meetingService.createWithStatus(basePayload);
    expect(saved.storage).toBe("local");

    const list = await meetingService.list();
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("Weekly Review");
    expect(list[0].createdAt).toBeTruthy();
    expect(list[0].updatedAt).toBeTruthy();
  });

  it("falls back to local when firebase save fails", async () => {
    mocks.initFirebase.mockReturnValue({ configured: true, db: { mock: true } });
    mocks.collection.mockReturnValue("collection-ref");
    mocks.addDoc.mockRejectedValue(new Error("permission-denied"));

    const { meetingService } = await import("./meetingService");
    const saved = await meetingService.createWithStatus(basePayload);

    expect(saved.storage).toBe("local");
    expect(saved.fallbackUsed).toBe(true);
    expect(saved.fallbackReason).toContain("permission-denied");

    const status = meetingService.getStorageStatus();
    expect(status.activeStorage).toBe("local");
  });
});
