import {
  getDiagnosisPainTypeLabel,
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
    "会话ID",
    "开始时间",
    "会话状态",
    "诊断流程",
    "站点",
    "角色",
    "痛点类型",
    "严重程度",
    "跟进状态",
    "负责人",
    "建议动作",
    "可能根因",
    "跟进备注",
    "总结",
  ];

  const rows = sessions.map((session) => [
    session.id,
    formatTimestamp(session.startedAt),
    session.status === "COMPLETED" ? "已完成" : "进行中的草稿",
    getInterviewRailLabel(session.railKey),
    formatText(session.storeName, "未填写"),
    formatText(session.roleName, "未填写"),
    session.diagnosisRecord
      ? getDiagnosisPainTypeLabel(session.diagnosisRecord.painType)
      : "未诊断",
    formatText(session.diagnosisRecord?.severity, "未诊断"),
    session.diagnosisRecord
      ? getDiagnosisReviewStatusLabel(session.diagnosisRecord.reviewStatus)
      : "未诊断",
    formatText(session.diagnosisRecord?.ownerName, "未指派"),
    formatText(session.diagnosisRecord?.nextAction, "继续完成引导式诊断。"),
    formatText(session.diagnosisRecord?.likelyRootCause, "未诊断"),
    formatText(session.diagnosisRecord?.reviewNote, "还没有跟进备注。"),
    formatText(session.diagnosisRecord?.aiSummary, "还没有总结。"),
  ]);

  return [header, ...rows]
    .map((row) => row.map((cell) => escapeCsvValue(cell)).join(","))
    .join("\n");
}

export function buildHistoryExportFilename(now: Date) {
  const date = now.toISOString().slice(0, 10);
  return `pain-history-${date}.csv`;
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
