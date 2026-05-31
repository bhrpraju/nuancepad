import type {
  ActionItem,
  AdditionalDiscussedItem,
  Decision,
  MeetingReport,
  RiskItem,
  StakeholderConcern
} from "../domain/meeting";

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U> ? Array<DeepPartial<U>> : T[K] extends object ? DeepPartial<T[K]> : T[K];
};

const defaultDecision = (): Decision => ({
  decision: "",
  owner: "Unassigned",
  impact: "",
  effectiveDate: "Not specified"
});

const defaultActionItem = (): ActionItem => ({
  task: "",
  owner: "Unassigned",
  dueDate: "Not specified",
  priority: "",
  status: "Open"
});

const defaultRiskItem = (): RiskItem => ({
  risk: "",
  severity: "Medium",
  owner: "Unassigned",
  mitigation: "",
  targetDate: "Not specified"
});

const defaultStakeholderConcern = (): StakeholderConcern => ({
  stakeholder: "",
  concern: "",
  requiredResponse: "",
  owner: "Unassigned",
  dueDate: "Not specified"
});

const defaultAdditionalItem = (): AdditionalDiscussedItem => ({
  item: "",
  notes: "",
  followUpNeeded: "No"
});

export const defaultMeetingReport = (): MeetingReport => ({
  title: "",
  attendees: [],
  executiveSummary: "",
  keyDiscussionPoints: [{ topic: "", summary: "" }],
  decisions: [defaultDecision()],
  actionItems: [defaultActionItem()],
  risks: [defaultRiskItem()],
  openQuestions: [],
  stakeholderConcerns: [defaultStakeholderConcern()],
  additionalDiscussedItems: [defaultAdditionalItem()],
  followUpEmail: "",
  tags: []
});

const safeOwner = (owner?: string) => (owner && owner.trim() ? owner : "Unassigned");
const safeDate = (date?: string) => (date && date.trim() ? date : "Not specified");

export const normalizeMeetingReport = (input: DeepPartial<MeetingReport>): MeetingReport => {
  const defaults = defaultMeetingReport();

  return {
    ...defaults,
    ...input,
    attendees: input.attendees ?? defaults.attendees,
    keyDiscussionPoints:
      input.keyDiscussionPoints?.map((item) => ({
        topic: item.topic ?? "",
        summary: item.summary ?? ""
      })) ?? defaults.keyDiscussionPoints,
    decisions:
      input.decisions?.map((item) => ({
        ...defaultDecision(),
        ...item,
        owner: safeOwner(item.owner),
        effectiveDate: safeDate(item.effectiveDate)
      })) ?? defaults.decisions,
    actionItems:
      input.actionItems?.map((item) => ({
        ...defaultActionItem(),
        ...item,
        owner: safeOwner(item.owner),
        dueDate: safeDate(item.dueDate)
      })) ?? defaults.actionItems,
    risks:
      input.risks?.map((item) => ({
        ...defaultRiskItem(),
        ...item,
        owner: safeOwner(item.owner),
        targetDate: safeDate(item.targetDate)
      })) ?? defaults.risks,
    stakeholderConcerns:
      input.stakeholderConcerns?.map((item) => ({
        ...defaultStakeholderConcern(),
        ...item,
        owner: safeOwner(item.owner),
        dueDate: safeDate(item.dueDate)
      })) ?? defaults.stakeholderConcerns,
    additionalDiscussedItems:
      input.additionalDiscussedItems?.map((item) => ({
        item: item.item ?? "",
        notes: item.notes ?? "",
        followUpNeeded: item.followUpNeeded ?? "No"
      })) ?? defaults.additionalDiscussedItems
  };
};
