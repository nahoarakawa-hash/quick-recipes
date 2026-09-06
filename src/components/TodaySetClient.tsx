"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  clearCookSession,
  loadCookSession,
  removeRecipeFromSession,
  reorderCookSession,
} from "@/lib/cook-session";
import type { Recipe } from "@/lib/types";

type Props = {
  recipesById: Record<string, Recipe>;
};

export function TodaySetClient({ recipesById }: Props) {
  const [ids, setIds] = useState<string[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const sync = () => setIds(loadCookSession().recipeIds);
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("cook-session-change", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("cook-session-change", sync);
    };
  }, []);

  const items = useMemo(
    () =>
      ids
        .map((id) => recipesById[id])
        .filter((r): r is Recipe => Boolean(r)),
    [ids, recipesById],
  );

  const missingCount = ids.length - items.length;

  function clearAll() {
    clearCookSession();
    setIds([]);
    setConfirmClear(false);
  }

  function move(index: number, dir: -1 | 1) {
    const nextIndex = index + dir;
    if (nextIndex < 0 || nextIndex >= ids.length) return;
    const next = [...ids];
    const [picked] = next.splice(index, 1);
    next.splice(nextIndex, 0, picked);
    startTransition(() => {
      setIds(reorderCookSession(next).recipeIds);
    });
  }

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <div className="today-sky">
          <span className="today-sky-kicker">TONIGHT</span>
          <p>
            まだ追加されていません。
            <br />
            目次や詳細から「今日に追加」できます。
          </p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow)]">
          {items.map((recipe, index) => (
            <li
              key={recipe.id}
              className={`flex items-center gap-2 px-3 py-3 ${
                index > 0 ? "border-t border-line" : ""
              }`}
            >
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  className="btn btn-secondary min-h-8 px-2 text-xs"
                  onClick={() => move(index, -1)}
                  disabled={index === 0 || pending}
                  aria-label="上へ"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn btn-secondary min-h-8 px-2 text-xs"
                  onClick={() => move(index, 1)}
                  disabled={index === items.length - 1 || pending}
                  aria-label="下へ"
                >
                  ↓
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/recipes/${recipe.id}`} className="font-semibold text-ink">
                  {recipe.title}
                </Link>
                {recipe.role_tag && (
                  <p className="text-xs text-ink-muted">{recipe.role_tag}</p>
                )}
              </div>
              <button
                type="button"
                className="btn btn-secondary min-h-9 px-3 text-sm"
                onClick={() => setIds(removeRecipeFromSession(recipe.id).recipeIds)}
              >
                外す
              </button>
            </li>
          ))}
        </ul>
      )}

      {missingCount > 0 && (
        <p className="text-sm text-warn">
          アーカイブ済みなどで見つからないレシピが {missingCount} 件あります。
        </p>
      )}

      {confirmClear ? (
        <div className="space-y-2 rounded-xl border border-line bg-surface px-3 py-3 shadow-[var(--shadow)]">
          <p className="text-sm text-ink">今日セットをすべてクリアしますか？</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" className="btn btn-danger flex-1" onClick={clearAll}>
              クリアする
            </button>
            <button
              type="button"
              className="btn btn-secondary flex-1"
              onClick={() => setConfirmClear(false)}
            >
              やめる
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/cook"
            className={`btn btn-primary flex-1 ${items.length === 0 ? "pointer-events-none opacity-50" : ""}`}
          >
            調理モードを開く
          </Link>
          <button
            type="button"
            className="btn btn-secondary flex-1"
            disabled={ids.length === 0}
            onClick={() => setConfirmClear(true)}
          >
            クリア
          </button>
        </div>
      )}
    </div>
  );
}
