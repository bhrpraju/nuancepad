import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ExportActions } from "../components/ExportActions";
import { MomReportTables } from "../components/MomReportTables";
import type { MeetingDocument } from "../domain/meeting";
import { meetingService } from "../services/meetingService";

export function MeetingDetail() {
  const { id = "" } = useParams();
  const [meeting, setMeeting] = useState<MeetingDocument | null>(null);

  useEffect(() => {
    meetingService.getById(id).then(setMeeting).catch(() => setMeeting(null));
  }, [id]);

  if (!meeting) {
    return <p className="text-sm text-slate-600">Meeting not found.</p>;
  }

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold">{meeting.title}</h2>
        <p className="text-sm text-slate-600">
          {meeting.clientProject} · {meeting.meetingDate} · {meeting.platform}
        </p>
      </header>

      <ExportActions
        meeting={{
          title: meeting.title,
          meetingDate: meeting.meetingDate,
          clientProject: meeting.clientProject,
          platform: meeting.platform,
          reportJson: meeting.reportJson
        }}
      />

      <MomReportTables report={meeting.reportJson} />

      <details className="rounded-lg border border-slate-200 p-3">
        <summary className="cursor-pointer text-sm font-semibold">Transcript</summary>
        <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{meeting.rawTranscript}</pre>
      </details>
    </section>
  );
}
