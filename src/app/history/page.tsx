import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthSession } from "@/lib/auth";
import { buildLoginRedirect } from "@/lib/auth-navigation";
import { listDiagnosticRails } from "@/lib/diagnostic-engine";
import { buildHistoryExportHref } from "@/lib/history-export";
import {
  buildHistoryFilterOptions,
  filterInterviewSessions,
  parseHistoryFilters,
} from "@/lib/history-filters";
import { listInterviewSessionsForUser } from "@/lib/interviews";
import {
  getDiagnosisPainTypeLabel,
  getDiagnosisReviewStatusLabel,
  getEmptyHistoryCopy,
  getInterviewCardTitle,
  getInterviewRailLabel,
} from "@/lib/interview-presenters";
import { DIAGNOSIS_PAIN_TYPES } from "@/lib/pain-types";

type HistoryPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function formatTimestamp(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect(buildLoginRedirect("/history"));
  }

  const params = searchParams ? await searchParams : {};
  const interviews = await listInterviewSessionsForUser(session.user.id);
  const filters = parseHistoryFilters(params);
  const filteredInterviews = filterInterviewSessions(interviews, filters);
  const filterOptions = buildHistoryFilterOptions(interviews);
  const rails = listDiagnosticRails();
  const hasActiveFilters = Boolean(
    filters.status !== "all" ||
      filters.railKey !== "all" ||
      filters.reviewStatus !== "all" ||
      filters.painType !== "all" ||
      filters.severity !== "all" ||
      filters.storeName ||
      filters.roleName ||
      filters.query,
  );

  return (
    <main className="flex flex-1 flex-col gap-5 pb-8 pt-4">
      <section className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
          History
        </p>
        <h1 className="display-title text-4xl font-semibold tracking-tight">
          Review prior diagnoses
        </h1>
        <p className="muted max-w-2xl text-sm leading-6">
          Open a completed diagnosis to review the issue statement, the next
          action, and the original conversation that led there.
        </p>
      </section>

      <section className="app-card flex flex-col gap-4 p-6">
        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
            Filter workspace
          </p>
          <h2 className="display-title text-2xl font-semibold">
            Narrow the backlog to one operating slice
          </h2>
          <p className="muted text-sm leading-6">
            Filter by workflow, pain type, owner context, and keyword to find the diagnoses that need attention now.
          </p>
        </div>

        <form method="get" className="grid gap-4">
          <div className="grid gap-4 lg:grid-cols-[1.6fr_0.8fr_0.8fr]">
            <label className="grid gap-2 text-sm font-medium">
              Keyword
              <input
                type="search"
                name="q"
                defaultValue={filters.query}
                placeholder="Store, role, next action, note, owner"
                className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium">
              Session status
              <select
                name="status"
                defaultValue={filters.status}
                className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4"
              >
                <option value="all">All sessions</option>
                <option value="active">Active drafts</option>
                <option value="completed">Completed diagnoses</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium">
              Workflow
              <select
                name="railKey"
                defaultValue={filters.railKey}
                className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4"
              >
                <option value="all">All workflows</option>
                {rails.map((rail) => (
                  <option key={rail.key} value={rail.key}>
                    {rail.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            <label className="grid gap-2 text-sm font-medium">
              Review status
              <select
                name="reviewStatus"
                defaultValue={filters.reviewStatus}
                className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4"
              >
                <option value="all">All review stages</option>
                <option value="new">New</option>
                <option value="reviewing">Reviewing</option>
                <option value="accepted">Accepted</option>
                <option value="resolved">Resolved</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium">
              Pain type
              <select
                name="painType"
                defaultValue={filters.painType}
                className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4"
              >
                <option value="all">All pain types</option>
                {DIAGNOSIS_PAIN_TYPES.map((painType) => (
                  <option key={painType} value={painType}>
                    {getDiagnosisPainTypeLabel(painType)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium">
              Site
              <select
                name="storeName"
                defaultValue={filters.storeName}
                className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4"
              >
                <option value="">All sites</option>
                {filterOptions.storeNames.map((storeName) => (
                  <option key={storeName} value={storeName}>
                    {storeName}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium">
              Role
              <select
                name="roleName"
                defaultValue={filters.roleName}
                className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4"
              >
                <option value="">All roles</option>
                {filterOptions.roleNames.map((roleName) => (
                  <option key={roleName} value={roleName}>
                    {roleName}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--color-text-muted)]">
              Showing {filteredInterviews.length} of {interviews.length} sessions.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/history"
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-medium"
              >
                Clear filters
              </Link>
              <Link
                href={buildHistoryExportHref(filters)}
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-medium"
              >
                Export current view
              </Link>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-accent-foreground)]"
              >
                Apply filters
              </button>
            </div>
          </div>
        </form>
      </section>

      {interviews.length === 0 ? (
        <section className="app-card p-6">
          <h2 className="display-title text-2xl font-semibold">
            You do not have any diagnosis records yet.
          </h2>
          <p className="muted mt-2 text-sm leading-6">
            {getEmptyHistoryCopy()}
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 text-sm font-medium text-[var(--color-accent-foreground)]"
          >
            Start New Diagnosis
          </Link>
        </section>
      ) : filteredInterviews.length === 0 ? (
        <section className="app-card flex flex-col gap-3 p-6">
          <h2 className="display-title text-2xl font-semibold">
            No diagnoses match the current filters.
          </h2>
          <p className="muted text-sm leading-6">
            {hasActiveFilters
              ? "Clear one or more filters and widen the slice you are reviewing."
              : "Start a diagnosis to build the backlog."}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/history"
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-medium"
            >
              Reset filters
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 text-sm font-medium text-[var(--color-accent-foreground)]"
            >
              Start New Diagnosis
            </Link>
          </div>
        </section>
      ) : (
        <section className="grid gap-3">
          {filteredInterviews.map((item) => (
            <Link
              key={item.id}
              href={item.status === "COMPLETED" ? `/history/${item.id}` : `/interview/${item.id}`}
              className="app-card flex flex-col gap-3 p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                    {item.status === "COMPLETED" ? "Completed" : "Active draft"}
                  </span>
                  {item.status === "COMPLETED" && item.diagnosisRecord ? (
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                      {getDiagnosisReviewStatusLabel(item.diagnosisRecord.reviewStatus)}
                    </span>
                  ) : null}
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                    {getInterviewRailLabel(item.railKey)}
                  </span>
                  {item.storeName ? (
                    <span className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                      {item.storeName}
                    </span>
                  ) : null}
                  {item.roleName ? (
                    <span className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                      {item.roleName}
                    </span>
                  ) : null}
                </div>
                <span className="text-sm text-[var(--color-text-muted)]">
                  {formatTimestamp(item.startedAt)}
                </span>
              </div>
              <h2 className="display-title text-xl font-semibold">
                {getInterviewCardTitle({
                  railKey: item.railKey,
                  diagnosisRecord: item.diagnosisRecord,
                }).replace("-", " ")}
              </h2>
              <p className="muted text-sm leading-6">
                {item.diagnosisRecord?.nextAction ||
                  "Continue the guided review to reach a structured diagnosis."}
              </p>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
