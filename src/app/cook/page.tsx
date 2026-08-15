import { listRecipes } from "@/lib/actions/recipes";
import { CookMode } from "@/components/CookMode";
import type { Recipe } from "@/lib/types";

type Props = {
  searchParams: Promise<{ id?: string }>;
};

export default async function CookPage({ searchParams }: Props) {
  const params = await searchParams;
  const recipes = await listRecipes();
  const recipesById = Object.fromEntries(
    recipes.map((recipe) => [recipe.id, recipe]),
  ) as Record<string, Recipe>;

  return <CookMode recipesById={recipesById} initialRecipeId={params.id} />;
}
