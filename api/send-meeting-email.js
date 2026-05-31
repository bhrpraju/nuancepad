function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function text(res, status, message) {
  res.status(status).setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end(message);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeRecipients(raw) {
  return String(raw || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function tableHtml(headers, rows) {
  const head = headers.map((header) => `<th style="border:1px solid #dbe3f0;padding:8px;text-align:left;background:#f8fafc;">${escapeHtml(header)}</th>`).join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${row
          .map((cell) => `<td style="border:1px solid #dbe3f0;padding:8px;vertical-align:top;">${escapeHtml(cell || "-")}</td>`)
          .join("")}</tr>`
    )
    .join("");
  return `<table style="border-collapse:collapse;width:100%;margin:8px 0 16px;">${`<thead><tr>${head}</tr></thead>`}<tbody>${body}</tbody></table>`;
}

function buildHtml(meeting) {
  const report = meeting?.reportJson || {};
  const attendees = Array.isArray(report.attendees) && report.attendees.length ? report.attendees.join(", ") : "Not listed";

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.5;">
    <h2 style="margin:0 0 10px;">Minutes of Meeting: ${escapeHtml(meeting.title || "Meeting")}</h2>
    <p style="margin:0 0 16px;"><strong>Date:</strong> ${escapeHtml(meeting.meetingDate || "-")} |
      <strong>Client/Project:</strong> ${escapeHtml(meeting.clientProject || "-")} |
      <strong>Platform:</strong> ${escapeHtml(meeting.platform || "-")}</p>

    <h3 style="margin:16px 0 6px;">Executive Summary</h3>
    <p style="white-space:pre-wrap;margin:0 0 12px;">${escapeHtml(report.executiveSummary || "")}</p>

    <h3 style="margin:16px 0 6px;">Attendees</h3>
    <p style="margin:0 0 12px;">${escapeHtml(attendees)}</p>

    <h3 style="margin:16px 0 6px;">Decisions</h3>
    ${tableHtml(
      ["Decision", "Owner", "Impact", "Effective Date"],
      (report.decisions || []).map((item) => [item.decision, item.owner, item.impact, item.effectiveDate])
    )}

    <h3 style="margin:16px 0 6px;">Action Items</h3>
    ${tableHtml(
      ["Task", "Owner", "Due Date", "Priority", "Status"],
      (report.actionItems || []).map((item) => [item.task, item.owner, item.dueDate, item.priority, item.status])
    )}

    <h3 style="margin:16px 0 6px;">Risks</h3>
    ${tableHtml(
      ["Risk", "Severity", "Owner", "Mitigation", "Target Date"],
      (report.risks || []).map((item) => [item.risk, item.severity, item.owner, item.mitigation, item.targetDate])
    )}

    <h3 style="margin:16px 0 6px;">Stakeholder Concerns</h3>
    ${tableHtml(
      ["Stakeholder", "Concern", "Required Response", "Owner", "Due"],
      (report.stakeholderConcerns || []).map((item) => [item.stakeholder, item.concern, item.requiredResponse, item.owner, item.dueDate])
    )}

    <h3 style="margin:16px 0 6px;">Additional Discussed Items</h3>
    ${tableHtml(
      ["Item", "Notes", "Follow-up Needed"],
      (report.additionalDiscussedItems || []).map((item) => [item.item, item.notes, item.followUpNeeded])
    )}

    <h3 style="margin:16px 0 6px;">Follow-up Email Draft</h3>
    <p style="white-space:pre-wrap;margin:0;">${escapeHtml(report.followUpEmail || "")}</p>
  </div>`;
}

function buildText(meeting) {
  const report = meeting?.reportJson || {};
  const attendees = Array.isArray(report.attendees) && report.attendees.length ? report.attendees.join(", ") : "Not listed";
  return `Minutes of Meeting: ${meeting.title || "Meeting"}
Date: ${meeting.meetingDate || "-"} | Client/Project: ${meeting.clientProject || "-"} | Platform: ${meeting.platform || "-"}

Executive Summary:
${report.executiveSummary || ""}

Attendees:
${attendees}

Decisions:
${(report.decisions || []).map((item, i) => `${i + 1}. ${item.decision} | Owner: ${item.owner} | Impact: ${item.impact} | Date: ${item.effectiveDate}`).join("\n")}

Action Items:
${(report.actionItems || []).map((item, i) => `${i + 1}. ${item.task} | Owner: ${item.owner} | Due: ${item.dueDate} | ${item.priority} | ${item.status}`).join("\n")}

Risks:
${(report.risks || []).map((item, i) => `${i + 1}. ${item.risk} | ${item.severity} | Owner: ${item.owner}`).join("\n")}

Stakeholder Concerns:
${(report.stakeholderConcerns || []).map((item, i) => `${i + 1}. ${item.stakeholder}: ${item.concern}`).join("\n")}

Additional Discussed Items:
${(report.additionalDiscussedItems || []).map((item, i) => `${i + 1}. ${item.item}: ${item.notes}`).join("\n")}

Follow-up Email Draft:
${report.followUpEmail || ""}`;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      text(res, 405, "Method not allowed");
      return;
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.EMAIL_FROM;
    if (!resendApiKey || !fromEmail) {
      text(res, 500, "Email provider not configured. Set RESEND_API_KEY and EMAIL_FROM.");
      return;
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
    const meeting = body?.meeting || null;
    const recipients = normalizeRecipients(body?.to);

    if (!meeting || !meeting.title || !meeting.reportJson) {
      text(res, 400, "Meeting payload is required.");
      return;
    }

    if (!recipients.length) {
      text(res, 400, "At least one recipient is required.");
      return;
    }

    const subject = `MoM: ${meeting.title} (${meeting.meetingDate || "date not specified"})`;
    const html = buildHtml(meeting);
    const textBody = buildText(meeting);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromEmail,
        to: recipients,
        subject,
        html,
        text: textBody
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      text(res, 502, `Email send failed. Upstream: ${errorText.slice(0, 500)}`);
      return;
    }

    const payload = await response.json();
    json(res, 200, { status: "sent", provider: "resend", id: payload?.id || "" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    text(res, 500, `Backend error: ${message}`);
  }
}
