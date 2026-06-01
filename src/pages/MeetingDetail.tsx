import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ExportActions } from "../components/ExportActions";
import { MomReportTables } from "../components/MomReportTables";
import type { MeetingDocument } from "../domain/meeting";
import { meetingService } from "../services/meetingService";
import { linkSourceLabel } from "../utils/linkIntake";

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

      <section className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
        <h3 className="mb-2 text-sm font-semibold text-slate-800">Ingestion Metadata</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <p>
            <span className="font-medium">Source:</span> {linkSourceLabel(meeting.sourceType)}
          </p>
          <p>
            <span className="font-medium">Final intake method:</span> {linkSourceLabel(meeting.finalIntakeMethod || meeting.sourceType)}
          </p>
          <p>
            <span className="font-medium">Template:</span> {meeting.momTemplate.replace(/_/g, " ")}
          </p>
          <p>
            <span className="font-medium">Link import status:</span> {(meeting.linkImportStatus || "not_attempted").replace(/_/g, " ")}
          </p>
          {meeting.detectedPlatform && (
            <p>
              <span className="font-medium">Detected platform:</span> {meeting.detectedPlatform.replace(/_/g, " ")}
            </p>
          )}
          {meeting.linkImportReasonCode && (
            <p>
              <span className="font-medium">Fallback reason:</span> {meeting.linkImportReasonCode.replace(/_/g, " ")}
            </p>
          )}
          {meeting.linkImportAttemptedAt && (
            <p>
              <span className="font-medium">Link attempt:</span> {meeting.linkImportAttemptedAt}
            </p>
          )}
          {meeting.linkImportCompletedAt && (
            <p>
              <span className="font-medium">Link completed:</span> {meeting.linkImportCompletedAt}
            </p>
          )}
          {meeting.linkImportDiagnostics?.summary && (
            <p className="sm:col-span-2">
              <span className="font-medium">Diagnostic summary:</span> {meeting.linkImportDiagnostics.summary}
            </p>
          )}
        </div>
      </section>

      <ExportActions
        meeting={{
          title: meeting.title,
          meetingDate: meeting.meetingDate,
          meetingType: meeting.meetingType,
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
