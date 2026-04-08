import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthSession } from "@/lib/auth";
import { buildLoginRedirect } from "@/lib/auth-navigation";
import { listDiagnosticRails } from "@/lib/diagnostic-engine";
import { buildHistoryExportHref } from "@/lib/history-export";
import {
  buildHistoryFilterHref,
  buildHistoryFilterOptions,
  filterInterviewSessions,
  parseHistoryFilters,
} from "@/lib/history-filters";
import {
  listInterviewSessionsForUser,
  updateDiagnosisFollowUpForUser,
} from "@/lib/interviews";
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

type PriorityQueueInterview = {
  id: string;
  railKey: string;
  startedAt: Date;
  storeName?: string | null;
  roleName?: string | null;
  diagnosisRecord?: {
    severity?: string;
    reviewStatus?: string;
    nextAction?: string;
  } | null;
};

function formatTimestamp(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function buildPriorityQueue(interviews: PriorityQueueInterview[]) {
  const severityRank: Record<string, number> = {
    high: 0,
    medium: 1,
  };

  return interviews
    .filter(
      (item) =>
        item.diagnosisRecord &&
        (item.diagnosisRecord.reviewStatus === "new" ||
          item.diagnosisRecord.reviewStatus === "reviewing"),
    )
    .sort((left, right) => {
      const severityDelta =
        (severityRank[left.diagnosisRecord?.severity ?? "medium"] ?? 99) -
        (severityRank[right.diagnosisRecord?.severity ?? "medium"] ?? 99);

      if (severityDelta !== 0) {
        return severityDelta;
      }

      return right.startedAt.getTime() - left.startedAt.getTime();
    })
    .slice(0, 5);
}

function getPriorityQueueTitleRecord(item: PriorityQueueInterview) {
  return item.diagnosisRecord && "painType" in item.diagnosisRecord
    ? { painType: String(item.diagnosisRecord.painType ?? "") }
    : null;
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
  const priorityQueue = buildPriorityQueue(filteredInterviews);
  const historyHref = buildHistoryFilterHref(filters);
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

  async function saveInlineFollowUpAction(formData: FormData) {
    "use server";

    const currentSession = await getAuthSession();

    if (!currentSession?.user?.id) {
      redirect(buildLoginRedirect(historyHref));
    }

    await updateDiagnosisFollowUpForUser({
      userId: currentSession.user.id,
      sessionId: String(formData.get("sessionId") || ""),
      reviewStatus: String(formData.get("reviewStatus") || "new"),
      ownerName: String(formData.get("ownerName") || ""),
      reviewNote: "",
    });

    redirect(historyHref);
  }

  return (
    <main className="flex flex-1 flex-col gap-5 pb-8 pt-4">
      <section className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
          历史
        </p>
        <h1 className="display-title text-4xl font-semibold tracking-tight">
          回看历史诊断
        </h1>
        <p className="muted max-w-2xl text-sm leading-6">
          打开任一已完成诊断，回看问题定义、建议动作，以及原始问答过程。
        </p>
      </section>

      <section className="app-card flex flex-col gap-4 p-6">
        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
            筛选工作区
          </p>
          <h2 className="display-title text-2xl font-semibold">
            把积压问题收敛到一个运营切片
          </h2>
          <p className="muted text-sm leading-6">
            按流程、痛点类型、负责人上下文和关键词筛选，快速找到当前最需要处理的诊断。
          </p>
        </div>

        <form method="get" className="grid gap-4">
          <div className="grid gap-4 lg:grid-cols-[1.6fr_0.8fr_0.8fr]">
            <label className="grid gap-2 text-sm font-medium">
              关键词
              <input
                type="search"
                name="q"
                defaultValue={filters.query}
                placeholder="门店、角色、下一步动作、备注、负责人"
                className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium">
              会话状态
              <select
                name="status"
                defaultValue={filters.status}
                className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4"
              >
                <option value="all">全部会话</option>
                <option value="active">进行中的草稿</option>
                <option value="completed">已完成诊断</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium">
              诊断流程
              <select
                name="railKey"
                defaultValue={filters.railKey}
                className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4"
              >
                <option value="all">全部流程</option>
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
              跟进状态
              <select
                name="reviewStatus"
                defaultValue={filters.reviewStatus}
                className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4"
              >
                <option value="all">全部阶段</option>
                <option value="new">待跟进</option>
                <option value="reviewing">跟进中</option>
                <option value="accepted">已采纳</option>
                <option value="resolved">已解决</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium">
              痛点类型
              <select
                name="painType"
                defaultValue={filters.painType}
                className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4"
              >
                <option value="all">全部痛点类型</option>
                {DIAGNOSIS_PAIN_TYPES.map((painType) => (
                  <option key={painType} value={painType}>
                    {getDiagnosisPainTypeLabel(painType)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium">
              站点
              <select
                name="storeName"
                defaultValue={filters.storeName}
                className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4"
              >
                <option value="">全部站点</option>
                {filterOptions.storeNames.map((storeName) => (
                  <option key={storeName} value={storeName}>
                    {storeName}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium">
              角色
              <select
                name="roleName"
                defaultValue={filters.roleName}
                className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4"
              >
                <option value="">全部角色</option>
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
              当前显示 {filteredInterviews.length} / {interviews.length} 条会话。
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/history"
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-medium"
              >
                清空筛选
              </Link>
              <Link
                href={buildHistoryExportHref(filters)}
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-medium"
              >
                导出当前视图
              </Link>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-accent-foreground)]"
              >
                应用筛选
              </button>
            </div>
          </div>
        </form>
      </section>

      {interviews.length === 0 ? (
        <section className="app-card p-6">
          <h2 className="display-title text-2xl font-semibold">
            你还没有任何诊断记录。
          </h2>
          <p className="muted mt-2 text-sm leading-6">
            {getEmptyHistoryCopy()}
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 text-sm font-medium text-[var(--color-accent-foreground)]"
          >
            开始新诊断
          </Link>
        </section>
      ) : filteredInterviews.length === 0 ? (
        <section className="app-card flex flex-col gap-3 p-6">
          <h2 className="display-title text-2xl font-semibold">
            当前筛选条件下没有匹配的诊断。
          </h2>
          <p className="muted text-sm leading-6">
            {hasActiveFilters
              ? "放宽一个或多个筛选条件，扩大你正在查看的问题范围。"
              : "先开始一次诊断，逐步建立你的问题积压池。"}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/history"
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-medium"
            >
              重置筛选
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 text-sm font-medium text-[var(--color-accent-foreground)]"
            >
              开始新诊断
            </Link>
          </div>
        </section>
      ) : (
        <>
          {priorityQueue.length > 0 ? (
            <section className="app-card flex flex-col gap-4 p-6">
              <div className="space-y-1">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                  优先处理队列
                </p>
                <h2 className="display-title text-2xl font-semibold">
                  先处理高严重度且仍未闭环的问题。
                </h2>
                <p className="muted text-sm leading-6">
                  这份队列只基于你当前筛选出来的历史视图，方便管理者直接进入最该推进的几条诊断。
                </p>
              </div>

              <div className="grid gap-3">
                {priorityQueue.map((item) => (
                  <a
                    key={item.id}
                    href={`/history/${item.id}`}
                    aria-label={`优先处理 ${getInterviewCardTitle({
                      railKey: item.railKey,
                      diagnosisRecord: getPriorityQueueTitleRecord(item),
                    })} ${item.storeName ?? ""} ${item.roleName ?? ""}`}
                    className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                          {getInterviewRailLabel(item.railKey)}
                        </span>
                        <div className="flex flex-wrap gap-2 text-xs text-[var(--color-text-muted)]">
                          <span>
                            严重程度：
                            {item.diagnosisRecord?.severity === "high" ? "高" : "中"}
                          </span>
                          <span>
                            跟进状态：
                            {getDiagnosisReviewStatusLabel(item.diagnosisRecord?.reviewStatus ?? "new")}
                          </span>
                          {item.storeName ? <span>{item.storeName}</span> : null}
                          {item.roleName ? <span>{item.roleName}</span> : null}
                        </div>
                      </div>
                      <span className="text-sm text-[var(--color-text-muted)]">
                        {formatTimestamp(item.startedAt)}
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-semibold">
                      {getInterviewCardTitle({
                        railKey: item.railKey,
                        diagnosisRecord: getPriorityQueueTitleRecord(item),
                      }).replace("-", " ")}
                    </h3>
                    <p className="muted mt-2 text-sm leading-6">
                      {item.diagnosisRecord?.nextAction}
                    </p>
                  </a>
                ))}
              </div>
            </section>
          ) : null}

          <section className="grid gap-3">
            {filteredInterviews.map((item) => (
              item.status === "COMPLETED" && item.diagnosisRecord ? (
                <section key={item.id} className="app-card flex flex-col gap-4 p-5">
                  <a href={`/history/${item.id}`} className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                          已完成
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                          {getDiagnosisReviewStatusLabel(item.diagnosisRecord.reviewStatus)}
                        </span>
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
                      {item.diagnosisRecord.nextAction}
                    </p>
                  </a>

                  <form
                    action={saveInlineFollowUpAction}
                    className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-4"
                  >
                    <input type="hidden" name="sessionId" value={item.id} />
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                        快速跟进
                      </p>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        直接更新状态和负责人，不必先进入详情页。
                      </span>
                    </div>
                    <div className="grid gap-3 md:grid-cols-[0.9fr_1.1fr_auto]">
                      <label className="grid gap-2 text-sm font-medium">
                        跟进状态
                        <select
                          name="reviewStatus"
                          defaultValue={item.diagnosisRecord.reviewStatus}
                          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4"
                        >
                          <option value="new">待跟进</option>
                          <option value="reviewing">跟进中</option>
                          <option value="accepted">已采纳</option>
                          <option value="resolved">已解决</option>
                        </select>
                      </label>
                      <label className="grid gap-2 text-sm font-medium">
                        负责人
                        <input
                          name="ownerName"
                          defaultValue={item.diagnosisRecord.ownerName ?? ""}
                          placeholder="例如：区域经理、站点负责人"
                          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4"
                        />
                      </label>
                      <div className="flex items-end">
                        <button
                          type="submit"
                          className="min-h-11 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-accent-foreground)]"
                        >
                          更新跟进
                        </button>
                      </div>
                    </div>
                  </form>
                </section>
              ) : (
                <a
                  key={item.id}
                  href={`/interview/${item.id}`}
                  className="app-card flex flex-col gap-3 p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                        进行中的草稿
                      </span>
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
                    继续完成引导式问答，收敛出结构化诊断。
                  </p>
                </a>
              )
            ))}
          </section>
        </>
      )}
    </main>
  );
}
