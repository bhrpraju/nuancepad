import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { MeetingDocument } from "../domain/meeting";
import { meetingService } from "../services/meetingService";
import { buildDashboardStats } from "../utils/dashboardStats";

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
        setLoadError("Could not load dashboard stats.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const stats = useMemo(() => buildDashboardStats(meetings), [meetings]);

  return (
    <section className="space-y-7">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold">NuancePad Dashboard</h2>
        <p className="text-sm text-slate-600">
          Weekly and monthly tracking for meeting throughput, risks, action load, and execution cadence.
        </p>
      </header>

      {loadError && <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">{loadError}</div>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Total meetings", value: stats.totalMeetings },
          { label: "This week", value: stats.meetingsThisWeek },
          { label: "This month", value: stats.meetingsThisMonth },
          { label: "Open action items", value: stats.openActionItems },
          { label: "High risks", value: stats.highRisks }
        ].map((card) => (
          <article key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{loading ? "-" : card.value}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800">Top Platforms</h3>
          <div className="mt-3 space-y-2">
            {stats.topPlatforms.length === 0 ? (
              <p className="text-sm text-slate-500">No data yet.</p>
            ) : (
              stats.topPlatforms.map((item) => (
                <div key={item.name} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span>{item.name}</span>
                  <span className="font-semibold">{item.count}</span>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800">Top Meeting Types</h3>
          <div className="mt-3 space-y-2">
            {stats.topMeetingTypes.length === 0 ? (
              <p className="text-sm text-slate-500">No data yet.</p>
            ) : (
              stats.topMeetingTypes.map((item) => (
                <div key={item.name} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span>{item.name}</span>
                  <span className="font-semibold">{item.count}</span>
                </div>
              ))
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

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="text-lg font-semibold">Milestones A + B enabled</h3>
        <p className="mt-2 text-sm text-slate-700">
          Paste/upload transcript, upload recording with transcription, generate executive-ready MoM, save history, and export leadership-ready notes.
        </p>
      </div>
    </section>
  );
}
