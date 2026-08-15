import type { CookSession } from "@/lib/types";

const STORAGE_KEY = "quick-recipes:cook-session";

export function loadCookSession(): CookSession {
  if (typeof window === "undefined") return { recipeIds: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { recipeIds: [] };
    const parsed = JSON.parse(raw) as CookSession;
    if (!Array.isArray(parsed.recipeIds)) return { recipeIds: [] };
    return { recipeIds: parsed.recipeIds.filter((id) => typeof id === "string") };
  } catch {
    return { recipeIds: [] };
  }
}

export function saveCookSession(session: CookSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event("cook-session-change"));
}

export function toggleRecipeInSession(recipeId: string): CookSession {
  const current = loadCookSession();
  const exists = current.recipeIds.includes(recipeId);
  const next: CookSession = {
    recipeIds: exists
      ? current.recipeIds.filter((id) => id !== recipeId)
      : [...current.recipeIds, recipeId],
  };
  saveCookSession(next);
  return next;
}

export function removeRecipeFromSession(recipeId: string): CookSession {
  const current = loadCookSession();
  const next: CookSession = {
    recipeIds: current.recipeIds.filter((id) => id !== recipeId),
  };
  saveCookSession(next);
  return next;
}

export function clearCookSession(): void {
  saveCookSession({ recipeIds: [] });
}

export function reorderCookSession(recipeIds: string[]): CookSession {
  const next = { recipeIds };
  saveCookSession(next);
  return next;
}
