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
    const data = body?.data;
    const mimeType = body?.mimeType;

    if (!data || !mimeType) {
      text(res, 400, "Recording payload is required.");
      return;
    }

    const requestBody = JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: "Transcribe this meeting recording. Return plain transcript text only. Do not summarize." },
            { inlineData: { mimeType, data } }
          ]
        }
      ],
      generationConfig: { temperature: 0 }
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
        `Failed to transcribe recording. Model tried: ${lastFailure?.model || DEFAULT_MODEL}. Status: ${lastFailure?.status || "unknown"}. Upstream: ${upstream}`
      );
      return;
    }

    const transcript = winner.payload?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!transcript || !String(transcript).trim()) {
      text(res, 502, `Transcription provider returned empty transcript (model: ${winner.model}).`);
      return;
    }

    json(res, 200, { transcript: String(transcript).trim() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    text(res, 500, `Backend error: ${message}`);
  }
}
