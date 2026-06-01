import type {
  LinkDetectedPlatform,
  LinkImportDiagnostics,
  LinkImportReasonCode,
  LinkImportStatus
} from "../domain/meeting";
import { detectPlatformFromLink } from "../utils/linkIntake";

export type LinkImportResponse =
  | {
      status: "completed";
      transcript: string;
      source: string;
      detectedPlatform: LinkDetectedPlatform;
      diagnostics: LinkImportDiagnostics;
    }
  | {
      status: "manual_upload_required";
      reasonCode: LinkImportReasonCode;
      message: string;
      detectedPlatform: LinkDetectedPlatform;
      diagnostics: LinkImportDiagnostics;
    }
  | {
      status: "failed";
      reasonCode: LinkImportReasonCode;
      message: string;
      detectedPlatform: LinkDetectedPlatform;
      diagnostics: LinkImportDiagnostics;
    };

export interface LinkImportPayload {
  platform: string;
  recordingUrl: string;
  passcode?: string;
}

export interface LinkAttemptSnapshot {
  status: LinkImportStatus;
  detectedPlatform: LinkDetectedPlatform;
  reasonCode?: LinkImportReasonCode;
  attemptedAt: string;
  completedAt?: string;
  diagnostics?: LinkImportDiagnostics;
}

export const linkImportService = {
  async importAuthorizedLink(payload: LinkImportPayload): Promise<LinkImportResponse> {
    const detected = detectPlatformFromLink(payload.recordingUrl);
    const response = await fetch("/api/import-recording-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        status: "failed",
        reasonCode: "network_or_provider_error",
        message: text || "Failed to import recording link.",
        detectedPlatform: detected,
        diagnostics: {
          detectedPlatform: detected,
          adapter: `${detected}_adapter`,
          attemptedAt: new Date().toISOString(),
          message: text || "HTTP error while calling /api/import-recording-link"
        }
      };
    }

    const body = (await response.json()) as LinkImportResponse;

    if (body.status === "completed") {
      const transcript = body.transcript?.trim();
      if (!transcript) {
        return {
          status: "failed",
          reasonCode: "no_transcript_available",
          message: "Imported link did not return a transcript.",
          detectedPlatform: body.detectedPlatform,
          diagnostics: body.diagnostics
        };
      }
      return { ...body, transcript };
    }

    return body;
  }
};
