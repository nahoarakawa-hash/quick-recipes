"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Ingredient, Recipe, RecipeInput, Step } from "@/lib/types";

function normalizeIngredients(items: Ingredient[]): Ingredient[] {
  return items
    .map((item) => ({
      name: item.name.trim(),
      amount: item.amount.trim(),
      prep: item.prep?.trim() || undefined,
    }))
    .filter((item) => item.name.length > 0);
}

function normalizeSteps(items: Step[]): Step[] {
  return items
    .map((item, index) => ({
      order: index + 1,
      text: item.text.trim(),
    }))
    .filter((item) => item.text.length > 0);
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function listRecipes(options?: {
  includeArchived?: boolean;
  ingredientQuery?: string;
}): Promise<Recipe[]> {
  const { supabase, user } = await requireUser();
  let query = supabase
    .from("recipes")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (!options?.includeArchived) {
    query = query.eq("archived", false);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let recipes = (data ?? []) as Recipe[];
  const q = options?.ingredientQuery?.trim().toLowerCase();
  if (q) {
    recipes = recipes.filter((recipe) =>
      recipe.ingredients.some((ing) => ing.name.toLowerCase().includes(q)),
    );
  }
  return recipes;
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Recipe | null) ?? null;
}

export async function getRecipesByIds(ids: string[]): Promise<Recipe[]> {
  if (ids.length === 0) return [];
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("user_id", user.id)
    .eq("archived", false)
    .in("id", ids);
  if (error) throw new Error(error.message);
  const map = new Map((data as Recipe[]).map((r) => [r.id, r]));
  return ids.map((id) => map.get(id)).filter((r): r is Recipe => Boolean(r));
}

export async function createDraftRecipe(title: string) {
  const trimmed = title.trim();
  if (!trimmed) {
    return { error: "名前を入力してください" };
  }
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("recipes")
    .insert({
      user_id: user.id,
      title: trimmed,
      status: "draft",
      ingredients: [],
      steps: [],
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/");
  redirect(`/recipes/${data.id}/edit`);
}

export async function upsertRecipe(id: string | null, input: RecipeInput) {
  const title = input.title.trim();
  if (!title) return { error: "名前を入力してください" };

  const payload = {
    title,
    role_tag: input.role_tag?.trim() || null,
    status: input.status,
    ingredients: normalizeIngredients(input.ingredients),
    steps: normalizeSteps(input.steps),
    notes: input.notes?.trim() || null,
  };

  const { supabase, user } = await requireUser();

  if (id) {
    const { error } = await supabase
      .from("recipes")
      .update(payload)
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { error: error.message };
    revalidatePath("/");
    revalidatePath(`/recipes/${id}`);
    revalidatePath(`/recipes/${id}/edit`);
    redirect(`/recipes/${id}`);
  }

  const { data, error } = await supabase
    .from("recipes")
    .insert({ ...payload, user_id: user.id })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/");
  redirect(`/recipes/${data.id}`);
}

export async function updateTocLayout(
  items: { id: string; role_tag: string | null; toc_order: number }[],
): Promise<{ error?: string }> {
  if (items.length === 0) return {};
  if (items.length > 500) return { error: "更新件数が多すぎます" };

  const { supabase, user } = await requireUser();
  const results = await Promise.all(
    items.map((item) =>
      supabase
        .from("recipes")
        .update({
          role_tag: item.role_tag,
          toc_order: item.toc_order,
        })
        .eq("id", item.id)
        .eq("user_id", user.id),
    ),
  );

  const firstError = results.find((result) => result.error)?.error;
  if (firstError) {
    if (firstError.message.includes("toc_order")) {
      return {
        error:
          "目次の並びを保存できません。Supabase の SQL Editor で 002_toc_order.sql を実行してください。",
      };
    }
    return { error: firstError.message };
  }

  revalidatePath("/");
  revalidatePath("/today");
  revalidatePath("/cook");
  for (const item of items) {
    revalidatePath(`/recipes/${item.id}`);
    revalidatePath(`/recipes/${item.id}/edit`);
  }
  return {};
}

export async function archiveRecipe(id: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("recipes")
    .update({ archived: true })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath(`/recipes/${id}`);
  redirect("/");
}

export async function restoreRecipe(id: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("recipes")
    .update({ archived: false })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath(`/recipes/${id}`);
  return { ok: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
