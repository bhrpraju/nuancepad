export type LinkImportResponse =
  | { status: "success"; transcript: string; source: string }
  | { status: "manual_upload_required"; reason: string; details: string };

export interface LinkImportPayload {
  platform: string;
  recordingUrl: string;
  passcode?: string;
}

export const linkImportService = {
  async importAuthorizedLink(payload: LinkImportPayload): Promise<LinkImportResponse> {
    const response = await fetch("/api/import-recording-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Failed to import recording link.");
    }

    const body = (await response.json()) as LinkImportResponse;

    if (body.status === "success") {
      const transcript = body.transcript?.trim();
      if (!transcript) {
        throw new Error("Imported link did not return a transcript.");
      }
      return { ...body, transcript };
    }

    return body;
  }
};
