import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import type { MeetingDocument } from "../domain/meeting";
import { initFirebase } from "./firebase";

const LOCAL_KEY = "nuancepad.meetings";
const LOCAL_UID = "local-user";

const readLocal = (): MeetingDocument[] => {
  const raw = localStorage.getItem(LOCAL_KEY);
  return raw ? (JSON.parse(raw) as MeetingDocument[]) : [];
};

const writeLocal = (meetings: MeetingDocument[]) => {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(meetings));
};

export interface MeetingFilters {
  query?: string;
  clientProject?: string;
  meetingType?: string;
  platform?: string;
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

    return matchesQuery && matchesProject && matchesType && matchesPlatform;
  });
};

export const meetingService = {
  async list(filters: MeetingFilters = {}, uid = LOCAL_UID): Promise<MeetingDocument[]> {
    const firebase = initFirebase();

    if (firebase.db) {
      const ref = collection(firebase.db, `users/${uid}/meetings`);
      const snap = await getDocs(query(ref, orderBy("createdAt", "desc")));
      const docs = snap.docs.map((entry) => ({ id: entry.id, ...(entry.data() as Omit<MeetingDocument, "id">) }));
      return applyFilters(docs, filters);
    }

    const localMeetings = readLocal().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return applyFilters(localMeetings, filters);
  },

  async getById(id: string, uid = LOCAL_UID): Promise<MeetingDocument | null> {
    const firebase = initFirebase();

    if (firebase.db) {
      const snapshot = await getDoc(doc(firebase.db, `users/${uid}/meetings/${id}`));
      if (!snapshot.exists()) {
        return null;
      }
      return { id: snapshot.id, ...(snapshot.data() as Omit<MeetingDocument, "id">) };
    }

    return readLocal().find((meeting) => meeting.id === id) ?? null;
  },

  async create(payload: Omit<MeetingDocument, "id" | "createdAt" | "updatedAt">, uid = LOCAL_UID): Promise<string> {
    const firebase = initFirebase();
    const now = new Date().toISOString();

    if (firebase.db) {
      const ref = collection(firebase.db, `users/${uid}/meetings`);
      const result = await addDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return result.id;
    }

    const id = crypto.randomUUID();
    const meetings = readLocal();
    meetings.push({ ...payload, id, createdAt: now, updatedAt: now });
    writeLocal(meetings);
    return id;
  },

  async update(id: string, patch: Partial<MeetingDocument>, uid = LOCAL_UID): Promise<void> {
    const firebase = initFirebase();

    if (firebase.db) {
      await updateDoc(doc(firebase.db, `users/${uid}/meetings/${id}`), {
        ...patch,
        updatedAt: serverTimestamp()
      });
      return;
    }

    const meetings = readLocal().map((meeting) =>
      meeting.id === id ? { ...meeting, ...patch, updatedAt: new Date().toISOString() } : meeting
    );
    writeLocal(meetings);
  }
};
