import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc
} from "firebase/firestore";
import type { MeetingDocument } from "../domain/meeting";
import { initFirebase } from "./firebase";

const LOCAL_KEY = "nuancepad.meetings";
const LOCAL_UID = "local-user";
const isDev = import.meta.env.DEV;

export type StorageProvider = "firebase" | "local";

export interface SaveMeetingResult {
  id: string;
  storage: StorageProvider;
  fallbackUsed: boolean;
  fallbackReason?: string;
}

export interface StorageStatus {
  firebaseConfigured: boolean;
  activeStorage: StorageProvider;
  lastFallbackReason: string;
}

const storageRuntime = {
  activeStorage: "local" as StorageProvider,
  lastFallbackReason: "",
  hasActivity: false
};

const debugLog = (...args: unknown[]) => {
  if (isDev) {
    // eslint-disable-next-line no-console
    console.info("[NuancePad meetingService]", ...args);
  }
};

const toIsoTimestamp = (value: unknown, fallback: string): string => {
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  if (value && typeof value === "object" && "toDate" in (value as Record<string, unknown>)) {
    const maybeToDate = (value as { toDate?: () => Date }).toDate;
    if (typeof maybeToDate === "function") {
      const date = maybeToDate();
      if (date instanceof Date && !Number.isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
  }
  return fallback;
};

const normalizeMeeting = (id: string, data: Partial<MeetingDocument>): MeetingDocument => {
  const now = new Date().toISOString();
  const reportJson = data.reportJson || {
    title: String(data.title || ""),
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
  };
  return {
    id,
    title: String(data.title || ""),
    clientProject: String(data.clientProject || ""),
    meetingDate: String(data.meetingDate || ""),
    meetingType: String(data.meetingType || "Status Review"),
    platform: String(data.platform || "Webex"),
    sharedBy: String(data.sharedBy || ""),
    momTemplate: (data.momTemplate || "standard_mom") as MeetingDocument["momTemplate"],
    sourceType: (data.sourceType || "transcript_paste") as MeetingDocument["sourceType"],
    importStatus: (data.importStatus || "completed") as MeetingDocument["importStatus"],
    recordingUrl: data.recordingUrl,
    manualFallbackReason: data.manualFallbackReason,
    detectedPlatform: data.detectedPlatform,
    linkImportStatus: data.linkImportStatus || "not_attempted",
    linkImportReasonCode: data.linkImportReasonCode,
    linkImportAttemptedAt: toIsoTimestamp(data.linkImportAttemptedAt, ""),
    linkImportCompletedAt: toIsoTimestamp(data.linkImportCompletedAt, ""),
    linkImportDiagnostics: data.linkImportDiagnostics,
    finalIntakeMethod: (data.finalIntakeMethod || data.sourceType || "transcript_paste") as MeetingDocument["sourceType"],
    rawTranscript: String(data.rawTranscript || ""),
    usageMetrics: data.usageMetrics,
    reportJson: reportJson as MeetingDocument["reportJson"],
    createdAt: toIsoTimestamp(data.createdAt, now),
    updatedAt: toIsoTimestamp(data.updatedAt, toIsoTimestamp(data.createdAt, now))
  };
};

const readLocal = (): MeetingDocument[] => {
  const raw = localStorage.getItem(LOCAL_KEY);
  const parsed = raw ? (JSON.parse(raw) as Array<Partial<MeetingDocument>>) : [];
  return parsed.map((entry, index) => normalizeMeeting(String(entry.id || `local-${index}`), entry));
};

const writeLocal = (meetings: MeetingDocument[]) => {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(meetings));
};

export interface MeetingFilters {
  query?: string;
  clientProject?: string;
  meetingType?: string;
  platform?: string;
  momTemplate?: string;
  sourceType?: string;
  linkImportStatus?: string;
}

const applyFilters = (meetings: MeetingDocument[], filters: MeetingFilters): MeetingDocument[] => {
  const q = filters.query?.trim().toLowerCase();

  return meetings.filter((meeting) => {
    const matchesQuery =
      !q ||
      meeting.title.toLowerCase().includes(q) ||
      meeting.clientProject.toLowerCase().includes(q) ||
      meeting.rawTranscript.toLowerCase().includes(q) ||
      meeting.reportJson.executiveSummary.toLowerCase().includes(q);

    const matchesProject = !filters.clientProject || meeting.clientProject === filters.clientProject;
    const matchesType = !filters.meetingType || meeting.meetingType === filters.meetingType;
    const matchesPlatform = !filters.platform || meeting.platform === filters.platform;
    const matchesTemplate = !filters.momTemplate || meeting.momTemplate === filters.momTemplate;
    const matchesSource = !filters.sourceType || meeting.sourceType === filters.sourceType;
    const matchesLinkImportStatus = !filters.linkImportStatus || (meeting.linkImportStatus || "not_attempted") === filters.linkImportStatus;

    return matchesQuery && matchesProject && matchesType && matchesPlatform && matchesTemplate && matchesSource && matchesLinkImportStatus;
  });
};

const loadFromLocal = (filters: MeetingFilters): MeetingDocument[] => {
  const localMeetings = readLocal().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  storageRuntime.activeStorage = "local";
  storageRuntime.hasActivity = true;
  return applyFilters(localMeetings, filters);
};

const loadFromFirebase = async (
  uid: string,
  filters: MeetingFilters
): Promise<MeetingDocument[]> => {
  const firebase = initFirebase();
  if (!firebase.db) {
    return loadFromLocal(filters);
  }

  const ref = collection(firebase.db, `users/${uid}/meetings`);
  let snap;
  try {
    snap = await getDocs(query(ref, orderBy("createdAt", "desc")));
  } catch {
    snap = await getDocs(ref);
  }

  const firebaseMeetings = snap.docs
    .map((entry) => normalizeMeeting(entry.id, entry.data() as Partial<MeetingDocument>))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const localMeetings = readLocal();
  const mergedById = new Map<string, MeetingDocument>();
  for (const meeting of localMeetings) {
    mergedById.set(meeting.id, meeting);
  }
  for (const meeting of firebaseMeetings) {
    mergedById.set(meeting.id, meeting);
  }
  const docs = [...mergedById.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  storageRuntime.activeStorage = "firebase";
  storageRuntime.lastFallbackReason = "";
  storageRuntime.hasActivity = true;
  return applyFilters(docs, filters);
};

const activeProvider = (): StorageProvider => {
  const firebase = initFirebase();
  if (firebase.db) {
    return "firebase";
  }
  return "local";
};

export const meetingService = {
  async list(filters: MeetingFilters = {}, uid = LOCAL_UID): Promise<MeetingDocument[]> {
    const provider = activeProvider();
    if (provider === "firebase") {
      try {
        return await loadFromFirebase(uid, filters);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Unknown firebase read error";
        storageRuntime.lastFallbackReason = reason;
        debugLog("firebase list failed, falling back to local", { reason });
        return loadFromLocal(filters);
      }
    }
    return loadFromLocal(filters);
  },

  async getById(id: string, uid = LOCAL_UID): Promise<MeetingDocument | null> {
    const provider = activeProvider();
    if (provider === "firebase") {
      try {
        const firebase = initFirebase();
        if (!firebase.db) {
          return readLocal().find((meeting) => meeting.id === id) ?? null;
        }
        const snapshot = await getDoc(doc(firebase.db, `users/${uid}/meetings/${id}`));
        if (!snapshot.exists()) {
          return readLocal().find((meeting) => meeting.id === id) ?? null;
        }
        storageRuntime.activeStorage = "firebase";
        storageRuntime.lastFallbackReason = "";
        storageRuntime.hasActivity = true;
        return normalizeMeeting(snapshot.id, snapshot.data() as Partial<MeetingDocument>);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Unknown firebase read error";
        storageRuntime.lastFallbackReason = reason;
        debugLog("firebase getById failed, falling back to local", { reason, id });
      }
    }
    return readLocal().find((meeting) => meeting.id === id) ?? null;
  },

  async create(payload: Omit<MeetingDocument, "id" | "createdAt" | "updatedAt">, uid = LOCAL_UID): Promise<string> {
    const result = await this.createWithStatus(payload, uid);
    return result.id;
  },

  async createWithStatus(
    payload: Omit<MeetingDocument, "id" | "createdAt" | "updatedAt">,
    uid = LOCAL_UID
  ): Promise<SaveMeetingResult> {
    const now = new Date().toISOString();
    const preferredProvider = activeProvider();
    debugLog("save started", { provider: preferredProvider, title: payload.title });

    const firebasePayload = {
      ...payload,
      createdAt: now,
      updatedAt: now
    };

    if (preferredProvider === "firebase") {
      try {
        const firebase = initFirebase();
        if (!firebase.db) {
          throw new Error("Firebase database not initialized");
        }
        const ref = collection(firebase.db, `users/${uid}/meetings`);
        const docRef = await addDoc(ref, firebasePayload);
        storageRuntime.activeStorage = "firebase";
        storageRuntime.lastFallbackReason = "";
        storageRuntime.hasActivity = true;
        debugLog("save success", { provider: "firebase", id: docRef.id });
        return { id: docRef.id, storage: "firebase", fallbackUsed: false };
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Unknown firebase save error";
        storageRuntime.lastFallbackReason = reason;
        debugLog("save failed on firebase, falling back to local", { reason });
      }
    }

    const id = crypto.randomUUID();
    const meetings = readLocal();
    meetings.push({ ...payload, id, createdAt: now, updatedAt: now });
    writeLocal(meetings);
    storageRuntime.activeStorage = "local";
    storageRuntime.hasActivity = true;
    debugLog("save success", { provider: "local", id });
    return {
      id,
      storage: "local",
      fallbackUsed: preferredProvider === "firebase",
      fallbackReason:
        preferredProvider === "firebase"
          ? storageRuntime.lastFallbackReason || "Firebase unavailable or write failed"
          : undefined
    };
  },

  async update(id: string, patch: Partial<MeetingDocument>, uid = LOCAL_UID): Promise<void> {
    if (activeProvider() === "firebase") {
      try {
        const firebase = initFirebase();
        if (!firebase.db) {
          throw new Error("Firebase database not initialized");
        }
        await updateDoc(doc(firebase.db, `users/${uid}/meetings/${id}`), {
          ...patch,
          updatedAt: new Date().toISOString()
        });
        storageRuntime.activeStorage = "firebase";
        storageRuntime.lastFallbackReason = "";
        storageRuntime.hasActivity = true;
        return;
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Unknown firebase update error";
        storageRuntime.lastFallbackReason = reason;
        debugLog("firebase update failed, falling back to local", { reason, id });
      }
    }

    const meetings = readLocal().map((meeting) =>
      meeting.id === id ? { ...meeting, ...patch, updatedAt: new Date().toISOString() } : meeting
    );
    writeLocal(meetings);
    storageRuntime.activeStorage = "local";
    storageRuntime.hasActivity = true;
  },

  getStorageStatus(): StorageStatus {
    const firebase = initFirebase();
    return {
      firebaseConfigured: Boolean(firebase.db),
      activeStorage: storageRuntime.hasActivity ? storageRuntime.activeStorage : activeProvider(),
      lastFallbackReason: storageRuntime.lastFallbackReason
    };
  }
};
