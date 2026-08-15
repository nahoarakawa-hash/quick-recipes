"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function GoogleLoginButton() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleLogin() {
    setError(null);
    setPending(true);
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
          skipBrowserRedirect: true,
        },
      });
      if (authError) {
        setError(authError.message);
        setPending(false);
        return;
      }
      if (!data.url) {
        setError("ログイン用の画面を開けませんでした。");
        setPending(false);
        return;
      }
      window.location.assign(data.url);
    } catch {
      setError("ログインに失敗しました。もう一度試してください。");
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="btn btn-primary w-full"
        onClick={handleLogin}
        disabled={pending}
      >
        {pending ? "Googleへ移動中…" : "Googleでログイン"}
      </button>
      {error && <p className="text-sm text-warn">{error}</p>}
    </div>
  );
}
