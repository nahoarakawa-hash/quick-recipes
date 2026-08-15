import { ROLE_TAG_PRESETS, type Recipe } from "@/lib/types";

export type RecipeGroup = {
  key: string;
  label: string;
  recipes: Recipe[];
};

export const UNCATEGORIZED_GROUP = "未分類";

export function tocGroupRank(key: string) {
  const presetIndex = (ROLE_TAG_PRESETS as readonly string[]).indexOf(key);
  if (presetIndex >= 0) return presetIndex;
  if (key === UNCATEGORIZED_GROUP) return 98;
  return 50;
}

export function compareTocGroupKeys(a: string, b: string) {
  const diff = tocGroupRank(a) - tocGroupRank(b);
  if (diff !== 0) return diff;
  return a.localeCompare(b, "ja");
}

function sortRecipesInTocGroup(list: Recipe[]): Recipe[] {
  return [...list].sort((x, y) => {
    const orderDiff = (x.toc_order ?? 0) - (y.toc_order ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return x.title.localeCompare(y.title, "ja");
  });
}

/** 目次用: 役割タグでグループ。主菜は魚/肉、副菜は和洋中 */
export function groupRecipesForToc(
  recipes: Recipe[],
  options?: { includeEmptyPresets?: boolean },
): RecipeGroup[] {
  const buckets = new Map<string, Recipe[]>();

  if (options?.includeEmptyPresets) {
    for (const tag of ROLE_TAG_PRESETS) {
      buckets.set(tag, []);
    }
    buckets.set(UNCATEGORIZED_GROUP, []);
  }

  for (const recipe of recipes) {
    const key = recipe.role_tag?.trim() || UNCATEGORIZED_GROUP;
    const list = buckets.get(key) ?? [];
    list.push(recipe);
    buckets.set(key, list);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => compareTocGroupKeys(a, b))
    .map(([key, list]) => ({
      key,
      label: key,
      recipes: sortRecipesInTocGroup(list),
    }));
}

export function recipesToTocItems(recipes: Recipe[]): Record<string, string[]> {
  const groups = groupRecipesForToc(recipes, { includeEmptyPresets: true });
  return Object.fromEntries(
    groups.map((group) => [group.key, group.recipes.map((recipe) => recipe.id)]),
  );
}

export function tocRoleTagFromGroupKey(key: string): string | null {
  return key === UNCATEGORIZED_GROUP ? null : key;
}

export function statusLabel(status: Recipe["status"]): string {
  return status === "draft" ? "下書き" : "完成";
}
