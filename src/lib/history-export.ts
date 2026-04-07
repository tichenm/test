import {
  getDiagnosisReviewStatusLabel,
  getInterviewRailLabel,
} from "@/lib/interview-presenters";

type ExportDiagnosisRecord = {
  painType: string;
  severity: string;
  reviewStatus: string;
  ownerName?: string | null;
  nextAction?: string | null;
  likelyRootCause?: string | null;
  reviewNote?: string | null;
  aiSummary?: string | null;
};

type ExportSession = {
  id: string;
  railKey: string;
  storeName: string | null;
  roleName: string | null;
  status: "ACTIVE" | "COMPLETED" | "ABANDONED";
  startedAt: Date;
  diagnosisRecord: ExportDiagnosisRecord | null;
};

type ExportHrefFilters = {
  status?: "all" | "active" | "completed";
  railKey?: string;
  reviewStatus?: string;
  painType?: string;
  severity?: string;
  storeName?: string;
  roleName?: string;
  query?: string;
};

function formatText(value: string | null | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function formatTimestamp(value: Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(value)
    .replace(" ", "T");
}

function escapeCsvValue(value: string) {
  const neutralizedValue = /^[=+\-@]/.test(value) ? `'${value}` : value;

  if (/[",\n]/.test(neutralizedValue)) {
    return `"${neutralizedValue.replace(/"/g, "\"\"")}"`;
  }

  return neutralizedValue;
}

export function buildHistoryExportCsv<T extends ExportSession>(sessions: T[]) {
  const header = [
    "Session ID",
    "Started At",
    "Session Status",
    "Workflow",
    "Site",
    "Role",
    "Pain Type",
    "Severity",
    "Review Status",
    "Owner",
    "Next Action",
    "Likely Root Cause",
    "Review Note",
    "Summary",
  ];

  const rows = sessions.map((session) => [
    session.id,
    formatTimestamp(session.startedAt),
    session.status === "COMPLETED" ? "Completed" : "Active draft",
    getInterviewRailLabel(session.railKey),
    formatText(session.storeName, "Not specified"),
    formatText(session.roleName, "Not specified"),
    formatText(session.diagnosisRecord?.painType, "Not diagnosed"),
    formatText(session.diagnosisRecord?.severity, "Not diagnosed"),
    session.diagnosisRecord
      ? getDiagnosisReviewStatusLabel(session.diagnosisRecord.reviewStatus)
      : "Not diagnosed",
    formatText(session.diagnosisRecord?.ownerName, "Unassigned"),
    formatText(session.diagnosisRecord?.nextAction, "Continue the guided review."),
    formatText(session.diagnosisRecord?.likelyRootCause, "Not diagnosed"),
    formatText(session.diagnosisRecord?.reviewNote, "No follow-up note yet."),
    formatText(session.diagnosisRecord?.aiSummary, "No summary yet."),
  ]);

  return [header, ...rows]
    .map((row) => row.map((cell) => escapeCsvValue(cell)).join(","))
    .join("\n");
}

export function buildHistoryExportFilename(now: Date) {
  const date = now.toISOString().slice(0, 10);
  return `guided-pain-history-${date}.csv`;
}

export function buildHistoryExportHref(filters: ExportHrefFilters) {
  const searchParams = new URLSearchParams();

  if (filters.status && filters.status !== "all") {
    searchParams.set("status", filters.status);
  }

  if (filters.railKey && filters.railKey !== "all") {
    searchParams.set("railKey", filters.railKey);
  }

  if (filters.reviewStatus && filters.reviewStatus !== "all") {
    searchParams.set("reviewStatus", filters.reviewStatus);
  }

  if (filters.painType && filters.painType !== "all") {
    searchParams.set("painType", filters.painType);
  }

  if (filters.severity && filters.severity !== "all") {
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

  return query ? `/history/export?${query}` : "/history/export";
}

export type { ExportSession };
