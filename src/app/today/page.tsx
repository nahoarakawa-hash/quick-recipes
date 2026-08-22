import { listRecipes } from "@/lib/actions/recipes";
import { GoldStars } from "@/components/GoldStars";
import { TodaySetClient } from "@/components/TodaySetClient";
import type { Recipe } from "@/lib/types";

export default async function TodayPage() {
  const recipes = await listRecipes();
  const recipesById = Object.fromEntries(
    recipes.map((recipe) => [recipe.id, recipe]),
  ) as Record<string, Recipe>;

  return (
    <main className="space-y-6 pt-6">
      <header>
        <GoldStars />
        <h1 className="page-title">今日セット</h1>
        <p className="page-lead">今夜の分を、目次から複数追加できます。</p>
      </header>
      <TodaySetClient recipesById={recipesById} />
    </main>
  );
}
