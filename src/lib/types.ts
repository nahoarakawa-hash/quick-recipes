export type RecipeStatus = "draft" | "ready";

export type Ingredient = {
  name: string;
  amount: string;
  prep?: string;
};

export type Step = {
  order: number;
  text: string;
};

export type Recipe = {
  id: string;
  user_id: string;
  title: string;
  role_tag: string | null;
  status: RecipeStatus;
  ingredients: Ingredient[];
  steps: Step[];
  notes: string | null;
  archived: boolean;
  toc_order: number;
  created_at: string;
  updated_at: string;
};

export type RecipeInput = {
  title: string;
  role_tag?: string | null;
  status: RecipeStatus;
  ingredients: Ingredient[];
  steps: Step[];
  notes?: string | null;
};

/** 端末ローカルの今日セット */
export type CookSession = {
  recipeIds: string[];
};

export const ROLE_TAG_PRESETS = [
  "主菜・魚",
  "主菜・肉",
  "副菜・和風",
  "副菜・洋風",
  "副菜・中華",
  "汁物",
  "主食",
  "その他",
] as const;
