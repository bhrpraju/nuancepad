import { useMemo, useState } from "react";
import type { MeetingDocument } from "../domain/meeting";

interface ExportActionsProps {
  meeting: Pick<MeetingDocument, "title" | "meetingDate" | "clientProject" | "platform" | "reportJson">;
}

const tableRows = (rows: string[][]) => rows.map((row) => `| ${row.join(" | ")} |`).join("\n");

const toMarkdown = (meeting: ExportActionsProps["meeting"]) => {
  const report = meeting.reportJson;

  return `# Minutes of Meeting: ${meeting.title}
**Date:** ${meeting.meetingDate} | **Client/Project:** ${meeting.clientProject} | **Platform:** ${meeting.platform}

## Executive Summary
${report.executiveSummary}

## Attendees
${report.attendees.join(", ") || "Not listed"}

## Decisions
| Decision | Owner | Impact | Effective Date |
|---|---|---|---|
${tableRows(report.decisions.map((item) => [item.decision, item.owner, item.impact, item.effectiveDate]))}

## Action Items
| Task | Owner | Due Date | Priority | Status |
|---|---|---|---|---|
${tableRows(report.actionItems.map((item) => [item.task, item.owner, item.dueDate, item.priority, item.status]))}

## Risks
| Risk | Severity | Owner | Mitigation | Target Date |
|---|---|---|---|---|
${tableRows(report.risks.map((item) => [item.risk, item.severity, item.owner, item.mitigation, item.targetDate]))}

## Stakeholder Concerns
| Stakeholder | Concern | Required Response | Owner | Due |
|---|---|---|---|---|
${tableRows(report.stakeholderConcerns.map((item) => [item.stakeholder, item.concern, item.requiredResponse, item.owner, item.dueDate]))}

## Additional Discussed Items
| Item | Notes | Follow-up Needed |
|---|---|---|
${tableRows(report.additionalDiscussedItems.map((item) => [item.item, item.notes, item.followUpNeeded]))}

## Follow-up Email Draft
${report.followUpEmail}
`;
};

const toEmailBody = (meeting: ExportActionsProps["meeting"]) => {
  const report = meeting.reportJson;
  const actionLines = report.actionItems.length
    ? report.actionItems.map((item, index) => `${index + 1}. ${item.task} | Owner: ${item.owner} | Due: ${item.dueDate} | ${item.status}`).join("\n")
    : "No action items captured.";

  return `Hi team,

Please find minutes of meeting for ${meeting.title} (${meeting.meetingDate}).

Executive summary:
${report.executiveSummary}

Decisions:
${report.decisions.length ? report.decisions.map((item, index) => `${index + 1}. ${item.decision} (Owner: ${item.owner})`).join("\n") : "No decisions captured."}

Action items:
${actionLines}

Follow-up draft:
${report.followUpEmail}

Regards,`;
};

const copy = async (text: string) => navigator.clipboard.writeText(text);

export function ExportActions({ meeting }: ExportActionsProps) {
  const [emailTo, setEmailTo] = useState("");
  const markdown = toMarkdown(meeting);
  const emailSubject = useMemo(() => `MoM: ${meeting.title} (${meeting.meetingDate})`, [meeting.meetingDate, meeting.title]);
  const emailBody = useMemo(() => toEmailBody(meeting), [meeting]);
  const emailHref = useMemo(
    () => `mailto:${encodeURIComponent(emailTo.trim())}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`,
    [emailBody, emailSubject, emailTo]
  );

  return (
    <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"
          onClick={() => copy(meeting.reportJson.executiveSummary)}
        >
          Copy summary
        </button>
        <button
          type="button"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          onClick={() => copy(JSON.stringify(meeting.reportJson.actionItems, null, 2))}
        >
          Copy action items
        </button>
        <button
          type="button"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          onClick={() => copy(meeting.reportJson.followUpEmail)}
        >
          Copy follow-up email
        </button>
        <a
          href={`data:text/markdown;charset=utf-8,${encodeURIComponent(markdown)}`}
          download={`${meeting.title || "meeting"}.md`}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          Export markdown
        </a>
      </div>

      <div className="grid gap-2 md:grid-cols-[1fr_auto]">
        <input
          type="text"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Email recipients (comma-separated)"
          value={emailTo}
          onChange={(e) => setEmailTo(e.target.value)}
        />
        <a
          href={emailTo.trim() ? emailHref : "#"}
          onClick={(e) => {
            if (!emailTo.trim()) {
              e.preventDefault();
            }
          }}
          className={`rounded-lg px-3 py-2 text-sm text-center ${emailTo.trim() ? "bg-slate-900 text-white" : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"}`}
        >
          Send follow-up email
        </a>
      </div>
    </section>
  );
}
