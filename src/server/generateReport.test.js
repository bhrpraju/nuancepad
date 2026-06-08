import { afterEach, describe, expect, it, vi } from "vitest";

const validReport = {
  title: "Weekly Review",
  attendees: [],
  executiveSummary: "Summary",
  keyDiscussionPoints: [],
  decisions: [],
  actionItems: [],
  risks: [],
  openQuestions: [],
  stakeholderConcerns: [],
  additionalDiscussedItems: [],
  followUpEmail: "",
  tags: []
};

const buildRes = () => {
  const response = {
    statusCode: 200,
    headers: {},
    body: "",
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(key, value) {
      this.headers[key] = value;
      return this;
    },
    end(payload) {
      this.body = payload;
      return this;
    }
  };
  return response;
};

const runGenerateReport = async (env = {}) => {
  vi.resetModules();
  for (const key of [
    "AI_PROVIDER_ORDER",
    "DEEPSEEK_API_KEY",
    "DEEPSEEK_MODEL",
    "DEEPSEEK_FALLBACK_MODEL",
    "OPENAI_API_KEY",
    "OPENAI_MODEL",
    "OPENAI_FALLBACK_MODEL",
    "GEMINI_API_KEY",
    "GEMINI_MODEL",
    "GEMINI_FALLBACK_MODEL"
  ]) {
    if (Object.prototype.hasOwnProperty.call(env, key)) {
      process.env[key] = env[key];
    } else {
      delete process.env[key];
    }
  }

  const { default: handler } = await import("../../api/generate-report.js");
  const req = {
    method: "POST",
    body: {
      transcript: "Team discussed project status.",
      metadata: { title: "Weekly Review", momTemplate: "standard_mom" }
    }
  };
  const res = buildRes();
  await handler(req, res);
  return res;
};

describe("generate-report AI provider router", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.AI_PROVIDER_ORDER;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.DEEPSEEK_MODEL;
    delete process.env.DEEPSEEK_FALLBACK_MODEL;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
    delete process.env.OPENAI_FALLBACK_MODEL;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
    delete process.env.GEMINI_FALLBACK_MODEL;
  });

  it("returns DeepSeek result with provider and model usage metadata", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(validReport) } }],
          usage: { prompt_tokens: 11, completion_tokens: 22, total_tokens: 33 }
        })
      })
    );

    const res = await runGenerateReport({
      AI_PROVIDER_ORDER: "deepseek,openai",
      DEEPSEEK_API_KEY: "deepseek-key",
      DEEPSEEK_MODEL: "deepseek-v4-flash",
      DEEPSEEK_FALLBACK_MODEL: "deepseek-v4-pro"
    });

    const payload = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(payload.report.title).toBe("Weekly Review");
    expect(payload.usage).toEqual({
      provider: "deepseek",
      model: "deepseek-v4-flash",
      promptTokens: 11,
      outputTokens: 22,
      totalTokens: 33
    });
  });

  it("skips DeepSeek when API key is missing and falls back to OpenAI", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(validReport) } }],
          usage: { prompt_tokens: 5, completion_tokens: 7, total_tokens: 12 }
        })
      })
    );

    const res = await runGenerateReport({
      AI_PROVIDER_ORDER: "deepseek,openai",
      OPENAI_API_KEY: "openai-key",
      OPENAI_MODEL: "gpt-4o-mini"
    });

    const payload = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(payload.usage.provider).toBe("openai");
    expect(payload.usage.model).toBe("gpt-4o-mini");
  });

  it("falls back to OpenAI when DeepSeek returns invalid JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: "not-json" } }],
            usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: "still-not-json" } }],
            usage: { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: JSON.stringify(validReport) } }],
            usage: { prompt_tokens: 8, completion_tokens: 9, total_tokens: 17 }
          })
        })
    );

    const res = await runGenerateReport({
      AI_PROVIDER_ORDER: "deepseek,openai",
      DEEPSEEK_API_KEY: "deepseek-key",
      DEEPSEEK_MODEL: "deepseek-v4-flash",
      DEEPSEEK_FALLBACK_MODEL: "deepseek-v4-pro",
      OPENAI_API_KEY: "openai-key",
      OPENAI_MODEL: "gpt-4o-mini"
    });

    const payload = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(payload.usage.provider).toBe("openai");
    expect(payload.usage.model).toBe("gpt-4o-mini");
  });

  it("falls back when DeepSeek quota or rate limit is exhausted", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: async () => "rate limit exceeded"
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: async () => "rate limit exceeded"
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: async () => "rate limit exceeded"
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: async () => "rate limit exceeded"
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: JSON.stringify(validReport) } }],
            usage: { prompt_tokens: 9, completion_tokens: 10, total_tokens: 19 }
          })
        })
    );

    const res = await runGenerateReport({
      AI_PROVIDER_ORDER: "deepseek,openai",
      DEEPSEEK_API_KEY: "deepseek-key",
      DEEPSEEK_MODEL: "deepseek-v4-flash",
      DEEPSEEK_FALLBACK_MODEL: "deepseek-v4-pro",
      OPENAI_API_KEY: "openai-key",
      OPENAI_MODEL: "gpt-4o-mini"
    });

    const payload = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(payload.usage.provider).toBe("openai");
  });

  it("keeps OpenAI-only path working", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(validReport) } }],
          usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 }
        })
      })
    );

    const res = await runGenerateReport({
      AI_PROVIDER_ORDER: "openai",
      OPENAI_API_KEY: "openai-key",
      OPENAI_MODEL: "gpt-4o-mini"
    });

    const payload = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(payload.usage.provider).toBe("openai");
    expect(payload.usage.model).toBe("gpt-4o-mini");
  });

  it("uses the OpenAI fallback model when the primary OpenAI model fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: async () => "rate limited"
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: async () => "rate limited"
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: JSON.stringify(validReport) } }],
            usage: { prompt_tokens: 4, completion_tokens: 5, total_tokens: 9 }
          })
        })
    );

    const res = await runGenerateReport({
      AI_PROVIDER_ORDER: "openai",
      OPENAI_API_KEY: "openai-key",
      OPENAI_MODEL: "gpt-4o-mini",
      OPENAI_FALLBACK_MODEL: "gpt-4.1-mini"
    });

    const payload = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(payload.usage.provider).toBe("openai");
    expect(payload.usage.model).toBe("gpt-4.1-mini");
  });

  it("ignores old Gemini MoM environment variables", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await runGenerateReport({
      AI_PROVIDER_ORDER: "deepseek,openai",
      GEMINI_API_KEY: "old-gemini-key",
      GEMINI_MODEL: "gemini-flash-latest",
      GEMINI_FALLBACK_MODEL: "gemini-2.0-flash"
    });

    expect(res.statusCode).toBe(500);
    expect(res.body).toMatch(/DEEPSEEK_API_KEY/);
    expect(res.body).toMatch(/OPENAI_API_KEY/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns friendly error when all providers fail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 402,
        text: async () => "quota exhausted"
      })
    );

    const res = await runGenerateReport({
      AI_PROVIDER_ORDER: "deepseek",
      DEEPSEEK_API_KEY: "deepseek-key",
      DEEPSEEK_MODEL: "deepseek-v4-flash",
      DEEPSEEK_FALLBACK_MODEL: ""
    });

    expect(res.statusCode).toBe(502);
    expect(res.body).toMatch(/All configured AI providers failed/i);
    expect(res.body).toMatch(/DeepSeek\/OpenAI API keys/i);
    expect(res.body).toMatch(/quota exhausted/i);
  });
});
