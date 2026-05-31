import type { MeetingDocument } from "../domain/meeting";

export interface DashboardStats {
  totalMeetings: number;
  meetingsThisWeek: number;
  meetingsPreviousWeek: number;
  meetingsThisMonth: number;
  meetingsPreviousMonth: number;
  openActionItems: number;
  completionRate: number;
  highRisks: number;
  topPlatforms: Array<{ name: string; count: number }>;
  topMeetingTypes: Array<{ name: string; count: number }>;
  weeklySeries: Array<{ label: string; count: number }>;
  monthlySeries: Array<{ label: string; count: number }>;
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

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
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

const monthKey = (date: Date): string => `${date.getFullYear()}-${date.getMonth()}`;

const buildWeeklySeries = (dates: Date[], now: Date): Array<{ label: string; count: number }> => {
  const currentWeekStart = startOfWeek(now);
  const series: Array<{ label: string; count: number }> = [];

  for (let index = 7; index >= 0; index -= 1) {
    const bucketStart = addDays(currentWeekStart, -7 * index);
    const bucketEnd = addDays(bucketStart, 7);
    const count = dates.filter((date) => date >= bucketStart && date < bucketEnd).length;
    const label = `${bucketStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    series.push({ label, count });
  }

  return series;
};

const buildMonthlySeries = (dates: Date[], now: Date): Array<{ label: string; count: number }> => {
  const series: Array<{ label: string; count: number }> = [];

  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = monthKey(date);
    const count = dates.filter((entry) => monthKey(entry) === key).length;
    const label = date.toLocaleDateString("en-US", { month: "short" });
    series.push({ label, count });
  }

  return series;
};

export const buildDashboardStats = (meetings: MeetingDocument[], now = new Date()): DashboardStats => {
  const weekStart = startOfWeek(now);
  const previousWeekStart = addDays(weekStart, -7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const withDates = meetings
    .map((meeting) => ({ meeting, date: parseMeetingDate(meeting.meetingDate) }))
    .filter((entry) => Boolean(entry.date)) as Array<{ meeting: MeetingDocument; date: Date }>;

  const meetingsThisWeek = withDates.filter(({ date }) => date >= weekStart).length;
  const meetingsPreviousWeek = withDates.filter(({ date }) => date >= previousWeekStart && date < weekStart).length;
  const meetingsThisMonth = withDates.filter(({ date }) => date >= monthStart).length;
  const meetingsPreviousMonth = withDates.filter(({ date }) => date >= previousMonthStart && date < monthStart).length;

  const openActionItems = meetings.reduce(
    (sum, meeting) => sum + meeting.reportJson.actionItems.filter((item) => item.status !== "Closed").length,
    0
  );
  const closedActionItems = meetings.reduce(
    (sum, meeting) => sum + meeting.reportJson.actionItems.filter((item) => item.status === "Closed").length,
    0
  );
  const highRisks = meetings.reduce(
    (sum, meeting) => sum + meeting.reportJson.risks.filter((risk) => risk.severity === "High").length,
    0
  );
  const totalActionItems = openActionItems + closedActionItems;
  const completionRate = totalActionItems === 0 ? 0 : Math.round((closedActionItems / totalActionItems) * 100);
  const dates = withDates.map(({ date }) => date);

  return {
    totalMeetings: meetings.length,
    meetingsThisWeek,
    meetingsPreviousWeek,
    meetingsThisMonth,
    meetingsPreviousMonth,
    openActionItems,
    completionRate,
    highRisks,
    topPlatforms: countBy(meetings.map((meeting) => meeting.platform)),
    topMeetingTypes: countBy(meetings.map((meeting) => meeting.meetingType)),
    weeklySeries: buildWeeklySeries(dates, now),
    monthlySeries: buildMonthlySeries(dates, now),
    recentMeetings: [...meetings]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 6)
  };
};
