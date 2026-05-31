import nodemailer from "nodemailer";

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

const ALLOWED_EMAIL_TYPES = new Set([
  "full_mom",
  "action_items",
  "decisions",
  "risks_and_concerns",
  "follow_up_email"
]);

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

function tableOrMessageHtml(headers, rows, emptyMessage) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return `<p style="margin:8px 0 16px;color:#334155;">${escapeHtml(emptyMessage)}</p>`;
  }
  return tableHtml(headers, rows);
}

function buildHeaderHtml(meeting) {
  return `<h2 style="margin:0 0 10px;">Minutes of Meeting: ${escapeHtml(meeting.title || "Meeting")}</h2>
    <p style="margin:0 0 16px;"><strong>Date:</strong> ${escapeHtml(meeting.meetingDate || "-")} |
      <strong>Type:</strong> ${escapeHtml(meeting.meetingType || "-")} |
      <strong>Client/Project:</strong> ${escapeHtml(meeting.clientProject || "-")} |
      <strong>Platform:</strong> ${escapeHtml(meeting.platform || "-")}</p>`;
}

export function buildHtmlByType(meeting, emailType) {
  const report = meeting?.reportJson || {};
  const attendees = Array.isArray(report.attendees) && report.attendees.length ? report.attendees.join(", ") : "Not listed";
  const header = buildHeaderHtml(meeting);
  if (emailType === "action_items") {
    return `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.5;">
      ${header}
      <h3 style="margin:16px 0 6px;">Action Items</h3>
      ${tableOrMessageHtml(
        ["Task", "Owner", "Due Date", "Priority", "Status"],
        (report.actionItems || []).map((item) => [item.task, item.owner, item.dueDate, item.priority, item.status]),
        "No action items were captured for this meeting."
      )}
    </div>`;
  }

  if (emailType === "decisions") {
    return `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.5;">
      ${header}
      <h3 style="margin:16px 0 6px;">Decisions</h3>
      ${tableOrMessageHtml(
        ["Decision", "Owner", "Impact", "Effective Date"],
        (report.decisions || []).map((item) => [item.decision, item.owner, item.impact, item.effectiveDate]),
        "No decisions were captured for this meeting."
      )}
    </div>`;
  }

  if (emailType === "risks_and_concerns") {
    return `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.5;">
      ${header}
      <h3 style="margin:16px 0 6px;">Risks</h3>
      ${tableOrMessageHtml(
        ["Risk", "Severity", "Owner", "Mitigation", "Target Date"],
        (report.risks || []).map((item) => [item.risk, item.severity, item.owner, item.mitigation, item.targetDate]),
        "No risks were captured for this meeting."
      )}
      <h3 style="margin:16px 0 6px;">Stakeholder Concerns</h3>
      ${tableOrMessageHtml(
        ["Stakeholder", "Concern", "Required Response", "Owner", "Due"],
        (report.stakeholderConcerns || []).map((item) => [item.stakeholder, item.concern, item.requiredResponse, item.owner, item.dueDate]),
        "No stakeholder concerns were captured for this meeting."
      )}
    </div>`;
  }

  if (emailType === "follow_up_email") {
    const draft = String(report.followUpEmail || "").trim();
    return `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.5;">
      <p style="white-space:pre-wrap;margin:0;">${escapeHtml(draft || "No follow-up email draft was generated for this meeting.")}</p>
    </div>`;
  }

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.5;">
    ${header}

    <h3 style="margin:16px 0 6px;">Executive Summary</h3>
    <p style="white-space:pre-wrap;margin:0 0 12px;">${escapeHtml(report.executiveSummary || "")}</p>

    <h3 style="margin:16px 0 6px;">Key Discussion Points</h3>
    ${tableOrMessageHtml(
      ["Topic", "Summary"],
      (report.keyDiscussionPoints || []).map((item) => [item.topic, item.summary]),
      "No key discussion points were captured for this meeting."
    )}

    <h3 style="margin:16px 0 6px;">Decisions</h3>
    ${tableOrMessageHtml(
      ["Decision", "Owner", "Impact", "Effective Date"],
      (report.decisions || []).map((item) => [item.decision, item.owner, item.impact, item.effectiveDate]),
      "No decisions were captured for this meeting."
    )}

    <h3 style="margin:16px 0 6px;">Action Items</h3>
    ${tableOrMessageHtml(
      ["Task", "Owner", "Due Date", "Priority", "Status"],
      (report.actionItems || []).map((item) => [item.task, item.owner, item.dueDate, item.priority, item.status]),
      "No action items were captured for this meeting."
    )}

    <h3 style="margin:16px 0 6px;">Risks</h3>
    ${tableOrMessageHtml(
      ["Risk", "Severity", "Owner", "Mitigation", "Target Date"],
      (report.risks || []).map((item) => [item.risk, item.severity, item.owner, item.mitigation, item.targetDate]),
      "No risks were captured for this meeting."
    )}

    <h3 style="margin:16px 0 6px;">Stakeholder Concerns</h3>
    ${tableOrMessageHtml(
      ["Stakeholder", "Concern", "Required Response", "Owner", "Due"],
      (report.stakeholderConcerns || []).map((item) => [item.stakeholder, item.concern, item.requiredResponse, item.owner, item.dueDate]),
      "No stakeholder concerns were captured for this meeting."
    )}

    <h3 style="margin:16px 0 6px;">Additional Discussed Items</h3>
    ${tableOrMessageHtml(
      ["Item", "Notes", "Follow-up Needed"],
      (report.additionalDiscussedItems || []).map((item) => [item.item, item.notes, item.followUpNeeded]),
      "No additional discussed items were captured for this meeting."
    )}
  </div>`;
}

export function buildTextByType(meeting, emailType) {
  const report = meeting?.reportJson || {};

  if (emailType === "action_items") {
    return `Action Items: ${meeting.title || "Meeting"}
Date: ${meeting.meetingDate || "-"} | Type: ${meeting.meetingType || "-"} | Client/Project: ${meeting.clientProject || "-"} | Platform: ${meeting.platform || "-"}

${(report.actionItems || []).length
  ? (report.actionItems || []).map((item, i) => `${i + 1}. ${item.task} | Owner: ${item.owner} | Due: ${item.dueDate} | ${item.priority} | ${item.status}`).join("\n")
  : "No action items were captured for this meeting."}`;
  }

  if (emailType === "decisions") {
    return `Decisions: ${meeting.title || "Meeting"}
Date: ${meeting.meetingDate || "-"} | Type: ${meeting.meetingType || "-"} | Client/Project: ${meeting.clientProject || "-"} | Platform: ${meeting.platform || "-"}

${(report.decisions || []).length
  ? (report.decisions || []).map((item, i) => `${i + 1}. ${item.decision} | Owner: ${item.owner} | Impact: ${item.impact} | Effective: ${item.effectiveDate}`).join("\n")
  : "No decisions were captured for this meeting."}`;
  }

  if (emailType === "risks_and_concerns") {
    return `Risks & Concerns: ${meeting.title || "Meeting"}
Date: ${meeting.meetingDate || "-"} | Type: ${meeting.meetingType || "-"} | Client/Project: ${meeting.clientProject || "-"} | Platform: ${meeting.platform || "-"}

Risks:
${(report.risks || []).length
  ? (report.risks || []).map((item, i) => `${i + 1}. ${item.risk} | ${item.severity} | Owner: ${item.owner}`).join("\n")
  : "No risks were captured for this meeting."}

Stakeholder Concerns:
${(report.stakeholderConcerns || []).length
  ? (report.stakeholderConcerns || []).map((item, i) => `${i + 1}. ${item.stakeholder}: ${item.concern}`).join("\n")
  : "No stakeholder concerns were captured for this meeting."}`;
  }

  if (emailType === "follow_up_email") {
    return `${report.followUpEmail || "No follow-up email draft was generated for this meeting."}`;
  }

  return `Minutes of Meeting: ${meeting.title || "Meeting"}
Date: ${meeting.meetingDate || "-"} | Type: ${meeting.meetingType || "-"} | Client/Project: ${meeting.clientProject || "-"} | Platform: ${meeting.platform || "-"}

Executive Summary:
${report.executiveSummary || ""}

Key Discussion Points:
${(report.keyDiscussionPoints || []).length
  ? (report.keyDiscussionPoints || []).map((item, i) => `${i + 1}. ${item.topic}: ${item.summary}`).join("\n")
  : "No key discussion points were captured for this meeting."}

Decisions:
${(report.decisions || []).length
  ? (report.decisions || []).map((item, i) => `${i + 1}. ${item.decision} | Owner: ${item.owner} | Impact: ${item.impact} | Date: ${item.effectiveDate}`).join("\n")
  : "No decisions were captured for this meeting."}

Action Items:
${(report.actionItems || []).length
  ? (report.actionItems || []).map((item, i) => `${i + 1}. ${item.task} | Owner: ${item.owner} | Due: ${item.dueDate} | ${item.priority} | ${item.status}`).join("\n")
  : "No action items were captured for this meeting."}

Risks:
${(report.risks || []).length
  ? (report.risks || []).map((item, i) => `${i + 1}. ${item.risk} | ${item.severity} | Owner: ${item.owner}`).join("\n")
  : "No risks were captured for this meeting."}

Stakeholder Concerns:
${(report.stakeholderConcerns || []).length
  ? (report.stakeholderConcerns || []).map((item, i) => `${i + 1}. ${item.stakeholder}: ${item.concern}`).join("\n")
  : "No stakeholder concerns were captured for this meeting."}

Additional Discussed Items:
${(report.additionalDiscussedItems || []).length
  ? (report.additionalDiscussedItems || []).map((item, i) => `${i + 1}. ${item.item}: ${item.notes}`).join("\n")
  : "No additional discussed items were captured for this meeting."}`;
}

export function subjectByType(emailType, meeting) {
  const base = `${meeting.title}`;
  if (emailType === "action_items") return `Action Items: ${base}`;
  if (emailType === "decisions") return `Decisions: ${base}`;
  if (emailType === "risks_and_concerns") return `Risks & Concerns: ${base}`;
  if (emailType === "follow_up_email") return `Follow-up: ${base}`;
  return `MoM: ${base}`;
}

function friendlyEmailError(status, upstreamText) {
  const textBody = String(upstreamText || "").toLowerCase();
  if (status === 403 && textBody.includes("domain") && textBody.includes("not verified")) {
    return "Email send failed. Sender domain is not verified in Resend. Verify the domain and try again.";
  }
  if (status === 401 || status === 403) {
    return "Email send failed due to email provider authorization settings. Check API key and sender configuration.";
  }
  if (status === 429) {
    return "Email send rate limit reached. Please retry in a minute.";
  }
  if (status >= 500) {
    return "Email provider is temporarily unavailable. Please retry shortly.";
  }
  return "Email send failed. Check recipient list and sender configuration, then retry.";
}

function friendlyGmailError(errorMessage) {
  const textBody = String(errorMessage || "").toLowerCase();
  if (textBody.includes("invalid login") || textBody.includes("badcredentials")) {
    return "Gmail authentication failed. Use GMAIL_USER and a valid Gmail App Password.";
  }
  if (textBody.includes("application-specific password required")) {
    return "Gmail requires an App Password. Enable 2-Step Verification and create an App Password for mail.";
  }
  if (textBody.includes("daily user sending quota exceeded")) {
    return "Gmail daily sending quota exceeded. Retry later or use another sender account.";
  }
  if (textBody.includes("from") && textBody.includes("not authorized")) {
    return "The configured EMAIL_FROM is not authorized for this Gmail account. Use your Gmail address or an allowed alias.";
  }
  return "Email send failed via Gmail. Verify Gmail credentials and sender address.";
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      text(res, 405, "Method not allowed");
      return;
    }

    const provider = String(process.env.EMAIL_PROVIDER || "").toLowerCase();
    const resendApiKey = String(process.env.RESEND_API_KEY || "");
    const gmailUser = String(process.env.GMAIL_USER || "");
    const gmailAppPassword = String(process.env.GMAIL_APP_PASSWORD || "");
    const fromEmail = String(process.env.EMAIL_FROM || gmailUser || "");

    const useGmail = provider === "gmail" || (!provider && gmailUser && gmailAppPassword);
    const useResend = provider === "resend" || (!useGmail && !provider && Boolean(resendApiKey));

    if (!fromEmail || (!useGmail && !useResend)) {
      text(
        res,
        500,
        "Email provider not configured. For Gmail set EMAIL_PROVIDER=gmail, GMAIL_USER, GMAIL_APP_PASSWORD, EMAIL_FROM. For Resend set EMAIL_PROVIDER=resend, RESEND_API_KEY, EMAIL_FROM."
      );
      return;
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
    const meeting = body?.meeting || null;
    const recipients = normalizeRecipients(body?.to);
    const emailType = String(body?.emailType || "full_mom");

    if (!meeting || !meeting.title || !meeting.reportJson) {
      text(res, 400, "Meeting payload is required.");
      return;
    }

    if (!recipients.length) {
      text(res, 400, "At least one recipient is required.");
      return;
    }

    if (!ALLOWED_EMAIL_TYPES.has(emailType)) {
      text(res, 400, "Invalid email type.");
      return;
    }

    const subject = subjectByType(emailType, meeting);
    const html = buildHtmlByType(meeting, emailType);
    const textBody = buildTextByType(meeting, emailType);

    if (useGmail) {
      if (!gmailUser || !gmailAppPassword) {
        text(res, 500, "Gmail not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD.");
        return;
      }

      const transport = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: gmailUser,
          pass: gmailAppPassword
        }
      });

      try {
        const info = await transport.sendMail({
          from: fromEmail,
          to: recipients.join(", "),
          subject,
          html,
          text: textBody,
          replyTo: process.env.EMAIL_REPLY_TO || undefined
        });
        json(res, 200, { status: "sent", provider: "gmail", id: info?.messageId || "" });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown Gmail send failure.";
        text(res, 502, friendlyGmailError(message));
      }
      return;
    }

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
      text(res, 502, friendlyEmailError(response.status, errorText));
      return;
    }

    const payload = await response.json();
    json(res, 200, { status: "sent", provider: "resend", id: payload?.id || "" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    text(res, 500, `Backend error: ${message}`);
  }
}
