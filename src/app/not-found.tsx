import Link from "next/link";

export default function NotFound() {
  return (
    <main className="space-y-4 pt-10">
      <h1 className="page-title">見つかりません</h1>
      <p className="page-lead">レシピが削除（アーカイブ）されたか、URL が違います。</p>
      <Link href="/" className="btn btn-primary">
        目次へ戻る
      </Link>
    </main>
  );
}
