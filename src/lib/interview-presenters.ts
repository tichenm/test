import {
  DEFAULT_RAIL_KEY,
  getDiagnosticRail,
  isRailKey,
  type RailKey,
} from "@/lib/diagnostic-engine";
import { getDiagnosisPainTypeLabel as getDiagnosisPainTypeLabelFromTaxonomy } from "@/lib/pain-types";

type InterviewTitleParams = {
  railKey: string;
  diagnosisRecord: {
    painType: string;
  } | null;
};

function normalizeRailKey(railKey: string): RailKey {
  return isRailKey(railKey) ? railKey : DEFAULT_RAIL_KEY;
}

export function getInterviewRailLabel(railKey: string) {
  return getDiagnosticRail(normalizeRailKey(railKey)).label;
}

export function getDiagnosisPainTypeLabel(painType: string) {
  return getDiagnosisPainTypeLabelFromTaxonomy(painType);
}

export function getInterviewCardTitle(params: InterviewTitleParams) {
  if (params.diagnosisRecord?.painType) {
    return getDiagnosisPainTypeLabel(params.diagnosisRecord.painType);
  }

  return `${getInterviewRailLabel(params.railKey)}诊断进行中`;
}

export function getEmptyHistoryCopy() {
  return "先开始一次引导式诊断，把模糊问题收敛成清晰的问题定义。";
}

export function getDiagnosisReviewStatusLabel(status: string) {
  switch (status) {
    case "reviewing":
      return "跟进中";
    case "accepted":
      return "已采纳";
    case "resolved":
      return "已解决";
    case "new":
    default:
      return "待跟进";
  }
}

export function getDiagnosisSeverityLabel(severity: string) {
  switch (severity) {
    case "high":
      return "高";
    case "medium":
    default:
      return "中";
  }
}
