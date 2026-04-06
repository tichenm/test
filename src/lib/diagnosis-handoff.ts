import { getInterviewRailLabel, getDiagnosisReviewStatusLabel } from "@/lib/interview-presenters";

type HandoffDiagnosisRecord = {
  painType: string;
  severity: string;
  frequency: string;
  timeWindow: string;
  affectedScope: string;
  peopleInvolved: string;
  currentWorkaround: string;
  operationalImpact: string;
  likelyRootCause: string;
  nextAction: string;
  aiSummary: string;
  reviewStatus: string;
  ownerName?: string | null;
  reviewNote?: string | null;
};

type HandoffInterview = {
  railKey: string;
  storeName: string | null;
  roleName: string | null;
  startedAt: Date;
  diagnosisRecord: HandoffDiagnosisRecord;
};

function formatTimestamp(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function formatText(value: string | null | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function buildDiagnosisHandoffBrief(interview: HandoffInterview) {
  const diagnosis = interview.diagnosisRecord;

  return [
    "Guided Pain Discovery Handoff",
    "",
    `Workflow: ${getInterviewRailLabel(interview.railKey)}`,
    `Site: ${formatText(interview.storeName, "Not specified")}`,
    `Role: ${formatText(interview.roleName, "Not specified")}`,
    `Logged: ${formatTimestamp(interview.startedAt)}`,
    "",
    `Pain type: ${diagnosis.painType}`,
    `Severity: ${diagnosis.severity}`,
    `Review status: ${getDiagnosisReviewStatusLabel(diagnosis.reviewStatus)}`,
    `Owner: ${formatText(diagnosis.ownerName, "Unassigned")}`,
    "",
    `Likely root cause: ${diagnosis.likelyRootCause}`,
    `Frequency: ${diagnosis.frequency}`,
    `Time window: ${diagnosis.timeWindow}`,
    `Affected scope: ${diagnosis.affectedScope}`,
    `People involved: ${diagnosis.peopleInvolved}`,
    `Current workaround: ${diagnosis.currentWorkaround}`,
    `Operational impact: ${diagnosis.operationalImpact}`,
    `Next action: ${diagnosis.nextAction}`,
    `Review note: ${formatText(diagnosis.reviewNote, "No follow-up note yet.")}`,
    "",
    `Summary: ${diagnosis.aiSummary}`,
  ].join("\n");
}

export function buildDiagnosisHandoffFilename(params: {
  railKey: string;
  storeName: string | null;
  diagnosisRecord: {
    painType: string;
  };
}) {
  const parts = [
    params.storeName ? slugify(params.storeName) : null,
    slugify(params.railKey),
    slugify(params.diagnosisRecord.painType),
    "handoff",
  ].filter(Boolean);

  return `${parts.join("-")}.txt`;
}

export type { HandoffInterview };
