"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { updateTocLayout } from "@/lib/actions/recipes";
import { ROLE_TAG_PRESETS, type Recipe } from "@/lib/types";
import {
  UNCATEGORIZED_GROUP,
  compareTocGroupKeys,
  groupRecipesForToc,
  recipesToTocItems,
  statusLabel,
  tocRoleTagFromGroupKey,
} from "@/lib/recipe-utils";
import { TodayPinButton } from "@/components/TodayPinButton";
import { clearCookSession, loadCookSession } from "@/lib/cook-session";

type TocItems = Record<string, string[]>;

const GROUP_PREFIX = "group:";
const TOC_FILTER_KEY = "quick-recipes:toc-filters";

type Props = {
  recipes: Recipe[];
  initialQuery?: string;
};

function groupDroppableId(key: string) {
  return `${GROUP_PREFIX}${key}`;
}

function findContainer(items: TocItems, id: string): string | undefined {
  if (id.startsWith(GROUP_PREFIX)) return id.slice(GROUP_PREFIX.length);
  return Object.keys(items).find((key) => items[key].includes(id));
}

function flattenTocItems(items: TocItems) {
  return Object.entries(items).flatMap(([key, ids]) =>
    ids.map((id, index) => ({
      id,
      role_tag: tocRoleTagFromGroupKey(key),
      toc_order: index,
    })),
  );
}

function layoutSignature(items: TocItems) {
  return Object.entries(items)
    .filter(([, ids]) => ids.length > 0)
    .sort(([a], [b]) => compareTocGroupKeys(a, b))
    .map(([key, ids]) => `${key}:${ids.join(",")}`)
    .join("|");
}

function readSavedFilters(): string[] | null {
  try {
    const raw = localStorage.getItem(TOC_FILTER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string")) {
      return null;
    }
    return parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function writeSavedFilters(tags: string[] | null) {
  try {
    if (!tags || tags.length === 0) localStorage.removeItem(TOC_FILTER_KEY);
    else localStorage.setItem(TOC_FILTER_KEY, JSON.stringify(tags));
  } catch {
    /* ignore quota / private mode */
  }
}

function ingredientPreview(recipe: Recipe) {
  if (recipe.ingredients.length === 0) return null;
  const text = recipe.ingredients
    .slice(0, 4)
    .map((ing) =>
      ing.amount.trim() ? `${ing.name} ${ing.amount.trim()}` : ing.name,
    )
    .join("・");
  return `${text}${recipe.ingredients.length > 4 ? "…" : ""}`;
}

export function RecipeToc({ recipes, initialQuery = "" }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [visibleTags, setVisibleTags] = useState<string[] | null>(null);
  const [items, setItems] = useState<TocItems>(() => recipesToTocItems(recipes));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [todayCount, setTodayCount] = useState(0);
  const [pending, startTransition] = useTransition();
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const expectedLayout = useRef<string | null>(null);

  const searching = query.trim().length > 0;

  useEffect(() => {
    setVisibleTags(readSavedFilters());
  }, []);

  useEffect(() => {
    const sync = () => setTodayCount(loadCookSession().recipeIds.length);
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("cook-session-change", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("cook-session-change", sync);
    };
  }, []);

  useEffect(() => {
    if (activeId) return;
    const incoming = recipesToTocItems(recipes);
    const signature = layoutSignature(incoming);
    if (expectedLayout.current && expectedLayout.current !== signature) return;
    expectedLayout.current = null;
    setItems(incoming);
  }, [recipes, activeId]);

  const recipeById = useMemo(
    () => new Map(recipes.map((recipe) => [recipe.id, recipe])),
    [recipes],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.ingredients.some((ing) => ing.name.toLowerCase().includes(q)) ||
        (r.role_tag?.toLowerCase().includes(q) ?? false),
    );
  }, [recipes, query]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const groupKeys = useMemo(
    () => Object.keys(items).sort(compareTocGroupKeys),
    [items],
  );

  const filterOptions = useMemo(() => {
    const extras = new Set<string>();
    for (const recipe of recipes) {
      const key = recipe.role_tag?.trim() || UNCATEGORIZED_GROUP;
      if (!(ROLE_TAG_PRESETS as readonly string[]).includes(key)) {
        extras.add(key);
      }
    }
    return [...ROLE_TAG_PRESETS, ...[...extras].sort(compareTocGroupKeys)];
  }, [recipes]);

  const hasLegacyGroups = useMemo(
    () =>
      recipes.some((recipe) => {
        const tag = recipe.role_tag?.trim();
        return Boolean(tag) && !(ROLE_TAG_PRESETS as readonly string[]).includes(tag ?? "");
      }),
    [recipes],
  );

  const visibleTagSet = visibleTags ? new Set(visibleTags) : null;

  const activeRecipe = activeId ? recipeById.get(activeId) : undefined;

  function applySearch(value: string) {
    setQuery(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) params.set("q", value.trim());
    else params.delete("q");
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/");
  }

  function setFilter(next: string[] | null) {
    const normalized = next && next.length > 0 ? next : null;
    setVisibleTags(normalized);
    writeSavedFilters(normalized);
  }

  function toggleFilter(tag: string) {
    if (visibleTags === null) {
      setFilter([tag]);
      return;
    }
    const next = visibleTags.includes(tag)
      ? visibleTags.filter((item) => item !== tag)
      : [...visibleTags, tag];
    setFilter(next);
  }

  function persist(next: TocItems) {
    const payload = flattenTocItems(next).filter((item) => {
      const recipe = recipeById.get(item.id);
      if (!recipe) return false;
      const currentTag = recipe.role_tag?.trim() || null;
      return currentTag !== item.role_tag || (recipe.toc_order ?? 0) !== item.toc_order;
    });
    if (payload.length === 0) return;
    expectedLayout.current = layoutSignature(next);

    startTransition(async () => {
      const result = await updateTocLayout(payload);
      if (result.error) {
        expectedLayout.current = null;
        setError(result.error);
        setItems(recipesToTocItems(recipes));
        return;
      }
      setError(null);
      router.refresh();
    });
  }

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeItemId = String(active.id);
    const overId = String(over.id);
    const current = itemsRef.current;
    const from = findContainer(current, activeItemId);
    const to = findContainer(current, overId);
    if (!from || !to || from === to) return;

    setItems((prev) => {
      const fromList = prev[from] ?? [];
      const toList = prev[to] ?? [];
      if (!fromList.includes(activeItemId)) return prev;

      const overIndex = toList.indexOf(overId);
      const insertAt = overIndex >= 0 ? overIndex : toList.length;
      return {
        ...prev,
        [from]: fromList.filter((id) => id !== activeItemId),
        [to]: [...toList.slice(0, insertAt), activeItemId, ...toList.slice(insertAt)],
      };
    });
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) {
      persist(itemsRef.current);
      return;
    }

    const activeItemId = String(active.id);
    const overId = String(over.id);
    const current = itemsRef.current;
    const from = findContainer(current, activeItemId);
    const to = findContainer(current, overId);
    if (!from || !to) {
      persist(current);
      return;
    }

    if (from === to) {
      const list = current[from] ?? [];
      const oldIndex = list.indexOf(activeItemId);
      const newIndex = overId.startsWith(GROUP_PREFIX)
        ? list.length - 1
        : list.indexOf(overId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
        persist(current);
        return;
      }
      const next = { ...current, [from]: arrayMove(list, oldIndex, newIndex) };
      setItems(next);
      persist(next);
      return;
    }

    persist(current);
  }

  const hasRecipes = recipes.length > 0;
  const visibleGroupKeys = groupKeys.filter((key) => {
    if (visibleTagSet && !visibleTagSet.has(key)) return false;
    return (items[key] ?? []).length > 0;
  });

  function clearToday() {
    if (todayCount === 0) return;
    if (!window.confirm("今日セットをすべてクリアしますか？")) return;
    clearCookSession();
    setTodayCount(0);
  }

  return (
    <div className="space-y-5">
      <div className="field">
        <label htmlFor="ingredient-search">材料名・タイトル検索</label>
        <input
          id="ingredient-search"
          value={query}
          onChange={(e) => applySearch(e.target.value)}
          placeholder="例: 鶏もも / 豆腐"
          autoComplete="off"
        />
      </div>
      {todayCount > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 shadow-[var(--shadow)]">
          <p className="text-sm text-ink">
            今日に追加 <span className="font-semibold">{todayCount}</span> 件
          </p>
          <button
            type="button"
            className="btn btn-secondary min-h-9 px-3 text-sm"
            disabled={pending}
            onClick={clearToday}
          >
            一括クリア
          </button>
        </div>
      )}
      {hasRecipes && (
        <div className="space-y-2">
          <p className="text-xs font-bold tracking-[0.12em] text-ink-muted">分類</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="chip-filter"
              aria-pressed={visibleTags === null}
              onClick={() => setFilter(null)}
            >
              すべて
            </button>
            {filterOptions.map((tag) => (
              <button
                key={tag}
                type="button"
                className="chip-filter"
                aria-pressed={visibleTagSet?.has(tag) ?? false}
                onClick={() => toggleFilter(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
      {hasRecipes && !searching && (
        <p className="text-xs text-ink-muted">
          分類を押すとそのメニューだけ表示。⋮⋮で並べ替え。別の見出しへ移すと分類も変わります。
        </p>
      )}
      {hasRecipes && hasLegacyGroups && !searching && (
        <p className="text-xs text-ink-muted">
          古い分類のレシピは、新しい見出しへドラッグすると移せます。
        </p>
      )}
      {error && <p className="text-sm text-warn">{error}</p>}

      {!hasRecipes ? (
        <p className="rounded-xl border border-dashed border-line bg-surface px-4 py-8 text-center text-ink-muted">
          レシピがまだありません。追加から始められます。
        </p>
      ) : searching ? (
        <SearchResults recipes={filtered} visibleTags={visibleTags} />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          <div className={`space-y-5 ${pending ? "opacity-70" : ""}`}>
            {visibleGroupKeys.length === 0 && !activeId ? (
              <p className="rounded-xl border border-dashed border-line bg-surface px-4 py-8 text-center text-ink-muted">
                この分類にはまだレシピがありません。
              </p>
            ) : null}
            {groupKeys.map((key) => {
              const ids = items[key] ?? [];
              if (visibleTagSet && !visibleTagSet.has(key)) return null;
              const showEmptyDrop =
                ids.length === 0 && Boolean(activeId) && (!visibleTagSet || visibleTagSet.has(key));
              if (ids.length === 0 && !showEmptyDrop) return null;
              return (
                <TocGroup
                  key={key}
                  groupKey={key}
                  ids={ids}
                  recipeById={recipeById}
                />
              );
            })}
          </div>
          <DragOverlay>
            {activeRecipe ? (
              <div className="rounded-xl border border-gold bg-surface px-3 py-3 shadow-[var(--shadow)]">
                <p className="font-semibold">{activeRecipe.title}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

function SearchResults({
  recipes,
  visibleTags,
}: {
  recipes: Recipe[];
  visibleTags: string[] | null;
}) {
  const groups = groupRecipesForToc(recipes).filter(
    (group) => !visibleTags || visibleTags.includes(group.key),
  );

  if (groups.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line bg-surface px-4 py-8 text-center text-ink-muted">
        該当するレシピがありません。
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.key} className="space-y-2">
          <h2 className="sticky top-0 z-10 -mx-1 bg-bg/90 px-1 py-1 text-xs font-bold tracking-[0.12em] text-ink-muted backdrop-blur">
            {group.label}
          </h2>
          <ul className="overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow)]">
            {group.recipes.map((recipe, index) => (
              <li
                key={recipe.id}
                className={`px-3 py-3 ${index > 0 ? "border-t border-line" : ""}`}
              >
                <TocRowContent recipe={recipe} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function TocGroup({
  groupKey,
  ids,
  recipeById,
}: {
  groupKey: string;
  ids: string[];
  recipeById: Map<string, Recipe>;
}) {
  const droppableId = groupDroppableId(groupKey);
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });

  return (
    <section
      ref={setNodeRef}
      className={`space-y-2 rounded-xl ${isOver ? "ring-2 ring-accent/40" : ""}`}
    >
      <h2 className="sticky top-0 z-10 -mx-1 bg-bg/90 px-1 py-1 text-xs font-bold tracking-[0.12em] text-ink-muted backdrop-blur">
        {groupKey}
      </h2>
      <ul className="overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow)]">
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {ids.length === 0 ? (
            <li className="px-3 py-4 text-center text-xs text-ink-muted">
              ここにドロップ
            </li>
          ) : (
            ids.map((id, index) => {
              const recipe = recipeById.get(id);
              if (!recipe) return null;
              return (
                <SortableTocRow
                  key={id}
                  recipe={recipe}
                  showDivider={index > 0}
                />
              );
            })
          )}
        </SortableContext>
      </ul>
    </section>
  );
}

function SortableTocRow({
  recipe,
  showDivider,
}: {
  recipe: Recipe;
  showDivider: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: recipe.id });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`flex items-stretch gap-2 px-3 py-3 ${
        showDivider ? "border-t border-line" : ""
      } ${isDragging ? "relative z-10 opacity-50" : ""}`}
    >
      <button
        type="button"
        className="btn btn-secondary min-h-9 w-9 shrink-0 cursor-grab touch-none self-center px-0 text-sm active:cursor-grabbing"
        aria-label={`${recipe.title}を並べ替え`}
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      <TocRowContent recipe={recipe} />
    </li>
  );
}

function TocRowContent({ recipe }: { recipe: Recipe }) {
  const preview = ingredientPreview(recipe);
  return (
    <div className="flex min-w-0 flex-1 items-stretch gap-2">
      <Link href={`/recipes/${recipe.id}`} className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold leading-snug">{recipe.title}</span>
          {recipe.status === "draft" && (
            <span className="chip chip-draft">{statusLabel(recipe.status)}</span>
          )}
        </div>
        {preview && (
          <p className="mt-1 line-clamp-1 text-xs text-ink-muted">{preview}</p>
        )}
      </Link>
      <div className="flex shrink-0 items-center">
        <TodayPinButton recipeId={recipe.id} compact />
      </div>
    </div>
  );
}
