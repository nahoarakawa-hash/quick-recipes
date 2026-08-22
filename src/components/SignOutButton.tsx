"use client";

import { useTransition } from "react";
import { signOut } from "@/lib/actions/recipes";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-secondary btn-compact shrink-0"
      disabled={pending}
      onClick={() => startTransition(async () => signOut())}
    >
      {pending ? "…" : "ログアウト"}
    </button>
  );
}
