"use client";

import { useTransition } from "react";
import { signOut } from "@/lib/actions/recipes";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-secondary min-h-9 px-3 text-sm"
      disabled={pending}
      onClick={() => startTransition(async () => signOut())}
    >
      {pending ? "…" : "ログアウト"}
    </button>
  );
}
