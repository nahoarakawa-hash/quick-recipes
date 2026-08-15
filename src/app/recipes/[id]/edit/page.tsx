import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecipe } from "@/lib/actions/recipes";
import { RecipeForm } from "@/components/RecipeForm";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditRecipePage({ params }: Props) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe || recipe.archived) notFound();

  return (
    <main className="space-y-6 pt-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title">編集</h1>
          <p className="page-lead">{recipe.title}</p>
        </div>
        <Link href={`/recipes/${recipe.id}`} className="btn btn-secondary min-h-9 px-3 text-sm">
          詳細へ
        </Link>
      </header>
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow)]">
        <RecipeForm recipe={recipe} />
      </div>
    </main>
  );
}
