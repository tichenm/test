import Link from "next/link";

import { getAuthSession } from "@/lib/auth";

export default async function NotFoundPage() {
  const session = await getAuthSession();
  const primaryHref = session?.user ? "/" : "/login";
  const primaryLabel = session?.user ? "返回工作台" : "去登录";

  return (
    <main className="flex flex-1 items-center justify-center py-10">
      <section className="app-card flex w-full max-w-3xl flex-col gap-6 p-6 sm:p-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
            页面不存在
          </p>
          <h1 className="display-title text-4xl font-semibold tracking-tight sm:text-5xl">
            这个路径没有对应到可访问的诊断记录。
          </h1>
          <p className="muted max-w-2xl text-base leading-7">
            这个链接可能已经失效、内容不完整，或者记录已被移动。你可以回到工作台开始新的诊断，或者到历史页查找之前的记录。
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-4 text-sm leading-6">
            如果链接来自聊天或邮件，请先确认地址是否完整。
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-4 text-sm leading-6">
            去历史页查找仍然存在的已完成诊断。
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-4 text-sm leading-6">
            如果你本来想记录一个新问题，可以直接重新开始。
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={primaryHref}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-accent-foreground)]"
          >
            {primaryLabel}
          </Link>
          <Link
            href="/history"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4 text-sm font-medium"
          >
            打开历史
          </Link>
          <Link
            href="/insights"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4 text-sm font-medium"
          >
            查看洞察
          </Link>
        </div>
      </section>
    </main>
  );
}
