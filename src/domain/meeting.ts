export type SourceType = "transcript_paste" | "transcript_file" | "recording_file" | "recording_link";

export interface DiscussionPoint {
  topic: string;
  summary: string;
}

export interface Decision {
  decision: string;
  owner: string;
  impact: string;
  effectiveDate: string;
}

export interface ActionItem {
  task: string;
  owner: string;
  dueDate: string;
  priority: string;
  status: "Open" | "In Progress" | "Closed";
}

export interface RiskItem {
  risk: string;
  severity: "Low" | "Medium" | "High";
  owner: string;
  mitigation: string;
  targetDate: string;
}

export interface StakeholderConcern {
  stakeholder: string;
  concern: string;
  requiredResponse: string;
  owner: string;
  dueDate: string;
}

export interface AdditionalDiscussedItem {
  item: string;
  notes: string;
  followUpNeeded: "Yes" | "No";
}

export interface MeetingReport {
  title: string;
  attendees: string[];
  executiveSummary: string;
  keyDiscussionPoints: DiscussionPoint[];
  decisions: Decision[];
  actionItems: ActionItem[];
  risks: RiskItem[];
  openQuestions: string[];
  stakeholderConcerns: StakeholderConcern[];
  additionalDiscussedItems: AdditionalDiscussedItem[];
  followUpEmail: string;
  tags: string[];
}

export interface MeetingMetadata {
  title: string;
  clientProject: string;
  meetingDate: string;
  meetingType: string;
  platform: string;
  sharedBy: string;
  sourceType: SourceType;
}

export interface UsageMetrics {
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
  transcriptWordCount: number;
}

export type ImportStatus =
  | "draft"
  | "queued"
  | "processing"
  | "needs_user_action"
  | "completed"
  | "failed";

export interface MeetingDocument extends MeetingMetadata {
  id: string;
  recordingUrl?: string;
  importStatus: ImportStatus;
  manualFallbackReason?: string;
  rawTranscript: string;
  usageMetrics?: UsageMetrics;
  reportJson: MeetingReport;
  createdAt: string;
  updatedAt: string;
}
