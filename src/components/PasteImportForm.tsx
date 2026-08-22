"use client";

import { useState, useTransition } from "react";
import { createDraftFromPastedText } from "@/lib/actions/recipes";

export function PasteImportForm() {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await createDraftFromPastedText(text);
          if (result?.error) setError(result.error);
        });
      }}
    >
      <ol className="list-decimal space-y-2 rounded-xl border border-line bg-bg-deep/60 px-4 py-3 pl-8 text-sm leading-relaxed text-ink">
        <li>カメラで撮る。すでに写真があるときは「写真」アプリで開く</li>
        <li>右下のテキストボタン（線が並んだマーク）をタップ</li>
        <li>「すべて選択」→「コピー」</li>
        <li>この画面に戻って、下に貼る</li>
      </ol>
      <p className="text-xs text-ink-muted">
        iPhone標準のライブテキストでコピーして貼ります。文字化けや改行崩れは取り込み時に整えますが、写真が小さい・斜め・手書きだと精度は下がります。
      </p>
      <div className="field">
        <label htmlFor="paste-text">コピーしたテキスト</label>
        <textarea
          id="paste-text"
          name="paste-text"
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"例:\n鶏の照り焼き\n材料\n鶏もも肉 1枚\n作り方\n皮目を3分焼く"}
          className="min-h-[10rem] w-full rounded-lg border border-line bg-surface px-3 py-2"
        />
      </div>
      {error && <p className="text-sm text-warn">{error}</p>}
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "取り込み中…" : "貼って取り込む"}
      </button>
      <p className="text-sm text-ink-muted">
        材料と手順は自動で分けます。合わないときは次の編集画面で直してください。
      </p>
    </form>
  );
}
