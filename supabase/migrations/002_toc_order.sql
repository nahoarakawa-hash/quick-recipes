-- 目次の並び順。同じ役割タグ内の順番を保存する
alter table public.recipes
  add column if not exists toc_order integer not null default 0;

create index if not exists recipes_user_toc_order_idx
  on public.recipes (user_id, role_tag, toc_order);
