"use client";

import { useTransition } from "react";
import { archiveRecipe } from "@/lib/actions/recipes";

type Props = {
  recipeId: string;
};

export function ArchiveButton({ recipeId }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="btn btn-danger w-full"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("このレシピをアーカイブしますか？（一覧から消えます）")) {
          return;
        }
        startTransition(async () => {
          await archiveRecipe(recipeId);
        });
      }}
    >
      {pending ? "処理中…" : "アーカイブ（削除）"}
    </button>
  );
}
