import { redirect } from "next/navigation";

import { getAuthSession } from "@/lib/auth";
import { normalizeCallbackPath } from "@/lib/auth-navigation";
import { isDirectDevAuthEnabled } from "@/lib/direct-auth";
import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams?: Promise<{
    callbackUrl?: string;
    reason?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getAuthSession();
  const params = searchParams ? await searchParams : undefined;
  const callbackPath = normalizeCallbackPath(params?.callbackUrl);
  const authMode = isDirectDevAuthEnabled() ? "direct-dev" : "magic-link";
  const notice = params?.reason === "auth"
    ? "请先登录，再继续访问你刚才打开的页面。"
    : params?.reason === "signed-out"
      ? "你已退出登录。如需继续使用，请重新输入邮箱登录。"
      : undefined;

  if (session?.user) {
    redirect(callbackPath);
  }

  return (
    <main className="flex flex-1 items-center justify-center py-10">
      <div className="grid w-full max-w-4xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="app-card flex flex-col justify-between gap-6 p-6 sm:p-8">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
              引导式痛点诊断
            </p>
            <h2 className="display-title text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              把模糊抱怨收敛成团队可执行的诊断结论。
            </h2>
            <p className="muted max-w-xl text-base leading-7">
              一线管理者往往先感觉哪里不对，再慢慢说清问题是什么。这个流程会帮你把模糊现象收敛成结构化问题和下一步动作。
            </p>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-4">
              先讲清问题
            </div>
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-4">
              自动保存草稿
            </div>
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-4">
              随时回来继续
            </div>
          </div>
        </section>
        <LoginForm callbackPath={callbackPath} notice={notice} authMode={authMode} />
      </div>
    </main>
  );
}
