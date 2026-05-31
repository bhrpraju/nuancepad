const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function text(res, status, message) {
  res.status(status).setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end(message);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    text(res, 405, "Method not allowed");
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    text(res, 500, "AI provider not configured.");
    return;
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const data = body?.data;
  const mimeType = body?.mimeType;

  if (!data || !mimeType) {
    text(res, 400, "Recording payload is required.");
    return;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
      })
    }
  );

  if (!response.ok) {
    text(res, 502, "Failed to transcribe recording.");
    return;
  }

  const payload = await response.json();
  const transcript = payload?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!transcript || !String(transcript).trim()) {
    text(res, 502, "Transcription provider returned empty transcript.");
    return;
  }

  json(res, 200, { transcript: String(transcript).trim() });
}
