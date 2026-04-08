import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/app/account/sign-out-button";
import { getAuthSession } from "@/lib/auth";
import { buildLoginRedirect } from "@/lib/auth-navigation";
import { isDirectDevAuthEnabled } from "@/lib/direct-auth";

function formatTimestamp(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export default async function AccountPage() {
  const session = await getAuthSession();
  const isDirectDevAuth = isDirectDevAuthEnabled();

  if (!session?.user?.id) {
    redirect(buildLoginRedirect("/account"));
  }

  return (
    <main className="flex flex-1 flex-col gap-5 pb-8 pt-4">
      <section className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
          账户
        </p>
        <h1 className="display-title text-4xl font-semibold tracking-tight">
          管理当前会话
        </h1>
        <p className="muted max-w-2xl text-sm leading-6">
          查看当前登录邮箱，返回诊断工作台，或安全退出登录。
        </p>
      </section>

      <section className="app-card flex flex-col gap-4 p-6">
        <div className="space-y-1">
          <h2 className="display-title text-2xl font-semibold">当前登录身份</h2>
          <p className="muted text-sm leading-6">
            {isDirectDevAuth
              ? "当前启用了本地开发直登，页面中的邮箱来自开发态快捷登录。"
              : "当前使用邮箱登录链接认证，登录邮箱就是本次会话的主要身份标识。"}
          </p>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          <AccountField label="邮箱" value={session.user.email ?? "暂无"} />
          <AccountField
            label="查看时间"
            value={formatTimestamp(new Date())}
          />
        </dl>
      </section>

      <section className="app-card flex flex-col gap-4 p-6">
        <div className="space-y-1">
          <h2 className="display-title text-2xl font-semibold">会话操作</h2>
          <p className="muted text-sm leading-6">
            用下面的快捷入口回到诊断工作，或者结束当前会话。
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-medium"
          >
            打开工作台
          </Link>
          <Link
            href="/history"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-medium"
          >
            查看历史
          </Link>
          {isDirectDevAuth ? (
            <a
              href="/api/dev-logout"
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-accent-foreground)]"
            >
              退出登录
            </a>
          ) : (
            <SignOutButton />
          )}
        </div>
      </section>
    </main>
  );
}

function AccountField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
        {label}
      </dt>
      <dd className="mt-2 text-sm leading-6">{value}</dd>
    </div>
  );
}
