"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { login } from "@/lib/api";
import { saveAuth } from "@/lib/auth";
import { errorToastClassNames } from "@/lib/toastStyles";
import SocialAuthButtons from "@/components/SocialAuthButtons";
import PasswordInput from "@/components/PasswordInput";

function getLoginToastMessage(message) {
  const lower = String(message).toLowerCase();

  if (lower.includes("banned")) {
    return "This account has been banned";
  }
  if (lower.includes("email")) {
    return "Incorrect email";
  }
  if (lower.includes("password")) {
    return "Incorrect password";
  }
  return message || "Login failed";
}

export default function LoginForm({
  title,
  subtitle,
  registerHref,
  registerPrompt,
  registerLabel = "Create an account ›",
  showRemember = false,
  showForgotPassword = false,
  showSocial = false,
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  const forgotPasswordHref = (() => {
    const trimmed = email.trim();
    return trimmed
      ? `/forgot-password?${new URLSearchParams({ email: trimmed })}`
      : "/forgot-password";
  })();

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);

    try {
      const data = await login({ email, password });
      saveAuth(data, showRemember ? remember : true);

      const isSitter = Boolean(data?.user?.isSitter);
      router.push(isSitter ? "/sitter/profile" : "/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      toast(getLoginToastMessage(message), {
        classNames: errorToastClassNames,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <header>
        <h2 className="text-h2">{title}</h2>
        <p className="mt-1 text-body-2 text-ink-400">{subtitle}</p>
      </header>

      <label className="flex flex-col gap-2">
        <span className="text-label text-ink-900">Email</span>
        <input
          className="input"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="bell@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>

      <div className="flex flex-col gap-2">
        <label htmlFor="login-password" className="text-label text-ink-900">
          Password
        </label>
        <PasswordInput
          id="login-password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>

      {showForgotPassword ? (
        <p className="text-right">
          <Link href={forgotPasswordHref} className="text-caption font-bold text-primary">
            Forgot password?
          </Link>
        </p>
      ) : null}

      {showRemember ? (
        <label className="flex min-h-11 items-center gap-2 text-body-2 text-ink-600">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="size-4 accent-primary"
          />
          Remember me
        </label>
      ) : null}

      <button className="btn btn-primary w-full" type="submit" disabled={loading}>
        {loading ? "Logging in..." : "Log in"}
      </button>

      {showSocial ? <SocialAuthButtons remember={showRemember ? remember : true} /> : null}

      <p className="text-center text-body-2 text-ink-600">
        {registerPrompt}{" "}
        <Link href={registerHref} className="font-bold text-primary">
          {registerLabel}
        </Link>
      </p>
    </form>
  );
}
