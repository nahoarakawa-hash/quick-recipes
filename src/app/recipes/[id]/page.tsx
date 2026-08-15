import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecipe } from "@/lib/actions/recipes";
import { statusLabel } from "@/lib/recipe-utils";
import { ArchiveButton } from "@/components/ArchiveButton";
import { TodayPinButton } from "@/components/TodayPinButton";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function RecipeDetailPage({ params }: Props) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe || recipe.archived) notFound();

  return (
    <main className="space-y-6 pt-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {recipe.role_tag && <span className="chip">{recipe.role_tag}</span>}
          {recipe.status === "draft" && (
            <span className="chip chip-draft">{statusLabel(recipe.status)}</span>
          )}
        </div>
        <h1 className="page-title">{recipe.title}</h1>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row">
        <TodayPinButton recipeId={recipe.id} />
        <Link href={`/cook?id=${recipe.id}`} className="btn btn-secondary flex-1">
          調理する
        </Link>
        <Link href={`/recipes/${recipe.id}/edit`} className="btn btn-secondary flex-1">
          編集
        </Link>
      </div>

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow)]">
        <h2 className="mb-3 text-xs font-bold tracking-[0.14em] text-ink-muted">材料</h2>
        {recipe.ingredients.length === 0 ? (
          <p className="text-sm text-ink-muted">まだ材料がありません。</p>
        ) : (
          <ul className="space-y-2">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="grid grid-cols-[1.2fr_0.7fr_0.8fr] gap-2 border-b border-line/70 pb-2 text-sm last:border-0">
                <span className="font-medium">{ing.name}</span>
                <span className="text-ink-muted">{ing.amount}</span>
                <span className="text-ink-muted">{ing.prep ?? ""}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow)]">
        <h2 className="mb-3 text-xs font-bold tracking-[0.14em] text-ink-muted">手順</h2>
        {recipe.steps.length === 0 ? (
          <p className="text-sm text-ink-muted">まだ手順がありません。</p>
        ) : (
          <ol className="space-y-3">
            {recipe.steps.map((step) => (
              <li key={step.order} className="flex gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
                  {step.order}
                </span>
                <p className="whitespace-pre-wrap leading-relaxed">{step.text}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {recipe.notes && (
        <section className="rounded-2xl border border-dashed border-line bg-surface/70 p-4">
          <h2 className="mb-2 text-xs font-bold tracking-[0.14em] text-ink-muted">メモ</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{recipe.notes}</p>
        </section>
      )}

      <ArchiveButton recipeId={recipe.id} />
    </main>
  );
}
