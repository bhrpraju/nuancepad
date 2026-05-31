import type { MeetingDocument } from "../domain/meeting";

interface SendMeetingEmailPayload {
  to: string;
  meeting: Pick<MeetingDocument, "title" | "meetingDate" | "clientProject" | "platform" | "reportJson">;
}

export const emailService = {
  async sendMeetingEmail(payload: SendMeetingEmailPayload): Promise<void> {
    const response = await fetch("/api/send-meeting-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Failed to send email.");
    }
  }
};
