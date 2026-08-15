"use client";

import { useState, useTransition } from "react";
import { createDraftRecipe } from "@/lib/actions/recipes";

export function NewDraftForm() {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await createDraftRecipe(title);
          if (result?.error) setError(result.error);
        });
      }}
    >
      <div className="field">
        <label htmlFor="title">レシピ名</label>
        <input
          id="title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例: 鶏の照り焼き"
          autoFocus
          required
        />
      </div>
      {error && <p className="text-sm text-warn">{error}</p>}
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "作成中…" : "下書きを作って編集へ"}
      </button>
      <p className="text-sm text-ink-muted">
        名前だけ先に置いておき、材料と手順はあとから書けます。
      </p>
    </form>
  );
}
