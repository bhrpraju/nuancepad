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

const copy = async (text: string) => navigator.clipboard.writeText(text);

export function ExportActions({ meeting }: ExportActionsProps) {
  const markdown = toMarkdown(meeting);

  return (
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
  );
}
