const AI_PROVIDER_ORDER = process.env.AI_PROVIDER_ORDER || "deepseek,openai";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";
const DEEPSEEK_FALLBACK_MODEL = process.env.DEEPSEEK_FALLBACK_MODEL || "deepseek-v4-pro";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const OPENAI_FALLBACK_MODEL = process.env.OPENAI_FALLBACK_MODEL || "gpt-4.1-mini";
const MAX_RETRIES = 2;
const RETRYABLE_STATUS = new Set([408, 409, 429, 500, 502, 503, 504]);

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

function parseProviderOrder() {
  return AI_PROVIDER_ORDER.split(",")
    .map((provider) => provider.trim().toLowerCase())
    .filter((provider, index, providers) => provider && providers.indexOf(provider) === index);
}

function tokenEstimate(value) {
  return Math.max(1, Math.ceil(String(value || "").length / 4));
}

function normalizeOpenAICompatibleUsage(usage, prompt, output) {
  const promptTokens = Number(usage?.prompt_tokens || tokenEstimate(prompt));
  const outputTokens = Number(usage?.completion_tokens || tokenEstimate(output));
  const totalTokens = Number(usage?.total_tokens || promptTokens + outputTokens);
  return { promptTokens, outputTokens, totalTokens };
}

function buildTemplateGuidance(template) {
  switch (template) {
    case "executive_summary":
      return "Template focus: executive leadership brevity. Prioritize concise summary, major decisions, top risks, and critical actions.";
    case "project_status":
      return "Template focus: project status tracking. Emphasize milestones, progress, blockers, dependencies, and near-term delivery dates.";
    case "client_review":
      return "Template focus: client review readiness. Emphasize client asks, commitments, approvals, escalations, and stakeholder concerns.";
    case "risk_action_tracker":
      return "Template focus: risks and actions. Emphasize risks, owners, mitigation plans, and actionable next steps.";
    case "technical_discussion":
      return "Template focus: technical discussion. Emphasize architecture, implementation choices, defects, decisions, and technical follow-ups.";
    case "standard_mom":
    default:
      return "Template focus: balanced standard meeting minutes.";
  }
}

function buildPrompt(transcript, metadata) {
  const template = String(metadata?.momTemplate || "standard_mom");
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
- Keep JSON schema unchanged. Adjust emphasis only.
${buildTemplateGuidance(template)}

Metadata:
${JSON.stringify(metadata, null, 2)}

Transcript:
${transcript}
`;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function classifyFailure({ provider, model, status, body, message }) {
  const raw = `${body || ""} ${message || ""}`.toLowerCase();
  let reason = "provider error";

  if (status === 401 || status === 403 || raw.includes("api key")) {
    reason = "missing or invalid provider key";
  } else if (status === 402 || raw.includes("quota") || raw.includes("resource_exhausted") || raw.includes("insufficient")) {
    reason = "quota exhausted";
  } else if (status === 429 || raw.includes("rate limit") || raw.includes("too many requests")) {
    reason = "rate limited";
  } else if (raw.includes("invalid json")) {
    reason = "invalid JSON";
  } else if (status === 0) {
    reason = "network error";
  }

  return {
    provider,
    model,
    status: status || "unknown",
    reason,
    detail: String(body || message || "").slice(0, 500)
  };
}

async function fetchWithRetry(url, options) {
  let lastResponse = null;
  let lastBody = "";

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return { ok: true, payload: await response.json() };
      }

      lastResponse = response;
      lastBody = await response.text();

      if (!RETRYABLE_STATUS.has(response.status) || attempt === MAX_RETRIES) {
        break;
      }
    } catch (error) {
      lastResponse = { status: 0 };
      lastBody = error instanceof Error ? error.message : "Network error";

      if (attempt === MAX_RETRIES) {
        break;
      }
    }

    await sleep(300 * 2 ** (attempt - 1));
  }

  return {
    ok: false,
    status: lastResponse?.status || 0,
    body: lastBody
  };
}

async function callDeepSeek({ model, apiKey, prompt }) {
  const result = await fetchWithRetry("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" }
    })
  });

  if (!result.ok) {
    return { ok: false, ...classifyFailure({ provider: "deepseek", model, status: result.status, body: result.body }) };
  }

  const content = result.payload?.choices?.[0]?.message?.content;
  if (!content) {
    return {
      ok: false,
      ...classifyFailure({ provider: "deepseek", model, status: 502, message: "Provider returned empty content." })
    };
  }

  return {
    ok: true,
    provider: "deepseek",
    model,
    content,
    usage: normalizeOpenAICompatibleUsage(result.payload?.usage, prompt, content)
  };
}

async function callOpenAI({ model, apiKey, prompt }) {
  const result = await fetchWithRetry("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" }
    })
  });

  if (!result.ok) {
    return { ok: false, ...classifyFailure({ provider: "openai", model, status: result.status, body: result.body }) };
  }

  const content = result.payload?.choices?.[0]?.message?.content;
  if (!content) {
    return {
      ok: false,
      ...classifyFailure({ provider: "openai", model, status: 502, message: "Provider returned empty content." })
    };
  }

  return {
    ok: true,
    provider: "openai",
    model,
    content,
    usage: normalizeOpenAICompatibleUsage(result.payload?.usage, prompt, content)
  };
}

function providerAttempts(provider) {
  if (provider === "deepseek") {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const models = [DEEPSEEK_MODEL, DEEPSEEK_FALLBACK_MODEL].filter(Boolean);
    return { apiKey, missingKey: "DEEPSEEK_API_KEY", models, caller: callDeepSeek };
  }

  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    const models = [OPENAI_MODEL, OPENAI_FALLBACK_MODEL].filter(Boolean);
    return { apiKey, missingKey: "OPENAI_API_KEY", models, caller: callOpenAI };
  }

  return null;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      text(res, 405, "Method not allowed");
      return;
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
    const transcript = body?.transcript;
    const metadata = body?.metadata;

    if (!transcript || !String(transcript).trim()) {
      text(res, 400, "Transcript is required.");
      return;
    }

    const prompt = buildPrompt(transcript, metadata);
    const failures = [];
    const skipped = [];
    const providers = parseProviderOrder();

    for (const provider of providers) {
      const config = providerAttempts(provider);
      if (!config) {
        failures.push({
          provider,
          model: "",
          status: "skipped",
          reason: "unsupported provider",
          detail: `Unsupported AI provider '${provider}' in AI_PROVIDER_ORDER.`
        });
        continue;
      }

      if (!config.apiKey) {
        skipped.push(`${provider} (${config.missingKey})`);
        failures.push({
          provider,
          model: config.models[0] || "",
          status: "skipped",
          reason: "missing provider key",
          detail: `${config.missingKey} is not configured.`
        });
        continue;
      }

      for (const model of config.models) {
        const attempt = await config.caller({ model, apiKey: config.apiKey, prompt });

        if (!attempt.ok) {
          failures.push(attempt);
          continue;
        }

        try {
          json(res, 200, {
            report: JSON.parse(stripCodeFences(attempt.content)),
            usage: {
              provider: attempt.provider,
              model: attempt.model,
              ...attempt.usage
            }
          });
          return;
        } catch {
          failures.push({
            provider: attempt.provider,
            model: attempt.model,
            status: "invalid_json",
            reason: "invalid JSON",
            detail: "AI provider returned content that was not valid JSON."
          });
        }
      }
    }

    if (failures.length === skipped.length && skipped.length > 0) {
      text(res, 500, `AI provider not configured. Missing provider key(s): ${skipped.join(", ")}.`);
      return;
    }

    const lastFailure = failures[failures.length - 1];
    const summary = failures
      .map((failure) => `${failure.provider}${failure.model ? `/${failure.model}` : ""}: ${failure.reason}`)
      .join("; ");

    text(
      res,
      502,
      `All configured AI providers failed. Check DeepSeek/OpenAI API keys, credits, or model configuration. Last failure: ${lastFailure?.reason || "unknown"}. Attempts: ${summary || "none"}.`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    text(res, 500, `Backend error: ${message}`);
  }
}
