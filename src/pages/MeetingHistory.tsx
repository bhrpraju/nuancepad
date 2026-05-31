import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { MeetingDocument } from "../domain/meeting";
import { meetingService } from "../services/meetingService";

export function MeetingHistory() {
  const [rows, setRows] = useState<MeetingDocument[]>([]);
  const [query, setQuery] = useState("");
  const [clientProject, setClientProject] = useState("");
  const [meetingType, setMeetingType] = useState("");
  const [platform, setPlatform] = useState("");

  useEffect(() => {
    meetingService
      .list({ query, clientProject, meetingType, platform })
      .then(setRows)
      .catch(() => setRows([]));
  }, [query, clientProject, meetingType, platform]);

  const projects = useMemo(() => Array.from(new Set(rows.map((r) => r.clientProject))).filter(Boolean), [rows]);
  const types = useMemo(() => Array.from(new Set(rows.map((r) => r.meetingType))).filter(Boolean), [rows]);
  const platforms = useMemo(() => Array.from(new Set(rows.map((r) => r.platform))).filter(Boolean), [rows]);

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold">Meeting History</h2>
      </header>

      <div className="grid gap-2 md:grid-cols-4">
        <input
          className="rounded border p-2 text-sm"
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="rounded border p-2 text-sm" value={clientProject} onChange={(e) => setClientProject(e.target.value)}>
          <option value="">All projects</option>
          {projects.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select className="rounded border p-2 text-sm" value={meetingType} onChange={(e) => setMeetingType(e.target.value)}>
          <option value="">All meeting types</option>
          {types.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select className="rounded border p-2 text-sm" value={platform} onChange={(e) => setPlatform(e.target.value)}>
          <option value="">All platforms</option>
          {platforms.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="border-b px-3 py-2">Title</th>
              <th className="border-b px-3 py-2">Project</th>
              <th className="border-b px-3 py-2">Type</th>
              <th className="border-b px-3 py-2">Platform</th>
              <th className="border-b px-3 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((meeting) => (
              <tr key={meeting.id} className="odd:bg-white even:bg-slate-50">
                <td className="border-b px-3 py-2">
                  <Link className="font-medium text-slate-900 hover:underline" to={`/meetings/${meeting.id}`}>
                    {meeting.title}
                  </Link>
                </td>
                <td className="border-b px-3 py-2">{meeting.clientProject}</td>
                <td className="border-b px-3 py-2">{meeting.meetingType}</td>
                <td className="border-b px-3 py-2">{meeting.platform}</td>
                <td className="border-b px-3 py-2">{meeting.meetingDate}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                  No meetings found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
