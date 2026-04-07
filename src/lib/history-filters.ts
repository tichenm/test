import {
  isRailKey,
  type PainType,
  type RailKey,
  type Severity,
} from "@/lib/diagnostic-rails";

type ReviewStatus = "new" | "reviewing" | "accepted" | "resolved";
type HistoryStatusFilter = "all" | "active" | "completed";
type HistoryExactFilter<T extends string> = T | "all";

type HistoryFilterValue = string | string[] | undefined;

type HistoryFilterParams = Record<string, HistoryFilterValue>;

type HistoryFilters = {
  status: HistoryStatusFilter;
  railKey: HistoryExactFilter<RailKey>;
  reviewStatus: HistoryExactFilter<ReviewStatus>;
  painType: HistoryExactFilter<PainType>;
  severity: HistoryExactFilter<Severity>;
  storeName: string;
  roleName: string;
  query: string;
};

type HistoryDiagnosisRecord = {
  painType: string;
  severity?: string | null;
  reviewStatus: string;
  likelyRootCause?: string | null;
  nextAction?: string | null;
  ownerName?: string | null;
  reviewNote?: string | null;
  aiSummary?: string | null;
};

type HistoryInterviewSession = {
  id: string;
  railKey: string;
  storeName: string | null;
  roleName: string | null;
  status: "ACTIVE" | "COMPLETED" | "ABANDONED";
  diagnosisRecord: HistoryDiagnosisRecord | null;
};

const REVIEW_STATUSES = ["new", "reviewing", "accepted", "resolved"] as const;
const PAIN_TYPES = ["stockout", "overstock", "inventory-accuracy"] as const;
const SEVERITIES = ["medium", "high"] as const;

function getSingleValue(value: HistoryFilterValue) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function normalizeText(value: HistoryFilterValue) {
  return (getSingleValue(value) || "").trim();
}

function normalizeLowercase(value: string) {
  return value.trim().toLowerCase();
}

function isNonEmptyString(value: string | null): value is string {
  return Boolean(value);
}

export function parseHistoryFilters(params: HistoryFilterParams): HistoryFilters {
  const statusValue = normalizeLowercase(normalizeText(params.status));
  const railKeyValue = normalizeText(params.railKey);
  const reviewStatusValue = normalizeLowercase(normalizeText(params.reviewStatus));
  const painTypeValue = normalizeLowercase(normalizeText(params.painType));
  const severityValue = normalizeLowercase(normalizeText(params.severity));

  return {
    status:
      statusValue === "active" || statusValue === "completed" ? statusValue : "all",
    railKey: isRailKey(railKeyValue) ? railKeyValue : "all",
    reviewStatus: REVIEW_STATUSES.includes(reviewStatusValue as ReviewStatus)
      ? (reviewStatusValue as ReviewStatus)
      : "all",
    painType: PAIN_TYPES.includes(painTypeValue as PainType)
      ? (painTypeValue as PainType)
      : "all",
    severity: SEVERITIES.includes(severityValue as Severity)
      ? (severityValue as Severity)
      : "all",
    storeName: normalizeText(params.storeName),
    roleName: normalizeText(params.roleName),
    query: normalizeText(params.q),
  };
}

export function filterInterviewSessions<T extends HistoryInterviewSession>(
  sessions: T[],
  filters: HistoryFilters,
) {
  const query = normalizeLowercase(filters.query);

  return sessions.filter((session) => {
    if (filters.status === "active" && session.status !== "ACTIVE") {
      return false;
    }

    if (filters.status === "completed" && session.status !== "COMPLETED") {
      return false;
    }

    if (filters.railKey !== "all" && session.railKey !== filters.railKey) {
      return false;
    }

    if (filters.storeName && session.storeName !== filters.storeName) {
      return false;
    }

    if (filters.roleName && session.roleName !== filters.roleName) {
      return false;
    }

    if (filters.reviewStatus !== "all") {
      if (session.diagnosisRecord?.reviewStatus !== filters.reviewStatus) {
        return false;
      }
    }

    if (filters.painType !== "all") {
      if (session.diagnosisRecord?.painType !== filters.painType) {
        return false;
      }
    }

    if (filters.severity !== "all") {
      if (session.diagnosisRecord?.severity !== filters.severity) {
        return false;
      }
    }

    if (!query) {
      return true;
    }

    const haystack = [
      session.storeName,
      session.roleName,
      session.status,
      session.diagnosisRecord?.painType,
      session.diagnosisRecord?.severity,
      session.diagnosisRecord?.reviewStatus,
      session.diagnosisRecord?.likelyRootCause,
      session.diagnosisRecord?.nextAction,
      session.diagnosisRecord?.ownerName,
      session.diagnosisRecord?.reviewNote,
      session.diagnosisRecord?.aiSummary,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function buildHistoryFilterOptions<T extends HistoryInterviewSession>(sessions: T[]) {
  const storeNames = Array.from(
    new Set(sessions.map((session) => session.storeName).filter(isNonEmptyString)),
  ).sort((left, right) => left.localeCompare(right));
  const roleNames = Array.from(
    new Set(sessions.map((session) => session.roleName).filter(isNonEmptyString)),
  ).sort((left, right) => left.localeCompare(right));

  return {
    storeNames,
    roleNames,
  };
}

export function buildHistoryFilterHref(partialFilters: Partial<HistoryFilters>) {
  const filters = {
    ...parseHistoryFilters({}),
    ...partialFilters,
  };
  const searchParams = new URLSearchParams();

  if (filters.status !== "all") {
    searchParams.set("status", filters.status);
  }

  if (filters.railKey !== "all") {
    searchParams.set("railKey", filters.railKey);
  }

  if (filters.reviewStatus !== "all") {
    searchParams.set("reviewStatus", filters.reviewStatus);
  }

  if (filters.painType !== "all") {
    searchParams.set("painType", filters.painType);
  }

  if (filters.severity !== "all") {
    searchParams.set("severity", filters.severity);
  }

  if (filters.storeName) {
    searchParams.set("storeName", filters.storeName);
  }

  if (filters.roleName) {
    searchParams.set("roleName", filters.roleName);
  }

  if (filters.query) {
    searchParams.set("q", filters.query);
  }

  const query = searchParams.toString();

  return query ? `/history?${query}` : "/history";
}

export type { HistoryFilters, HistoryInterviewSession, ReviewStatus };
