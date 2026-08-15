import { startGoogleLogin } from "@/lib/actions/auth";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const configured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  return (
    <main className="flex min-h-[80vh] flex-col justify-center gap-8 py-10">
      <div>
        <p className="text-xs font-bold tracking-[0.18em] text-accent">QUICK RECIPES</p>
        <h1 className="page-title mt-2">自分専用のクイックレシピ</h1>
        <p className="page-lead">
          手順を必要最小限に圧縮したメモ。一人用・Googleログイン。
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow)]">
        {!configured ? (
          <p className="text-sm leading-relaxed text-warn">
            `.env.local` に `NEXT_PUBLIC_SUPABASE_URL` と
            `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定してください。
          </p>
        ) : (
          <div className="space-y-3">
            <form action={startGoogleLogin}>
              <button type="submit" className="btn btn-primary w-full">
                Googleでログイン
              </button>
            </form>
            {params.error && (
              <p className="text-sm text-warn">ログインに失敗しました。もう一度試してください。</p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
