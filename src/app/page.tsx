import { Suspense } from "react";
import { listRecipes } from "@/lib/actions/recipes";
import { RecipeToc } from "@/components/RecipeToc";
import { GoldStars } from "@/components/GoldStars";
import { SignOutButton } from "@/components/SignOutButton";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;
  const query = params.q ?? "";
  const recipes = await listRecipes();

  return (
    <main className="space-y-6 pt-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <GoldStars />
          <h1 className="page-title">目次</h1>
          <p className="page-lead">主菜は魚か肉、副菜は和洋中で探す。</p>
        </div>
        <SignOutButton />
      </header>

      <Suspense fallback={<p className="text-ink-muted">読み込み中…</p>}>
        <RecipeToc recipes={recipes} initialQuery={query} />
      </Suspense>
    </main>
  );
}
