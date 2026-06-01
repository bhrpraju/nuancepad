import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { MeetingDocument } from "../domain/meeting";
import { meetingService } from "../services/meetingService";
import { buildDashboardStats } from "../utils/dashboardStats";

function NumberCard({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
    </article>
  );
}

function LineChart({
  values,
  stroke,
  fill
}: {
  values: number[];
  stroke: string;
  fill: string;
}) {
  const width = 560;
  const height = 160;
  const safe = values.length > 0 ? values : [0];
  const max = Math.max(1, ...safe);
  const step = safe.length > 1 ? width / (safe.length - 1) : width;

  const points = safe
    .map((value, index) => {
      const x = index * step;
      const y = height - (value / max) * (height - 16) - 8;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full">
      <polygon points={areaPoints} fill={fill} />
      <polyline fill="none" stroke={stroke} strokeWidth="3" points={points} strokeLinecap="round" strokeLinejoin="round" />
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
            <div className="w-full rounded-t bg-indigo-500/80" style={{ height: `${Math.max(8, (value / max) * 120)}px` }} />
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

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Dashboard</h2>
        <p className="text-sm text-slate-600">Meeting activity and usage overview.</p>
      </header>

      {loadError && <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">{loadError}</div>}

      <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Meetings</h3>
          <span className="text-xs text-slate-500">Today / This week / This month / Overall</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <NumberCard label="Today" value={loading ? "-" : stats.meetingsToday} />
          <NumberCard label="This week" value={loading ? "-" : stats.meetingsThisWeek} />
          <NumberCard label="This month" value={loading ? "-" : stats.meetingsThisMonth} />
          <NumberCard label="Overall" value={loading ? "-" : stats.totalMeetings} />
        </div>
      </article>

      <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Credits Usage</h3>
          <span className="text-xs text-slate-500">Today / This week / This month</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <NumberCard label="Today" value={loading ? "-" : stats.creditsToday} />
          <NumberCard label="This week" value={loading ? "-" : stats.creditsThisWeek} />
          <NumberCard label="This month" value={loading ? "-" : stats.creditsThisMonth} />
        </div>
      </article>

      <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Link Intake Metrics</h3>
          <span className="text-xs text-slate-500">Milestone C diagnostics</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <NumberCard label="Attempted" value={loading ? "-" : stats.linkImportsAttempted} />
          <NumberCard label="Completed" value={loading ? "-" : stats.linkImportsCompleted} />
          <NumberCard label="Manual required" value={loading ? "-" : stats.linkImportsManualUploadRequired} />
          <NumberCard label="Failed" value={loading ? "-" : stats.linkImportsFailed} />
          <NumberCard label="Fallback rate" value={loading ? "-" : `${stats.linkImportFallbackRate}%`} />
        </div>
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="border-b px-3 py-2">Platform</th>
                <th className="border-b px-3 py-2">Attempts</th>
              </tr>
            </thead>
            <tbody>
              {stats.linkPlatformBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-3 py-4 text-center text-slate-500">
                    No link import attempts yet.
                  </td>
                </tr>
              ) : (
                stats.linkPlatformBreakdown.map((item) => (
                  <tr key={`${item.label}-${item.count}`} className="odd:bg-white even:bg-slate-50">
                    <td className="border-b px-3 py-2 capitalize">{item.label}</td>
                    <td className="border-b px-3 py-2">{item.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Meetings Trend</h3>
            <span className="text-xs text-slate-500">Last 14 days</span>
          </div>
          <LineChart
            values={stats.dailyUsageSeries.map((item) => item.meetings)}
            stroke="#2563eb"
            fill="rgba(37,99,235,0.12)"
          />
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500 sm:grid-cols-7">
            {stats.dailyUsageSeries.slice(-7).map((item) => (
              <div key={item.label} className="rounded bg-slate-50 px-2 py-1 text-center">
                {item.label}
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Credits Trend</h3>
            <span className="text-xs text-slate-500">Last 14 days</span>
          </div>
          <LineChart
            values={stats.dailyUsageSeries.map((item) => item.credits)}
            stroke="#0f766e"
            fill="rgba(15,118,110,0.12)"
          />
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500 sm:grid-cols-7">
            {stats.dailyUsageSeries.slice(-7).map((item) => (
              <div key={item.label} className="rounded bg-slate-50 px-2 py-1 text-center">
                {item.label}
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Monthly Meetings</h3>
            <span className="text-xs text-slate-500">Last 6 months</span>
          </div>
          <VerticalBars
            labels={stats.monthlyMeetingSeries.map((item) => item.label)}
            values={stats.monthlyMeetingSeries.map((item) => item.count)}
          />
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800">Word Conversion</h3>
          <div className="mt-3 space-y-3 text-sm">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs uppercase text-slate-500">Today</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{loading ? "-" : stats.wordsToday}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs uppercase text-slate-500">This week</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{loading ? "-" : stats.wordsThisWeek}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs uppercase text-slate-500">This month</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{loading ? "-" : stats.wordsThisMonth}</p>
            </div>
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
