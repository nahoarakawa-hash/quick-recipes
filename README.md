# Quick Recipes

自分専用のクイックレシピ Web アプリ（第一版）。

料理の手順を必要最小限に圧縮した個人メモ。紙バインダー（目次＋高密度手書き）のデジタル化。

## スタック

- Next.js (App Router)
- Supabase (Auth / DB)
- Vercel 想定

## セットアップ

### 1. 依存関係

```bash
npm install
```

### 2. Supabase

1. プロジェクトを作成
2. Authentication → Providers → Google を有効化
3. Authentication → URL Configuration にリダイレクト URL を追加
   - ローカル: `http://localhost:3000/auth/callback`
   - 本番: `https://YOUR_DOMAIN/auth/callback`
4. SQL Editor で `supabase/migrations/001_recipes.sql` を実行

### 3. 環境変数

`.env.example` をコピーして `.env.local` を作成:

```bash
cp .env.example .env.local
```

`NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定。

### 4. 起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)

## 第一版の範囲

| 含む | 含まない |
|------|----------|
| 一覧（目次）・材料名検索 | 在庫管理 |
| 名前だけ下書き / 編集 / 詳細 | 写真・買い物リスト |
| 役割タグ・メモ | 人数換算 |
| 今日セット（端末ローカル） | オフライン必須 |
| 調理モード + 分数タップ簡易タイマー | URL 抽出（第二版候補） |
| Google ログイン・アーカイブ削除 | バックアップ |

## 画面

- `/` 目次一覧
- `/recipes/new` 名前だけ追加
- `/recipes/[id]` 詳細
- `/recipes/[id]/edit` 編集
- `/today` 今日セット
- `/cook` 調理モード
- `/login` ログイン

## データ

- **Recipe**（Supabase）: title, roleTag?, status(`draft`|`ready`), ingredients[], steps[], notes?, archived, timestamps
- **CookSession**（localStorage）: `recipeIds[]`
