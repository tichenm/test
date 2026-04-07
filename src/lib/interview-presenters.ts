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

  return `${getInterviewRailLabel(params.railKey)} review in progress`;
}

export function getEmptyHistoryCopy() {
  return "Start one guided review to turn a fuzzy issue into a clear problem statement.";
}

export function getDiagnosisReviewStatusLabel(status: string) {
  switch (status) {
    case "reviewing":
      return "Reviewing";
    case "accepted":
      return "Accepted";
    case "resolved":
      return "Resolved";
    case "new":
    default:
      return "New";
  }
}
