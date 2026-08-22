"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { upsertRecipe } from "@/lib/actions/recipes";
import {
  ROLE_TAG_PRESETS,
  type Ingredient,
  type Recipe,
  type RecipeStatus,
  type Step,
} from "@/lib/types";

type Props = {
  recipe?: Recipe;
};

type IngredientRow = Ingredient & { id: string };
type StepRow = Step & { id: string };

function newId() {
  return crypto.randomUUID();
}

function emptyIngredient(): IngredientRow {
  return { id: newId(), name: "", amount: "", prep: "" };
}

function emptyStep(order: number): StepRow {
  return { id: newId(), order, text: "" };
}

function isBlankIngredient(row: IngredientRow) {
  return !row.name.trim() && !row.amount.trim() && !(row.prep ?? "").trim();
}

function withTrailingEmpty(rows: IngredientRow[]): IngredientRow[] {
  const last = rows[rows.length - 1];
  if (!last || !isBlankIngredient(last)) {
    return [...rows, emptyIngredient()];
  }
  let end = rows.length - 1;
  while (end > 0 && isBlankIngredient(rows[end - 1])) {
    end -= 1;
  }
  return rows.slice(0, end + 1);
}

function isBlankStep(row: StepRow) {
  return !row.text.trim();
}

function withTrailingEmptySteps(rows: StepRow[]): StepRow[] {
  const last = rows[rows.length - 1];
  let next: StepRow[];
  if (!last || !isBlankStep(last)) {
    next = [...rows, emptyStep(rows.length + 1)];
  } else {
    let end = rows.length - 1;
    while (end > 0 && isBlankStep(rows[end - 1])) {
      end -= 1;
    }
    next = rows.slice(0, end + 1);
  }
  return next.map((item, i) => ({ ...item, order: i + 1 }));
}

function DragHandle({
  attributes,
  listeners,
  label,
}: {
  attributes: React.HTMLAttributes<HTMLButtonElement>;
  listeners?: React.HTMLAttributes<HTMLButtonElement>;
  label: string;
}) {
  return (
    <button
      type="button"
      className="btn btn-secondary min-h-9 w-9 shrink-0 cursor-grab touch-none px-0 text-sm active:cursor-grabbing"
      aria-label={label}
      {...attributes}
      {...listeners}
    >
      ⋮⋮
    </button>
  );
}

function SortableIngredientRow({
  row,
  index,
  onChange,
  onRemove,
  onEnter,
}: {
  row: IngredientRow;
  index: number;
  onChange: (patch: Partial<Ingredient>) => void;
  onRemove: () => void;
  onEnter: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.id });

  function handleEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    e.preventDefault();
    onEnter();
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`grid grid-cols-[auto_1fr_auto] gap-2 rounded-xl border border-line/70 bg-bg/30 p-2.5 sm:grid-cols-[auto_minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_auto] sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 ${
        isDragging ? "relative z-10 opacity-80" : ""
      }`}
    >
      <DragHandle
        attributes={attributes}
        listeners={listeners}
        label="材料の並べ替え"
      />
      <button
        type="button"
        className="btn btn-secondary col-start-3 row-start-1 min-h-9 px-2 text-sm sm:col-start-5"
        onClick={onRemove}
        aria-label="材料行を削除"
      >
        ×
      </button>
      <input
        aria-label={`材料名 ${index + 1}`}
        placeholder="名前"
        value={row.name}
        onChange={(e) => onChange({ name: e.target.value })}
        onKeyDown={handleEnter}
        data-ing-name={row.id}
        className="col-span-3 col-start-1 row-start-2 min-w-0 rounded-lg border border-line bg-surface px-2.5 py-2 sm:col-span-1 sm:col-start-2 sm:row-start-1"
      />
      <input
        aria-label={`分量 ${index + 1}`}
        placeholder="分量"
        value={row.amount}
        onChange={(e) => onChange({ amount: e.target.value })}
        onKeyDown={handleEnter}
        className="col-start-1 row-start-3 min-w-0 rounded-lg border border-line bg-surface px-2.5 py-2 sm:col-start-3 sm:row-start-1"
      />
      <input
        aria-label={`切り方 ${index + 1}`}
        placeholder="切り方"
        value={row.prep ?? ""}
        onChange={(e) => onChange({ prep: e.target.value })}
        onKeyDown={handleEnter}
        className="col-span-2 col-start-2 row-start-3 min-w-0 rounded-lg border border-line bg-surface px-2.5 py-2 sm:col-span-1 sm:col-start-4 sm:row-start-1"
      />
    </div>
  );
}

function SortableStepRow({
  row,
  index,
  onChange,
  onRemove,
  onEnter,
}: {
  row: StepRow;
  index: number;
  onChange: (text: string) => void;
  onRemove: () => void;
  onEnter: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.id });

  function handleEnter(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    onEnter();
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`flex gap-2 ${isDragging ? "relative z-10 opacity-80" : ""}`}
    >
      <DragHandle attributes={attributes} listeners={listeners} label="手順の並べ替え" />
      <span className="mt-2 w-6 shrink-0 text-center text-sm font-bold text-ink-muted">
        {index + 1}
      </span>
      <textarea
        aria-label={`手順 ${index + 1}`}
        rows={Math.min(16, Math.max(2, row.text.split("\n").length + 1))}
        value={row.text}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleEnter}
        data-step-text={row.id}
        placeholder="例: 醤油大さじ2・みりん大さじ1で照りを付ける。中火5分。"
        className="min-h-[4.5rem] flex-1 rounded-lg border border-line bg-surface px-2.5 py-2"
      />
      <button
        type="button"
        className="btn btn-secondary mt-0 self-start min-h-9 px-2 text-sm"
        onClick={onRemove}
        aria-label="手順を削除"
      >
        ×
      </button>
    </div>
  );
}

export function RecipeForm({ recipe }: Props) {
  const [title, setTitle] = useState(recipe?.title ?? "");
  const [roleTag, setRoleTag] = useState(recipe?.role_tag ?? "");
  const [status, setStatus] = useState<RecipeStatus>(recipe?.status ?? "draft");
  const [notes, setNotes] = useState(recipe?.notes ?? "");
  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    withTrailingEmpty(
      recipe?.ingredients?.length
        ? recipe.ingredients.map((item) => ({ ...item, id: newId() }))
        : [],
    ),
  );
  const [steps, setSteps] = useState<StepRow[]>(
    withTrailingEmptySteps(
      recipe?.steps?.length
        ? recipe.steps.map((item) => ({ ...item, id: newId() }))
        : [],
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [focusIngredientId, setFocusIngredientId] = useState<string | null>(null);
  const [focusStepId, setFocusStepId] = useState<string | null>(null);

  const roleTagOptions = useMemo(() => {
    const current = roleTag.trim();
    if (current && !(ROLE_TAG_PRESETS as readonly string[]).includes(current)) {
      return [current, ...ROLE_TAG_PRESETS];
    }
    return [...ROLE_TAG_PRESETS];
  }, [roleTag]);

  useEffect(() => {
    if (!focusIngredientId) return;
    const el = document.querySelector<HTMLInputElement>(
      `[data-ing-name="${focusIngredientId}"]`,
    );
    el?.focus();
    setFocusIngredientId(null);
  }, [focusIngredientId, ingredients]);

  useEffect(() => {
    if (!focusStepId) return;
    const el = document.querySelector<HTMLTextAreaElement>(
      `[data-step-text="${focusStepId}"]`,
    );
    el?.focus();
    setFocusStepId(null);
  }, [focusStepId, steps]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function updateIngredient(id: string, patch: Partial<Ingredient>) {
    setIngredients((prev) =>
      withTrailingEmpty(
        prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      ),
    );
  }

  function goToNextIngredient(id: string) {
    setIngredients((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index < 0) return prev;
      if (index >= prev.length - 1) {
        const created = emptyIngredient();
        setFocusIngredientId(created.id);
        return [...prev, created];
      }
      setFocusIngredientId(prev[index + 1].id);
      return prev;
    });
  }

  function updateStep(id: string, text: string) {
    setSteps((prev) =>
      withTrailingEmptySteps(
        prev.map((item) => (item.id === id ? { ...item, text } : item)),
      ),
    );
  }

  function goToNextStep(id: string) {
    setSteps((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index < 0) return prev;
      if (index >= prev.length - 1) {
        const created = emptyStep(prev.length + 1);
        setFocusStepId(created.id);
        return [...prev, created];
      }
      setFocusStepId(prev[index + 1].id);
      return prev;
    });
  }

  function onIngredientDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setIngredients((prev) => {
      const oldIndex = prev.findIndex((item) => item.id === active.id);
      const newIndex = prev.findIndex((item) => item.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return withTrailingEmpty(arrayMove(prev, oldIndex, newIndex));
    });
  }

  function onStepDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSteps((prev) => {
      const oldIndex = prev.findIndex((item) => item.id === active.id);
      const newIndex = prev.findIndex((item) => item.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return withTrailingEmptySteps(arrayMove(prev, oldIndex, newIndex));
    });
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await upsertRecipe(recipe?.id ?? null, {
            title,
            role_tag: roleTag,
            status,
            ingredients,
            steps,
            notes,
          });
          if (result?.error) setError(result.error);
        });
      }}
    >
      <div className="field">
        <label htmlFor="title">名前</label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="field">
          <label htmlFor="roleTag">分類</label>
          <select
            id="roleTag"
            value={roleTag}
            onChange={(e) => setRoleTag(e.target.value)}
          >
            <option value="">未分類</option>
            {roleTagOptions.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="status">状態</label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as RecipeStatus)}
          >
            <option value="draft">下書き</option>
            <option value="ready">完成</option>
          </select>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold tracking-wide text-ink-muted">材料</h2>
            <p className="text-xs text-ink-muted">
              名前・分量・切り方。最後の行に書くと次の空行が出ます。Enterで次の行へ。
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary min-h-9 px-3 text-sm"
            onClick={() =>
              setIngredients((prev) => withTrailingEmpty([...prev, emptyIngredient()]))
            }
          >
            行を追加
          </button>
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onIngredientDragEnd}
        >
          <SortableContext
            items={ingredients.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3 sm:space-y-2">
              {ingredients.map((ing, index) => (
                <SortableIngredientRow
                  key={ing.id}
                  row={ing}
                  index={index}
                  onChange={(patch) => updateIngredient(ing.id, patch)}
                  onEnter={() => goToNextIngredient(ing.id)}
                  onRemove={() =>
                    setIngredients((prev) =>
                      withTrailingEmpty(prev.filter((item) => item.id !== ing.id)),
                    )
                  }
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold tracking-wide text-ink-muted">手順</h2>
            <p className="text-xs text-ink-muted">
              最後の手順に書くと次の空欄が出ます。Enterで次へ、Shift+Enterで改行。
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary min-h-9 px-3 text-sm"
            onClick={() =>
              setSteps((prev) =>
                withTrailingEmptySteps([...prev, emptyStep(prev.length + 1)]),
              )
            }
          >
            手順を追加
          </button>
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onStepDragEnd}
        >
          <SortableContext
            items={steps.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {steps.map((step, index) => (
                <SortableStepRow
                  key={step.id}
                  row={step}
                  index={index}
                  onChange={(text) => updateStep(step.id, text)}
                  onEnter={() => goToNextStep(step.id)}
                  onRemove={() =>
                    setSteps((prev) =>
                      withTrailingEmptySteps(prev.filter((item) => item.id !== step.id)),
                    )
                  }
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </section>

      <div className="field">
        <label htmlFor="notes">メモ（任意）</label>
        <textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="火加減の癖、代用、失敗メモなど"
        />
      </div>

      {error && <p className="text-sm text-warn">{error}</p>}

      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "保存中…" : "保存する"}
      </button>
    </form>
  );
}
