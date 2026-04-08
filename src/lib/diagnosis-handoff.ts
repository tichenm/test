import {
  getDiagnosisSeverityLabel,
  getInterviewRailLabel,
  getDiagnosisPainTypeLabel,
  getDiagnosisReviewStatusLabel,
} from "@/lib/interview-presenters";

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
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
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
    "引导式痛点诊断交接摘要",
    "",
    `诊断流程：${getInterviewRailLabel(interview.railKey)}`,
    `站点：${formatText(interview.storeName, "未填写")}`,
    `角色：${formatText(interview.roleName, "未填写")}`,
    `记录时间：${formatTimestamp(interview.startedAt)}`,
    "",
    `痛点类型：${getDiagnosisPainTypeLabel(diagnosis.painType)}`,
    `严重程度：${getDiagnosisSeverityLabel(diagnosis.severity)}`,
    `跟进状态：${getDiagnosisReviewStatusLabel(diagnosis.reviewStatus)}`,
    `负责人：${formatText(diagnosis.ownerName, "未指派")}`,
    "",
    `可能根因：${diagnosis.likelyRootCause}`,
    `出现频率：${diagnosis.frequency}`,
    `高发时段：${diagnosis.timeWindow}`,
    `影响范围：${diagnosis.affectedScope}`,
    `涉及人员：${diagnosis.peopleInvolved}`,
    `当前补救：${diagnosis.currentWorkaround}`,
    `业务影响：${diagnosis.operationalImpact}`,
    `建议动作：${diagnosis.nextAction}`,
    `跟进备注：${formatText(diagnosis.reviewNote, "还没有跟进备注。")}`,
    "",
    `总结：${diagnosis.aiSummary}`,
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
