const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function text(res, status, message) {
  res.status(status).setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end(message);
}

function stripCodeFences(value) {
  return String(value || "")
    .replace(/^```json\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function buildPrompt(transcript, metadata) {
  return `
You are NuancePad AI.
Return valid JSON only matching this contract:
{
  "title": "",
  "attendees": [],
  "executiveSummary": "",
  "keyDiscussionPoints": [{"topic":"","summary":""}],
  "decisions": [{"decision":"","owner":"Unassigned","impact":"","effectiveDate":"Not specified"}],
  "actionItems": [{"task":"","owner":"Unassigned","dueDate":"Not specified","priority":"","status":"Open"}],
  "risks": [{"risk":"","severity":"Medium","owner":"Unassigned","mitigation":"","targetDate":"Not specified"}],
  "openQuestions": [],
  "stakeholderConcerns": [{"stakeholder":"","concern":"","requiredResponse":"","owner":"Unassigned","dueDate":"Not specified"}],
  "additionalDiscussedItems": [{"item":"","notes":"","followUpNeeded":"No"}],
  "followUpEmail": "",
  "tags": []
}
Rules:
- Do not invent facts, names, or due dates.
- If unclear, keep attendees empty and defaults for owners/dates.
- executiveSummary must be concise (3-5 lines).
- If transcript incomplete, mention that in executiveSummary.

Metadata:
${JSON.stringify(metadata, null, 2)}

Transcript:
${transcript}
`;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      text(res, 405, "Method not allowed");
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      text(res, 500, "AI provider not configured.");
      return;
    }

    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body ?? {};
    const transcript = body?.transcript;
    const metadata = body?.metadata;

    if (!transcript || !String(transcript).trim()) {
      text(res, 400, "Transcript is required.");
      return;
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: buildPrompt(transcript, metadata) }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
        })
      }
    );

    if (!response.ok) {
      const upstream = await response.text();
      text(res, 502, `Failed to generate meeting report. Upstream: ${upstream.slice(0, 400)}`);
      return;
    }

    const payload = await response.json();
    const textResult = payload?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResult) {
      text(res, 502, "AI provider returned empty content.");
      return;
    }

    try {
      json(res, 200, JSON.parse(stripCodeFences(textResult)));
    } catch {
      text(res, 502, "AI provider returned invalid JSON.");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    text(res, 500, `Backend error: ${message}`);
  }
}
