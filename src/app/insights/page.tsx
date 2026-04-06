import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthSession } from "@/lib/auth";
import { buildLoginRedirect } from "@/lib/auth-navigation";
import { buildHistoryFilterHref } from "@/lib/history-filters";
import { buildInterviewInsights } from "@/lib/interview-insights";
import {
  getDiagnosisReviewStatusLabel,
  getInterviewCardTitle,
  getInterviewRailLabel,
} from "@/lib/interview-presenters";
import { listInterviewSessionsForUser } from "@/lib/interviews";

function formatTimestamp(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

export default async function InsightsPage() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect(buildLoginRedirect("/insights"));
  }

  const interviews = await listInterviewSessionsForUser(session.user.id);
  const insights = buildInterviewInsights(interviews);

  return (
    <main className="flex flex-1 flex-col gap-6 pb-8 pt-4">
      <section className="app-card flex flex-col gap-4 p-6 sm:p-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
            Insights
          </p>
          <h1 className="display-title text-4xl font-semibold tracking-tight sm:text-5xl">
            See which floor problems keep repeating.
          </h1>
          <p className="muted max-w-2xl text-base leading-7">
            Turn completed guided diagnoses into a small operating signal board for managers.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total sessions"
            value={String(insights.summary.totalSessions)}
            caption="All drafts and completed guided reviews."
          />
          <MetricCard
            label="Completed diagnoses"
            value={String(insights.summary.completedSessions)}
            caption="Structured issues ready for review."
          />
          <MetricCard
            label="Active drafts"
            value={String(insights.summary.activeSessions)}
            caption="Unfinished guided reviews still in progress."
          />
          <MetricCard
            label="Most common pain"
            value={insights.summary.topPainType ?? "None yet"}
            caption={
              insights.summary.topPainType
                ? `${insights.summary.topPainTypeCount} completed diagnoses`
                : "Complete a diagnosis to populate trends."
            }
          />
        </div>
      </section>

      {insights.summary.completedSessions === 0 ? (
        <section className="app-card flex flex-col gap-3 p-6">
          <h2 className="display-title text-2xl font-semibold">
            Complete a few diagnoses before reading trends.
          </h2>
          <p className="muted max-w-2xl text-sm leading-6">
            This view starts to become useful once managers have a few finished interviews to compare.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 text-sm font-medium text-[var(--color-accent-foreground)]"
            >
              Start a diagnosis
            </Link>
            <Link
              href="/history"
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-medium"
            >
              Review history
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-2">
            <BreakdownCard
              title="Issues by workflow"
              description="Which guided rails are surfacing the most completed problems."
              items={insights.railBreakdown.map((item) => ({
                ...item,
                href: buildHistoryFilterHref({
                  status: "completed",
                  railKey: item.key as "inventory-replenishment" | "warehouse-receiving",
                }),
              }))}
            />
            <BreakdownCard
              title="Issues by role"
              description="Which frontline functions keep surfacing the same structured pain."
              items={insights.roleBreakdown.map((item) => ({
                ...item,
                href: buildHistoryFilterHref({
                  status: "completed",
                  roleName: item.key,
                }),
              }))}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <BreakdownCard
              title="Issues by pain type"
              description="What kind of operating pain managers are hearing most often."
              items={insights.painTypeBreakdown.map((item) => ({
                ...item,
                href: buildHistoryFilterHref({
                  status: "completed",
                  painType: item.key as "stockout" | "overstock" | "inventory-accuracy",
                }),
              }))}
            />
            <section className="app-card flex flex-col gap-4 p-6">
              <div className="space-y-1">
                <h2 className="display-title text-2xl font-semibold">Repeated next actions</h2>
                <p className="muted text-sm leading-6">
                  The most common operational follow-ups recommended by recent diagnoses.
                </p>
              </div>
              <ul className="grid gap-3">
                {insights.topActions.map((item) => (
                  <li
                    key={item.label}
                    className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-4"
                  >
                    <Link
                      href={buildHistoryFilterHref({
                        status: "completed",
                        query: item.label,
                      })}
                      className="flex items-start justify-between gap-4"
                    >
                      <p className="text-sm leading-6">{item.label}</p>
                      <span className="rounded-full bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                        {item.count}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <BreakdownCard
              title="Issues by site"
              description="Where repeated diagnoses are clustering when people add location context."
              items={insights.storeBreakdown.map((item) => ({
                ...item,
                href: buildHistoryFilterHref({
                  status: "completed",
                  storeName: item.key,
                }),
              }))}
            />
            <BreakdownCard
              title="Follow-up backlog"
              description="How many diagnoses are still new, in review, accepted, or resolved."
              items={insights.reviewStatusBreakdown.map((item) => ({
                ...item,
                label: getDiagnosisReviewStatusLabel(item.key),
                href: buildHistoryFilterHref({
                  status: "completed",
                  reviewStatus: item.key as "new" | "reviewing" | "accepted" | "resolved",
                }),
              }))}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <BreakdownCard
              title="Severity mix"
              description="A quick split between higher-risk and medium-severity diagnoses."
              items={insights.severityBreakdown.map((item) => ({
                ...item,
                href: buildHistoryFilterHref({
                  status: "completed",
                  query: item.key,
                }),
              }))}
            />
            <div className="app-card rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-strong)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                Context note
              </p>
              <p className="mt-2 text-sm leading-6">
                Role and site clustering become reliable only when interview starters consistently fill the optional intake fields.
              </p>
            </div>
          </section>

          <section className="app-card flex flex-col gap-4 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                  Recent completed
                </p>
                <h2 className="display-title mt-1 text-2xl font-semibold">
                  Latest structured diagnoses
                </h2>
              </div>
              <Link href="/history" className="text-sm font-medium text-[var(--color-accent)]">
                Open history
              </Link>
            </div>

            <ul className="grid gap-3">
              {insights.recentCompleted.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/history/${item.id}`}
                    className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
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
                        <span className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                          {getDiagnosisReviewStatusLabel(item.diagnosisRecord.reviewStatus)}
                        </span>
                        <span className="font-semibold capitalize">
                          {getInterviewCardTitle({
                            railKey: item.railKey,
                            diagnosisRecord: item.diagnosisRecord,
                          }).replace("-", " ")}
                        </span>
                      </div>
                      <span className="text-sm text-[var(--color-text-muted)]">
                        {formatTimestamp(item.startedAt)}
                      </span>
                    </div>
                    <p className="muted text-sm">{item.diagnosisRecord.nextAction}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}

function MetricCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
        {label}
      </p>
      <p className="display-title mt-3 text-3xl font-semibold capitalize">{value}</p>
      <p className="muted mt-2 text-sm leading-6">{caption}</p>
    </div>
  );
}

function BreakdownCard({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: Array<{
    key: string;
    label: string;
    count: number;
    href?: string;
  }>;
}) {
  return (
    <section className="app-card flex flex-col gap-4 p-6">
      <div className="space-y-1">
        <h2 className="display-title text-2xl font-semibold">{title}</h2>
        <p className="muted text-sm leading-6">{description}</p>
      </div>

      <ul className="grid gap-3">
        {items.length === 0 ? (
          <li className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-strong)] p-4 text-sm leading-6 text-[var(--color-text-muted)]">
            No grouped signal yet for this view.
          </li>
        ) : (
          items.map((item) => (
            <li
              key={item.key}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)]"
            >
              {item.href ? (
                <Link
                  href={item.href}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <span className="text-sm capitalize">{item.label}</span>
                  <span className="rounded-full bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                    {item.count}
                  </span>
                </Link>
              ) : (
                <div className="flex items-center justify-between gap-4 p-4">
                  <span className="text-sm capitalize">{item.label}</span>
                  <span className="rounded-full bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                    {item.count}
                  </span>
                </div>
              )}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
