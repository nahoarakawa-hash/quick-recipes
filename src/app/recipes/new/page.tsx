import { NewDraftForm } from "@/components/NewDraftForm";
import { GoldStars } from "@/components/GoldStars";

export default function NewRecipePage() {
  return (
    <main className="space-y-6 pt-6">
      <header>
        <GoldStars />
        <h1 className="page-title">名前だけ追加</h1>
        <p className="page-lead">思いついたら名前だけ置いておく。材料と手順はあとから書けます。</p>
      </header>
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow)]">
        <NewDraftForm />
      </div>
    </main>
  );
}
