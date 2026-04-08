import {
  getDiagnosisPainTypeLabel,
  getDiagnosisSeverityLabel,
  getInterviewRailLabel,
} from "@/lib/interview-presenters";

type InsightDiagnosisRecord = {
  painType: string;
  severity: string;
  nextAction: string;
  reviewStatus: string;
};

type InsightSession = {
  id: string;
  railKey: string;
  storeName: string | null;
  roleName: string | null;
  status: "ACTIVE" | "COMPLETED" | "ABANDONED";
  startedAt: Date;
  diagnosisRecord: InsightDiagnosisRecord | null;
};

type InsightBucket = {
  key: string;
  label: string;
  count: number;
};

type InterviewInsights = {
  summary: {
    totalSessions: number;
    completedSessions: number;
    activeSessions: number;
    topPainType: string | null;
    topPainTypeCount: number;
  };
  railBreakdown: InsightBucket[];
  painTypeBreakdown: InsightBucket[];
  severityBreakdown: InsightBucket[];
  storeBreakdown: InsightBucket[];
  roleBreakdown: InsightBucket[];
  reviewStatusBreakdown: InsightBucket[];
  topActions: Array<{
    label: string;
    count: number;
  }>;
  actionableQueue: Array<InsightSession & { diagnosisRecord: InsightDiagnosisRecord }>;
  recentCompleted: Array<InsightSession & { diagnosisRecord: InsightDiagnosisRecord }>;
};

function sortBucketsDescending(buckets: Map<string, number>, getLabel?: (key: string) => string) {
  return Array.from(buckets.entries())
    .map(([key, count]) => ({
      key,
      label: getLabel ? getLabel(key) : key,
      count,
    }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.label.localeCompare(right.label);
    });
}

function incrementCount(buckets: Map<string, number>, key: string) {
  buckets.set(key, (buckets.get(key) ?? 0) + 1);
}

export function buildInterviewInsights(sessions: InsightSession[]): InterviewInsights {
  const completed = sessions
    .filter(
      (session): session is InsightSession & { diagnosisRecord: InsightDiagnosisRecord } =>
        session.status === "COMPLETED" && session.diagnosisRecord !== null,
    )
    .sort((left, right) => right.startedAt.getTime() - left.startedAt.getTime());

  const railCounts = new Map<string, number>();
  const painTypeCounts = new Map<string, number>();
  const severityCounts = new Map<string, number>();
  const storeCounts = new Map<string, number>();
  const roleCounts = new Map<string, number>();
  const reviewStatusCounts = new Map<string, number>();
  const actionCounts = new Map<string, number>();

  for (const session of completed) {
    incrementCount(railCounts, session.railKey);
    incrementCount(painTypeCounts, session.diagnosisRecord.painType);
    incrementCount(severityCounts, session.diagnosisRecord.severity);
    if (session.storeName) {
      incrementCount(storeCounts, session.storeName);
    }
    if (session.roleName) {
      incrementCount(roleCounts, session.roleName);
    }
    incrementCount(reviewStatusCounts, session.diagnosisRecord.reviewStatus);
    incrementCount(actionCounts, session.diagnosisRecord.nextAction);
  }

  const painTypeBreakdown = sortBucketsDescending(
    painTypeCounts,
    getDiagnosisPainTypeLabel,
  );
  const topPainType = painTypeBreakdown[0];
  const actionableQueue = completed
    .filter(
      (session) =>
        session.diagnosisRecord.reviewStatus === "new" ||
        session.diagnosisRecord.reviewStatus === "reviewing",
    )
    .sort((left, right) => {
      if (left.diagnosisRecord.severity !== right.diagnosisRecord.severity) {
        return left.diagnosisRecord.severity === "high" ? -1 : 1;
      }

      return right.startedAt.getTime() - left.startedAt.getTime();
    })
    .slice(0, 5);

  return {
    summary: {
      totalSessions: sessions.length,
      completedSessions: completed.length,
      activeSessions: sessions.filter((session) => session.status === "ACTIVE").length,
      topPainType: topPainType?.label ?? null,
      topPainTypeCount: topPainType?.count ?? 0,
    },
    railBreakdown: sortBucketsDescending(railCounts, getInterviewRailLabel),
    painTypeBreakdown,
    severityBreakdown: sortBucketsDescending(severityCounts, getDiagnosisSeverityLabel),
    storeBreakdown: sortBucketsDescending(storeCounts),
    roleBreakdown: sortBucketsDescending(roleCounts),
    reviewStatusBreakdown: sortBucketsDescending(reviewStatusCounts),
    topActions: Array.from(actionCounts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((left, right) => {
        if (right.count !== left.count) {
          return right.count - left.count;
        }

        return left.label.localeCompare(right.label);
      }),
    actionableQueue,
    recentCompleted: completed.slice(0, 5),
  };
}

export type { InterviewInsights, InsightSession };
