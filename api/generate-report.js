const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "";
const MAX_RETRIES = 3;
const RETRYABLE_STATUS = new Set([429, 500, 503, 504]);

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

function normalizeUsage(usage) {
  const promptTokens = Number(usage?.promptTokenCount || 0);
  const outputTokens = Number(usage?.candidatesTokenCount || 0);
  const totalTokens = Number(usage?.totalTokenCount || promptTokens + outputTokens);
  return { promptTokens, outputTokens, totalTokens };
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function callGeminiWithRetry({ model, apiKey, body }) {
  let lastStatus = 0;
  let lastBody = "";

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body
      }
    );

    if (response.ok) {
      return { ok: true, model, payload: await response.json() };
    }

    lastStatus = response.status;
    lastBody = await response.text();

    if (!RETRYABLE_STATUS.has(response.status) || attempt === MAX_RETRIES) {
      break;
    }

    await sleep(500 * 2 ** (attempt - 1));
  }

  return { ok: false, model, status: lastStatus, body: lastBody };
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

    const requestBody = JSON.stringify({
      contents: [{ role: "user", parts: [{ text: buildPrompt(transcript, metadata) }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
    });

    const modelsToTry = [DEFAULT_MODEL, FALLBACK_MODEL].filter(Boolean);
    let winner = null;
    let lastFailure = null;

    for (const model of modelsToTry) {
      const result = await callGeminiWithRetry({ model, apiKey, body: requestBody });
      if (result.ok) {
        winner = result;
        break;
      }
      lastFailure = result;
    }

    if (!winner) {
      const upstream = lastFailure?.body ? String(lastFailure.body).slice(0, 500) : "Unknown upstream failure.";
      text(
        res,
        502,
        `Failed to generate meeting report. Model tried: ${lastFailure?.model || DEFAULT_MODEL}. Status: ${lastFailure?.status || "unknown"}. Upstream: ${upstream}`
      );
      return;
    }

    const textResult = winner.payload?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResult) {
      text(res, 502, `AI provider returned empty content (model: ${winner.model}).`);
      return;
    }

    try {
      json(res, 200, {
        report: JSON.parse(stripCodeFences(textResult)),
        usage: normalizeUsage(winner.payload?.usageMetadata)
      });
    } catch {
      text(res, 502, "AI provider returned invalid JSON.");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    text(res, 500, `Backend error: ${message}`);
  }
}
