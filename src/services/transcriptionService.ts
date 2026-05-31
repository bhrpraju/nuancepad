const MAX_RECORDING_SIZE_BYTES = 25 * 1024 * 1024;
export const SUPPORTED_RECORDING_EXTENSIONS = ["mp3", "wav", "m4a", "mp4", "webm"] as const;

export interface TranscriptionResult {
  transcript: string;
  usage: {
    promptTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export const isSupportedRecordingFileName = (name: string): boolean => {
  const lower = name.toLowerCase();
  return SUPPORTED_RECORDING_EXTENSIONS.some((ext) => lower.endsWith(`.${ext}`));
};

const inferMimeType = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".m4a")) return "audio/mp4";
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".webm")) return "video/webm";
  return "application/octet-stream";
};

export const validateRecordingFile = (file: File): string => {
  if (!isSupportedRecordingFileName(file.name)) {
    throw new Error("Unsupported recording format. Use mp3, wav, m4a, mp4, or webm.");
  }

  if (file.size > MAX_RECORDING_SIZE_BYTES) {
    throw new Error("Recording is too large for direct processing. Upload a smaller file.");
  }

  return file.type || inferMimeType(file.name);
};

const toBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    const slice = bytes.subarray(index, index + chunk);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
};

export const transcriptionService = {
  async transcribeRecording(file: File): Promise<TranscriptionResult> {
    const mimeType = validateRecordingFile(file);
    const response = await fetch("/api/transcribe-recording", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fileName: file.name,
        mimeType,
        data: toBase64(await file.arrayBuffer())
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Failed to transcribe recording.");
    }

    const body = (await response.json()) as { transcript?: string; usage?: Record<string, unknown> };
    const text = body?.transcript;

    if (!text || !text.trim()) {
      throw new Error("Transcription provider returned empty transcript.");
    }

    return {
      transcript: text.trim(),
      usage: {
        promptTokens: Number(body?.usage?.promptTokens || 0),
        outputTokens: Number(body?.usage?.outputTokens || 0),
        totalTokens: Number(body?.usage?.totalTokens || 0)
      }
    };
  }
};
