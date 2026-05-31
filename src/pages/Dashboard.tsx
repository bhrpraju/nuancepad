import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { MeetingDocument } from "../domain/meeting";
import { meetingService } from "../services/meetingService";
import { buildDashboardStats } from "../utils/dashboardStats";

function deltaLabel(current: number, previous: number): string {
  if (previous === 0) {
    return current > 0 ? "+100%" : "0%";
  }
  const delta = Math.round(((current - previous) / previous) * 100);
  return `${delta > 0 ? "+" : ""}${delta}%`;
}

function Sparkline({ values }: { values: number[] }) {
  const width = 240;
  const height = 64;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? width / (values.length - 1) : width;

  const points = values
    .map((value, index) => {
      const x = index * step;
      const y = height - (value / max) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full">
      <polyline fill="none" stroke="#2563eb" strokeWidth="3" points={points} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function VerticalBars({ labels, values }: { labels: string[]; values: number[] }) {
  const max = Math.max(1, ...values);

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2">
        {values.map((value, index) => (
          <div key={`${labels[index]}-${value}`} className="flex flex-1 flex-col items-center gap-1">
            <div className="w-full rounded-t bg-sky-500/80" style={{ height: `${Math.max(6, (value / max) * 110)}px` }} />
            <span className="text-xs text-slate-500">{labels[index]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Dashboard() {
  const [meetings, setMeetings] = useState<MeetingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const list = await meetingService.list();
        setMeetings(list);
      } catch {
        setLoadError("Could not load dashboard KPIs.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const stats = useMemo(() => buildDashboardStats(meetings), [meetings]);

  const kpis = [
    {
      label: "Meetings this week",
      value: stats.meetingsThisWeek,
      trend: deltaLabel(stats.meetingsThisWeek, stats.meetingsPreviousWeek),
      tone: "text-emerald-600"
    },
    {
      label: "Meetings this month",
      value: stats.meetingsThisMonth,
      trend: deltaLabel(stats.meetingsThisMonth, stats.meetingsPreviousMonth),
      tone: "text-blue-600"
    },
    {
      label: "Open action items",
      value: stats.openActionItems,
      trend: `${stats.completionRate}% closed`,
      tone: "text-amber-600"
    },
    {
      label: "High risks",
      value: stats.highRisks,
      trend: stats.highRisks > 0 ? "Needs review" : "Healthy",
      tone: stats.highRisks > 0 ? "text-rose-600" : "text-emerald-600"
    },
    {
      label: "Total meetings",
      value: stats.totalMeetings,
      trend: `${stats.topPlatforms[0]?.name ?? "No platform"} leading`,
      tone: "text-slate-600"
    }
  ];

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900">KPI Dashboard</h2>
        <p className="text-sm text-slate-600">Weekly and monthly operations view for throughput, execution, and risk posture.</p>
      </header>

      {loadError && <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">{loadError}</div>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <article key={kpi.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">{kpi.label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{loading ? "-" : kpi.value}</p>
            <p className={`mt-1 text-xs font-medium ${kpi.tone}`}>{loading ? "Loading..." : kpi.trend}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Weekly Throughput Trend</h3>
            <span className="text-xs text-slate-500">Last 8 weeks</span>
          </div>
          <Sparkline values={stats.weeklySeries.map((item) => item.count)} />
          <div className="mt-2 grid grid-cols-4 gap-2 text-xs text-slate-500 sm:grid-cols-8">
            {stats.weeklySeries.map((item) => (
              <div key={item.label} className="rounded bg-slate-50 px-2 py-1 text-center">
                {item.label}
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Monthly Volume</h3>
            <span className="text-xs text-slate-500">Last 6 months</span>
          </div>
          <VerticalBars
            labels={stats.monthlySeries.map((item) => item.label)}
            values={stats.monthlySeries.map((item) => item.count)}
          />
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800">Platform Distribution</h3>
          <div className="mt-3 space-y-2">
            {stats.topPlatforms.length === 0 ? (
              <p className="text-sm text-slate-500">No data yet.</p>
            ) : (
              stats.topPlatforms.map((item) => {
                const percent = stats.totalMeetings ? Math.round((item.count / stats.totalMeetings) * 100) : 0;
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{item.name}</span>
                      <span className="font-semibold">{item.count} ({percent}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800">Meeting Type Distribution</h3>
          <div className="mt-3 space-y-2">
            {stats.topMeetingTypes.length === 0 ? (
              <p className="text-sm text-slate-500">No data yet.</p>
            ) : (
              stats.topMeetingTypes.map((item) => {
                const percent = stats.totalMeetings ? Math.round((item.count / stats.totalMeetings) * 100) : 0;
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{item.name}</span>
                      <span className="font-semibold">{item.count} ({percent}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-sky-500" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </article>
      </div>

      <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-800">Recent Meetings</h3>
          <Link to="/meetings/new" className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white">
            Create New Meeting
          </Link>
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="border-b px-3 py-2">Title</th>
                <th className="border-b px-3 py-2">Project</th>
                <th className="border-b px-3 py-2">Platform</th>
                <th className="border-b px-3 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentMeetings.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                    No meetings saved yet.
                  </td>
                </tr>
              ) : (
                stats.recentMeetings.map((meeting) => (
                  <tr key={meeting.id} className="odd:bg-white even:bg-slate-50">
                    <td className="border-b px-3 py-2">
                      <Link to={`/meetings/${meeting.id}`} className="font-medium text-slate-900 hover:underline">
                        {meeting.title}
                      </Link>
                    </td>
                    <td className="border-b px-3 py-2">{meeting.clientProject}</td>
                    <td className="border-b px-3 py-2">{meeting.platform}</td>
                    <td className="border-b px-3 py-2">{meeting.meetingDate}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
