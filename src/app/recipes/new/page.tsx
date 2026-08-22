import { NewDraftForm } from "@/components/NewDraftForm";
import { PasteImportForm } from "@/components/PasteImportForm";
import { GoldStars } from "@/components/GoldStars";

export default function NewRecipePage() {
  return (
    <main className="space-y-6 pt-6">
      <header>
        <GoldStars />
        <h1 className="page-title">レシピを追加</h1>
      </header>
      <section className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow)]">
        <h2 className="mb-3 text-sm font-bold tracking-wide text-ink-muted">
          テキストを貼る
        </h2>
        <PasteImportForm />
      </section>
      <section className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow)]">
        <h2 className="mb-3 text-sm font-bold tracking-wide text-ink-muted">
          名前だけ置く
        </h2>
        <NewDraftForm />
      </section>
    </main>
  );
}
