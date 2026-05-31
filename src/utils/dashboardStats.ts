import type { MeetingDocument } from "../domain/meeting";

export interface DashboardStats {
  totalMeetings: number;
  meetingsThisWeek: number;
  meetingsThisMonth: number;
  openActionItems: number;
  highRisks: number;
  topPlatforms: Array<{ name: string; count: number }>;
  topMeetingTypes: Array<{ name: string; count: number }>;
  recentMeetings: MeetingDocument[];
}

const parseMeetingDate = (value: string): Date | null => {
  if (!value) {
    return null;
  }

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const slashMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashMatch) {
    const [, d, m, y] = slashMatch;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const startOfWeek = (date: Date): Date => {
  const next = new Date(date);
  const day = next.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + offset);
  next.setHours(0, 0, 0, 0);
  return next;
};

const countBy = (values: string[]): Array<{ name: string; count: number }> => {
  const map = new Map<string, number>();

  values.forEach((value) => {
    const key = value?.trim() || "Unknown";
    map.set(key, (map.get(key) ?? 0) + 1);
  });

  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
};

export const buildDashboardStats = (meetings: MeetingDocument[], now = new Date()): DashboardStats => {
  const weekStart = startOfWeek(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const withDates = meetings
    .map((meeting) => ({ meeting, date: parseMeetingDate(meeting.meetingDate) }))
    .filter((entry) => Boolean(entry.date)) as Array<{ meeting: MeetingDocument; date: Date }>;

  const meetingsThisWeek = withDates.filter(({ date }) => date >= weekStart).length;
  const meetingsThisMonth = withDates.filter(({ date }) => date >= monthStart).length;

  const openActionItems = meetings.reduce(
    (sum, meeting) => sum + meeting.reportJson.actionItems.filter((item) => item.status !== "Closed").length,
    0
  );
  const highRisks = meetings.reduce(
    (sum, meeting) => sum + meeting.reportJson.risks.filter((risk) => risk.severity === "High").length,
    0
  );

  return {
    totalMeetings: meetings.length,
    meetingsThisWeek,
    meetingsThisMonth,
    openActionItems,
    highRisks,
    topPlatforms: countBy(meetings.map((meeting) => meeting.platform)),
    topMeetingTypes: countBy(meetings.map((meeting) => meeting.meetingType)),
    recentMeetings: [...meetings]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 6)
  };
};
