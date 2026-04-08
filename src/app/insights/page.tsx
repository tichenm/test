import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthSession } from "@/lib/auth";
import { buildLoginRedirect } from "@/lib/auth-navigation";
import type { PainType, RailKey } from "@/lib/diagnostic-engine";
import { buildHistoryFilterHref } from "@/lib/history-filters";
import { buildInterviewInsights } from "@/lib/interview-insights";
import {
  getDiagnosisReviewStatusLabel,
  getInterviewCardTitle,
  getInterviewRailLabel,
} from "@/lib/interview-presenters";
import { listInterviewSessionsForUser } from "@/lib/interviews";

function formatTimestamp(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
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
            洞察
          </p>
          <h1 className="display-title text-4xl font-semibold tracking-tight sm:text-5xl">
            看清哪些一线问题在反复出现。
          </h1>
          <p className="muted max-w-2xl text-base leading-7">
            把已完成的引导式诊断整理成管理者可用的运营信号面板。
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="总会话数"
            value={String(insights.summary.totalSessions)}
            caption="包含所有草稿与已完成诊断。"
          />
          <MetricCard
            label="已完成诊断"
            value={String(insights.summary.completedSessions)}
            caption="已经结构化、可进入跟进的问题。"
          />
          <MetricCard
            label="进行中的草稿"
            value={String(insights.summary.activeSessions)}
            caption="仍在进行中的未完成诊断。"
          />
          <MetricCard
            label="最高频痛点"
            value={insights.summary.topPainType ?? "暂无"}
            caption={
              insights.summary.topPainType
                ? `${insights.summary.topPainTypeCount} 条已完成诊断`
                : "完成几条诊断后，这里会开始出现趋势。"
            }
          />
        </div>
      </section>

      {insights.summary.completedSessions === 0 ? (
        <section className="app-card flex flex-col gap-3 p-6">
          <h2 className="display-title text-2xl font-semibold">
            先完成几条诊断，再来看趋势。
          </h2>
          <p className="muted max-w-2xl text-sm leading-6">
            当管理者手上有几条已完成访谈后，这个页面才会真正有参考价值。
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 text-sm font-medium text-[var(--color-accent-foreground)]"
            >
              开始诊断
            </Link>
            <Link
              href="/history"
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-medium"
            >
              查看历史
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-2">
            <BreakdownCard
              title="按流程查看问题"
              description="哪些引导流程产出了最多已完成问题。"
              items={insights.railBreakdown.map((item) => ({
                ...item,
                href: buildHistoryFilterHref({
                  status: "completed",
                  railKey: item.key as RailKey,
                }),
              }))}
            />
            <BreakdownCard
              title="按角色查看问题"
              description="哪些一线岗位反复暴露出同类结构化痛点。"
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
              title="按痛点类型查看"
              description="管理者最常听到的是哪类运营痛点。"
              items={insights.painTypeBreakdown.map((item) => ({
                ...item,
                href: buildHistoryFilterHref({
                  status: "completed",
                  painType: item.key as PainType,
                }),
              }))}
            />
            <section className="app-card flex flex-col gap-4 p-6">
              <div className="space-y-1">
                <h2 className="display-title text-2xl font-semibold">高频下一步动作</h2>
                <p className="muted text-sm leading-6">
                  最近诊断里最常出现的建议动作。
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
              title="按站点查看问题"
              description="当大家填写了站点信息后，重复诊断会聚集在哪些位置。"
              items={insights.storeBreakdown.map((item) => ({
                ...item,
                href: buildHistoryFilterHref({
                  status: "completed",
                  storeName: item.key,
                }),
              }))}
            />
            <BreakdownCard
              title="跟进积压"
              description="当前还有多少诊断处于待跟进、跟进中、已采纳或已解决。"
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
              title="严重程度分布"
              description="快速查看高优先级和中等级别问题的占比。"
              items={insights.severityBreakdown.map((item) => ({
                ...item,
                href: buildHistoryFilterHref({
                  status: "completed",
                  severity: item.key as "medium" | "high",
                }),
              }))}
            />
            <div className="app-card rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-strong)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                说明
              </p>
              <p className="mt-2 text-sm leading-6">
                只有当访谈发起人持续填写可选的站点和角色信息时，角色和站点聚类才会更可靠。
              </p>
            </div>
          </section>

          <section className="app-card flex flex-col gap-4 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                  最近完成
                </p>
                <h2 className="display-title mt-1 text-2xl font-semibold">
                  最新结构化诊断
                </h2>
              </div>
              <Link href="/history" className="text-sm font-medium text-[var(--color-accent)]">
                打开历史
              </Link>
            </div>

            <ul className="grid gap-3">
              {insights.recentCompleted.map((item) => (
                <li key={item.id}>
                  <a
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
                  </a>
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
            这个视角下暂时还没有形成可分组的信号。
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
