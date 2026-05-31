import type { MeetingDocument } from "../domain/meeting";

export type MeetingEmailType =
  | "full_mom"
  | "action_items"
  | "decisions"
  | "risks_and_concerns"
  | "follow_up_email";

interface SendMeetingEmailPayload {
  to: string;
  emailType: MeetingEmailType;
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
