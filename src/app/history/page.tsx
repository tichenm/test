import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthSession } from "@/lib/auth";
import { buildLoginRedirect } from "@/lib/auth-navigation";
import { listInterviewSessionsForUser } from "@/lib/interviews";
import {
  getDiagnosisReviewStatusLabel,
  getEmptyHistoryCopy,
  getInterviewCardTitle,
  getInterviewRailLabel,
} from "@/lib/interview-presenters";

function formatTimestamp(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

export default async function HistoryPage() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect(buildLoginRedirect("/history"));
  }

  const interviews = await listInterviewSessionsForUser(session.user.id);

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
      ) : (
        <section className="grid gap-3">
          {interviews.map((item) => (
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
