"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  isSupabaseConfigured,
  signInWithOAuthProvider,
  stashOAuthRemember,
} from "@/lib/supabase";
import { errorToastClassNames } from "@/lib/toastStyles";

export default function SocialAuthButtons({ remember = true }) {
  const [loadingProvider, setLoadingProvider] = useState(null);

  async function handleOAuth(provider) {
    if (provider === "line") {
      toast("LINE login is not configured yet.", { classNames: errorToastClassNames });
      return;
    }

    if (!isSupabaseConfigured()) {
      toast(
        "Social login is not configured. Add Supabase keys to .env.local.",
        { classNames: errorToastClassNames },
      );
      return;
    }

    setLoadingProvider(provider);
    stashOAuthRemember(remember);

    try {
      await signInWithOAuthProvider(provider);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Social login failed";
      toast(message, { classNames: errorToastClassNames });
      setLoadingProvider(null);
    }
  }

  const busy = Boolean(loadingProvider);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-caption text-ink-400">or</span>
        <span className="h-px flex-1 bg-line" />
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => handleOAuth("google")}
        className="btn btn-social w-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        <img src="/icon/google.svg" alt="" className="size-5 shrink-0" />
        {loadingProvider === "google" ? "..." : "Continue with Google"}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => handleOAuth("line")}
        className="btn btn-social w-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="flex size-5 items-center justify-center rounded-sm bg-[#06C755] text-[10px] font-black text-white">
          LINE
        </span>
        Continue with LINE
      </button>
    </div>
  );
}
