"use client";

import { useEffect, useState, useTransition } from "react";
import {
  loadCookSession,
  toggleRecipeInSession,
} from "@/lib/cook-session";

type Props = {
  recipeId: string;
  compact?: boolean;
};

export function TodayPinButton({ recipeId, compact }: Props) {
  const [pinned, setPinned] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const sync = () => {
      setPinned(loadCookSession().recipeIds.includes(recipeId));
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("cook-session-change", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("cook-session-change", sync);
    };
  }, [recipeId]);

  return (
    <button
      type="button"
      disabled={pending}
      className={`btn ${pinned ? "btn-pinned" : "btn-primary"} ${compact ? "min-h-9 px-3 text-sm" : ""}`}
      onClick={() => {
        startTransition(() => {
          const next = toggleRecipeInSession(recipeId);
          setPinned(next.recipeIds.includes(recipeId));
        });
      }}
      aria-pressed={pinned}
    >
      {pinned ? "今日に追加済" : "今日に追加"}
    </button>
  );
}
