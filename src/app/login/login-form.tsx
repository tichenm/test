"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

import { resolveLoginCallbackUrl } from "@/lib/auth-navigation";

type LoginFormProps = {
  callbackPath?: string;
  notice?: string;
  authMode?: "magic-link" | "direct-dev";
};

export function LoginForm({
  callbackPath,
  notice,
  authMode = "magic-link",
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");
  const isDirectDevAuth = authMode === "direct-dev";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setStatus("sending");
    setMessage("");

    const result = await signIn("email", {
      email,
      redirect: false,
      callbackUrl: resolveLoginCallbackUrl(
        callbackPath,
        window.location.origin,
      ),
    });

    if (result?.error) {
      setStatus("error");
      setMessage("登录链接发送失败，请重试。");
      return;
    }

    setStatus("sent");
    setMessage("登录链接已发送，请查看邮箱或本地开发日志。");
  }

  return (
    <form
      aria-label="登录表单"
      className="app-card flex flex-col gap-5 p-6"
      onSubmit={isDirectDevAuth ? undefined : handleSubmit}
      action={isDirectDevAuth ? "/api/dev-login" : undefined}
      method={isDirectDevAuth ? "post" : undefined}
    >
      {notice ? (
        <p className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
          {notice}
        </p>
      ) : null}

      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
          邮箱登录
        </p>
        <h1 className="display-title text-3xl font-semibold tracking-tight">
          从上次中断的地方继续。
        </h1>
        <p className="muted text-sm leading-6">
          {isDirectDevAuth
            ? "当前是本地开发模式。输入工作邮箱后可直接进入，无需邮件验证。"
            : "输入你的工作邮箱。系统会发送登录链接，方便你回到进行中的诊断和历史记录。"}
        </p>
      </div>

      {isDirectDevAuth ? (
        <input type="hidden" name="callbackPath" value={callbackPath ?? "/"} />
      ) : null}

      <label className="space-y-2 text-sm font-medium" htmlFor="email">
        工作邮箱
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4 text-base"
          placeholder="manager@company.com"
        />
      </label>

      <button
        type="submit"
        disabled={!isDirectDevAuth && status === "sending"}
        className="min-h-11 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 font-semibold text-[var(--color-accent-foreground)] disabled:opacity-70"
      >
        {isDirectDevAuth
          ? "直接进入"
          : status === "sending"
            ? "正在发送登录链接..."
            : "发送登录链接"}
      </button>

      {message && !isDirectDevAuth ? (
        <p
          className={`text-sm ${
            status === "error" ? "text-[var(--color-error)]" : "text-[var(--color-success)]"
          }`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
