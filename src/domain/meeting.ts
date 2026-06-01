export type SourceType =
  | "transcript_paste"
  | "transcript_file"
  | "recording_file"
  | "recording_link"
  | "manual_fallback_after_link";

export type MomTemplate =
  | "standard_mom"
  | "executive_summary"
  | "project_status"
  | "client_review"
  | "risk_action_tracker"
  | "technical_discussion";

export type LinkDetectedPlatform = "webex" | "zoom" | "microsoft_teams" | "google_meet" | "other";
export type LinkImportStatus = "not_attempted" | "completed" | "manual_upload_required" | "failed";
export type LinkImportReasonCode =
  | "oauth_or_scope_missing"
  | "policy_blocked_download"
  | "artifact_not_available"
  | "transcript_not_available"
  | "recording_not_available"
  | "provider_unsupported"
  | "sso_or_login_required"
  | "interactive_passcode_or_session_required"
  | "captcha_or_bot_protection"
  | "download_disabled_or_drm_protected"
  | "tenant_or_policy_restricted"
  | "unsupported_provider"
  | "malformed_link"
  | "no_transcript_available"
  | "network_or_provider_error"
  | "unknown_manual_fallback";

export interface LinkImportDiagnostics {
  detectedPlatform: LinkDetectedPlatform;
  adapter: string;
  providerName?: string;
  attemptedAt: string;
  completedAt?: string;
  httpStatus?: number;
  responseContentType?: string;
  resolvedUrlHost?: string;
  summary?: string;
  message?: string;
}

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
  momTemplate: MomTemplate;
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
  detectedPlatform?: LinkDetectedPlatform;
  linkImportStatus?: LinkImportStatus;
  linkImportReasonCode?: LinkImportReasonCode;
  linkImportAttemptedAt?: string;
  linkImportCompletedAt?: string;
  linkImportDiagnostics?: LinkImportDiagnostics;
  finalIntakeMethod?: SourceType;
  rawTranscript: string;
  usageMetrics?: UsageMetrics;
  reportJson: MeetingReport;
  createdAt: string;
  updatedAt: string;
}
