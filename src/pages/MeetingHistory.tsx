import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { MeetingDocument } from "../domain/meeting";
import { meetingService } from "../services/meetingService";
import { linkSourceLabel } from "../utils/linkIntake";

export function MeetingHistory() {
  const [rows, setRows] = useState<MeetingDocument[]>([]);
  const [query, setQuery] = useState("");
  const [clientProject, setClientProject] = useState("");
  const [meetingType, setMeetingType] = useState("");
  const [platform, setPlatform] = useState("");
  const [momTemplate, setMomTemplate] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [linkImportStatus, setLinkImportStatus] = useState("");

  useEffect(() => {
    meetingService
      .list({ query, clientProject, meetingType, platform, momTemplate, sourceType, linkImportStatus })
      .then(setRows)
      .catch(() => setRows([]));
  }, [query, clientProject, meetingType, platform, momTemplate, sourceType, linkImportStatus]);

  const projects = useMemo(() => Array.from(new Set(rows.map((r) => r.clientProject))).filter(Boolean), [rows]);
  const types = useMemo(() => Array.from(new Set(rows.map((r) => r.meetingType))).filter(Boolean), [rows]);
  const platforms = useMemo(() => Array.from(new Set(rows.map((r) => r.platform))).filter(Boolean), [rows]);
  const templates = useMemo(() => Array.from(new Set(rows.map((r) => r.momTemplate))).filter(Boolean), [rows]);
  const sourceTypes = useMemo(() => Array.from(new Set(rows.map((r) => r.sourceType))).filter(Boolean), [rows]);
  const linkStatuses = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.linkImportStatus || "not_attempted"))).filter(
        (item) => item !== "not_attempted"
      ),
    [rows]
  );

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold">Meeting History</h2>
      </header>

      <div className="grid gap-2 md:grid-cols-7">
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
        <select className="rounded border p-2 text-sm" value={momTemplate} onChange={(e) => setMomTemplate(e.target.value)}>
          <option value="">All templates</option>
          {templates.map((item) => (
            <option key={item} value={item}>
              {item.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <select className="rounded border p-2 text-sm" value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
          <option value="">All intake sources</option>
          {sourceTypes.map((item) => (
            <option key={item} value={item}>
              {linkSourceLabel(item)}
            </option>
          ))}
        </select>
        <select
          className="rounded border p-2 text-sm"
          value={linkImportStatus}
          onChange={(e) => setLinkImportStatus(e.target.value)}
        >
          <option value="">All link import states</option>
              {linkStatuses.map((item) => (
                <option key={item} value={item}>
                  {item.replace(/_/g, " ")}
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
              <th className="border-b px-3 py-2">Template</th>
              <th className="border-b px-3 py-2">Ingestion</th>
              <th className="border-b px-3 py-2">Link status</th>
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
                <td className="border-b px-3 py-2">{meeting.momTemplate.replace(/_/g, " ")}</td>
                <td className="border-b px-3 py-2">{linkSourceLabel(meeting.finalIntakeMethod || meeting.sourceType)}</td>
                <td className="border-b px-3 py-2">{(meeting.linkImportStatus || "not_attempted").replace(/_/g, " ")}</td>
                <td className="border-b px-3 py-2">{meeting.meetingDate}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
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
