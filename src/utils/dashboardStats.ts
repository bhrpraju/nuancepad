import type { MeetingDocument } from "../domain/meeting";

type DataPoint = { label: string; count: number };
type UsagePoint = { label: string; meetings: number; credits: number; words: number };

export interface DashboardStats {
  totalMeetings: number;
  meetingsToday: number;
  meetingsThisWeek: number;
  meetingsThisMonth: number;
  creditsToday: number;
  creditsThisWeek: number;
  creditsThisMonth: number;
  wordsToday: number;
  wordsThisWeek: number;
  wordsThisMonth: number;
  openActionItems: number;
  highRisks: number;
  weeklyMeetingSeries: DataPoint[];
  monthlyMeetingSeries: DataPoint[];
  dailyUsageSeries: UsagePoint[];
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

const startOfDay = (date: Date): Date => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const startOfWeek = (date: Date): Date => {
  const next = startOfDay(date);
  const day = next.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + offset);
  return next;
};

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const monthKey = (date: Date): string => `${date.getFullYear()}-${date.getMonth()}`;

const wordCount = (text: string): number => text.split(/\s+/).filter(Boolean).length;

const buildWeeklyMeetingSeries = (dates: Date[], now: Date): DataPoint[] => {
  const currentWeekStart = startOfWeek(now);
  const series: DataPoint[] = [];

  for (let index = 7; index >= 0; index -= 1) {
    const bucketStart = addDays(currentWeekStart, -7 * index);
    const bucketEnd = addDays(bucketStart, 7);
    const count = dates.filter((date) => date >= bucketStart && date < bucketEnd).length;
    series.push({
      label: bucketStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count
    });
  }

  return series;
};

const buildMonthlyMeetingSeries = (dates: Date[], now: Date): DataPoint[] => {
  const series: DataPoint[] = [];

  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = monthKey(date);
    const count = dates.filter((entry) => monthKey(entry) === key).length;
    series.push({ label: date.toLocaleDateString("en-US", { month: "short" }), count });
  }

  return series;
};

const buildDailyUsageSeries = (
  entries: Array<{ date: Date; credits: number; words: number }>,
  now: Date
): UsagePoint[] => {
  const startToday = startOfDay(now);
  const series: UsagePoint[] = [];

  for (let index = 13; index >= 0; index -= 1) {
    const bucketStart = addDays(startToday, -index);
    const bucketEnd = addDays(bucketStart, 1);
    const inDay = entries.filter((entry) => entry.date >= bucketStart && entry.date < bucketEnd);

    series.push({
      label: bucketStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      meetings: inDay.length,
      credits: inDay.reduce((sum, entry) => sum + entry.credits, 0),
      words: inDay.reduce((sum, entry) => sum + entry.words, 0)
    });
  }

  return series;
};

export const buildDashboardStats = (meetings: MeetingDocument[], now = new Date()): DashboardStats => {
  const dayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const datedMeetings = meetings
    .map((meeting) => ({ meeting, date: parseMeetingDate(meeting.meetingDate) }))
    .filter((entry): entry is { meeting: MeetingDocument; date: Date } => Boolean(entry.date));

  const usageByMeeting = datedMeetings.map(({ meeting, date }) => ({
    date,
    credits: Math.max(0, Number(meeting.usageMetrics?.totalTokens || 0)),
    words: Math.max(0, Number(meeting.usageMetrics?.transcriptWordCount || wordCount(meeting.rawTranscript || "")))
  }));

  const meetingsToday = datedMeetings.filter(({ date }) => date >= dayStart).length;
  const meetingsThisWeek = datedMeetings.filter(({ date }) => date >= weekStart).length;
  const meetingsThisMonth = datedMeetings.filter(({ date }) => date >= monthStart).length;

  const creditsToday = usageByMeeting.filter((entry) => entry.date >= dayStart).reduce((sum, entry) => sum + entry.credits, 0);
  const creditsThisWeek = usageByMeeting
    .filter((entry) => entry.date >= weekStart)
    .reduce((sum, entry) => sum + entry.credits, 0);
  const creditsThisMonth = usageByMeeting
    .filter((entry) => entry.date >= monthStart)
    .reduce((sum, entry) => sum + entry.credits, 0);

  const wordsToday = usageByMeeting.filter((entry) => entry.date >= dayStart).reduce((sum, entry) => sum + entry.words, 0);
  const wordsThisWeek = usageByMeeting
    .filter((entry) => entry.date >= weekStart)
    .reduce((sum, entry) => sum + entry.words, 0);
  const wordsThisMonth = usageByMeeting
    .filter((entry) => entry.date >= monthStart)
    .reduce((sum, entry) => sum + entry.words, 0);

  const openActionItems = meetings.reduce(
    (sum, meeting) => sum + meeting.reportJson.actionItems.filter((item) => item.status !== "Closed").length,
    0
  );
  const highRisks = meetings.reduce(
    (sum, meeting) => sum + meeting.reportJson.risks.filter((risk) => risk.severity === "High").length,
    0
  );

  const dates = datedMeetings.map(({ date }) => date);

  return {
    totalMeetings: meetings.length,
    meetingsToday,
    meetingsThisWeek,
    meetingsThisMonth,
    creditsToday,
    creditsThisWeek,
    creditsThisMonth,
    wordsToday,
    wordsThisWeek,
    wordsThisMonth,
    openActionItems,
    highRisks,
    weeklyMeetingSeries: buildWeeklyMeetingSeries(dates, now),
    monthlyMeetingSeries: buildMonthlyMeetingSeries(dates, now),
    dailyUsageSeries: buildDailyUsageSeries(usageByMeeting, now),
    recentMeetings: [...meetings].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6)
  };
};
