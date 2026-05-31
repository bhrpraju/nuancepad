import type { MeetingReport } from "../domain/meeting";

interface MomReportTablesProps {
  report: MeetingReport;
}

const Table = ({ headers, rows }: { headers: string[]; rows: string[][] }) => (
  <div className="overflow-hidden rounded-lg border border-slate-200">
    <table className="w-full border-collapse text-sm">
      <thead className="bg-slate-100 text-left text-slate-700">
        <tr>
          {headers.map((header) => (
            <th key={header} className="border-b px-3 py-2 font-semibold">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row.join("-")}-${index}`} className="odd:bg-white even:bg-slate-50">
            {row.map((cell, cellIndex) => (
              <td key={`${cellIndex}-${cell}`} className="border-b px-3 py-2 align-top text-slate-700">
                {cell || "-"}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export function MomReportTables({ report }: MomReportTablesProps) {
  return (
    <section className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">Executive Summary</h3>
        <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{report.executiveSummary}</p>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-800">Attendees</h3>
        <p className="rounded-lg bg-slate-50 p-3 text-sm">{report.attendees.length ? report.attendees.join(", ") : "Not listed"}</p>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-800">Key Discussion Points</h3>
        <Table headers={["Topic", "Summary"]} rows={report.keyDiscussionPoints.map((item) => [item.topic, item.summary])} />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-800">Decisions</h3>
        <Table
          headers={["Decision", "Owner", "Impact", "Effective Date"]}
          rows={report.decisions.map((item) => [item.decision, item.owner, item.impact, item.effectiveDate])}
        />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-800">Action Items</h3>
        <Table
          headers={["Task", "Owner", "Due", "Priority", "Status"]}
          rows={report.actionItems.map((item) => [item.task, item.owner, item.dueDate, item.priority, item.status])}
        />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-800">Risks</h3>
        <Table
          headers={["Risk", "Severity", "Owner", "Mitigation", "Target Date"]}
          rows={report.risks.map((item) => [item.risk, item.severity, item.owner, item.mitigation, item.targetDate])}
        />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-800">Stakeholder Concerns</h3>
        <Table
          headers={["Stakeholder", "Concern", "Required Response", "Owner", "Due"]}
          rows={report.stakeholderConcerns.map((item) => [item.stakeholder, item.concern, item.requiredResponse, item.owner, item.dueDate])}
        />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-800">Additional Discussed Items</h3>
        <Table
          headers={["Item", "Notes", "Follow-up Needed"]}
          rows={report.additionalDiscussedItems.map((item) => [item.item, item.notes, item.followUpNeeded])}
        />
      </div>
    </section>
  );
}
