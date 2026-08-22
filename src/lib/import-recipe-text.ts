import type { Ingredient, Step } from "@/lib/types";

export type ParsedRecipeText = {
  title: string;
  ingredients: Ingredient[];
  steps: Step[];
  notes: string | null;
};

type Section = "title" | "ingredients" | "steps" | "notes";

const UNIT =
  /(?:[0-9].{0,10}(?:g|kg|ml|l|cc|グラム|リットル|個|本|枚|杯|片|丁|缶|袋|パック|束|房|切れ|合|カップ|株|欠|振|掬|升|玉|尾)|(?:大さじ|小さじ|少々|適量|お好み|ひとつまみ)\s*[0-9.+/-]*)/;

const STEP_START =
  /^(?:[0-9０-９]{1,2}|[①②③④⑤⑥⑦⑧⑨⑩⑪⑫])[\.．、\)）]?\s*|^[●◯○▪・]\s*/;

const BULLET = /^[・●○◯▪◦‧\-－ー*＊◆■□▶→]\s*/;

function toHalfWidthAscii(input: string) {
  return input.replace(/[\uFF01-\uFF5E]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0),
  );
}

function preprocessOcrText(raw: string) {
  return toHalfWidthAscii(
    raw
      .replace(/\r\n/g, "\n")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\u00a0/g, " ")
      .replace(/[：]/g, ":")
      .replace(/[（]/g, "(")
      .replace(/[）]/g, ")")
      .replace(/[，]/g, ",")
      .replace(/[．]/g, ".")
      .replace(/[ｇ]/g, "g")
      .replace(/[ｍ]/g, "m")
      .replace(/[ｌ]/g, "l")
      .replace(/[＋]/g, "+")
      .replace(/[－]/g, "-")
      .replace(/[／]/g, "/")
      .replace(/[　]+/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n"),
  );
}

function normalizeLine(line: string) {
  return line.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim();
}

function headingOf(line: string): { section: Exclude<Section, "title">; rest: string } | null {
  const m = line.match(
    /^(?:【|\[|［|<])?(材料|作り方|作りかた|手順|調理方法|メモ|ポイント|備考|コツ|下準備|用意)(?:\([^)]*\))?(?:】|\]|］|>)?\s*[:：]?\s*(.*)$/,
  );
  if (!m) return null;
  const key = m[1];
  const rest = m[2].trim();
  if (rest && /[。！？]/.test(rest) && rest.length > 24) return null;
  if (key === "材料" || key === "用意" || key === "下準備") {
    return { section: "ingredients", rest };
  }
  if (key === "作り方" || key === "作りかた" || key === "手順" || key === "調理方法") {
    return { section: "steps", rest };
  }
  return { section: "notes", rest };
}

function isServings(text: string) {
  return /[0-9]+\s*人分?|[0-9]+\s*人前|\([^)]*[0-9]+[^)]*分[^)]*\)/.test(text);
}

function looksLikeStepLine(line: string) {
  const t = line.replace(BULLET, "").trim();
  if (STEP_START.test(t)) return true;
  if (/[。！？]/.test(t)) return true;
  if (/(して|します|ください|する|焼|切|入|混|煮|茹|炒|加|待|取|出|予熱|温|冷|盛|完成)/.test(t)) {
    return t.length > 10;
  }
  return false;
}

function looksLikeIngredient(line: string) {
  const t = line.replace(BULLET, "").trim();
  if (!t || t.length > 56) return false;
  if (headingOf(t)) return false;
  if (looksLikeStepLine(t)) return false;
  if (UNIT.test(t)) return true;
  if (/\s{2,}|\t/.test(line) && t.length <= 44) return true;
  if (/^.+\s+(?:\d|大さじ|小さじ|少々|適量|お好み|ひとつまみ)/.test(t)) return true;
  if (t.length <= 20 && !/(して|する|焼く|切る|加える|混ぜ|入れる|煮る|茹で)$/.test(t)) {
    return true;
  }
  return false;
}

function splitNameAndAmount(text: string): Ingredient | null {
  const parenAmount = text.match(/^(.+?)[(（]([^)）]+)[)）]\s*((?:\d|大さじ|小さじ|少々|適量).*)$/);
  if (parenAmount) {
    return {
      name: parenAmount[1].trim(),
      amount: parenAmount[3].trim(),
      prep: parenAmount[2].trim() || undefined,
    };
  }

  const parenPrepOnly = text.match(/^(.+?)[(（]([^)）]+)[)）]$/);
  if (parenPrepOnly && !UNIT.test(parenPrepOnly[2])) {
    return {
      name: parenPrepOnly[1].trim(),
      amount: "",
      prep: parenPrepOnly[2].trim(),
    };
  }

  const spaced = text.split(/\s{2,}|\t|　+/).map((part) => part.trim()).filter(Boolean);
  if (spaced.length >= 2) {
    return {
      name: spaced[0],
      amount: spaced[1],
      prep: spaced.slice(2).join(" ") || undefined,
    };
  }

  const withSpace = text.match(
    /^(.+?)\s+((?:\d|大さじ|小さじ|少々|適量|お好み|ひとつまみ).+)$/,
  );
  if (withSpace) {
    return { name: withSpace[1].trim(), amount: withSpace[2].trim() };
  }

  const glued = text.match(
    /^(.+?)([0-9].{0,14}(?:g|kg|ml|l|cc|グラム|個|本|枚|杯|片|缶|袋|パック|束|合|カップ|株|玉|尾)|大さじ\s*[0-9.+/-]+.*|小さじ\s*[0-9.+/-]+.*|少々|適量|お好み)$/,
  );
  if (glued) {
    return { name: glued[1].trim(), amount: glued[2].trim() };
  }

  return { name: text, amount: "" };
}

function parseIngredientLine(line: string): Ingredient | null {
  const text = line
    .replace(BULLET, "")
    .replace(/^[0-9０-９]{1,2}[\.．、)）]\s*/, "")
    .trim();
  if (!text || headingOf(text)) return null;
  if (looksLikeStepLine(text)) return null;
  return splitNameAndAmount(text);
}

function toIngredients(lines: string[]): Ingredient[] {
  return lines
    .map(parseIngredientLine)
    .filter((item): item is Ingredient => Boolean(item));
}

function takeLeadingIngredients(lines: string[]): { ingredients: Ingredient[]; rest: string[] } {
  const ingredients: Ingredient[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line) {
      index += 1;
      continue;
    }
    if (!looksLikeIngredient(line)) break;
    const parsed = parseIngredientLine(line);
    if (!parsed) break;
    ingredients.push(parsed);
    index += 1;
  }
  return { ingredients, rest: lines.slice(index) };
}

function splitInlineNumberedSteps(text: string): string[] {
  const parts = text
    .split(/(?=(?:^|\n)\s*[0-9０-９]{1,2}[\.．、\)）]\s*)/)
    .map((part) => part.replace(/^[0-9０-９]{1,2}[\.．、\)）]\s*/, "").trim())
    .filter(Boolean);
  return parts.length > 1 ? parts : [];
}

function splitSteps(text: string): Step[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const lines = trimmed.split("\n").map(normalizeLine);
  const blocks: string[] = [];
  let current = "";

  for (const line of lines) {
    if (!line) continue;
    const stripped = line.replace(BULLET, "");
    const isNewStep = STEP_START.test(stripped);
    if (isNewStep && current) {
      blocks.push(current.trim());
      current = stripped.replace(STEP_START, "").trim();
    } else if (isNewStep) {
      current = stripped.replace(STEP_START, "").trim();
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }
  if (current.trim()) blocks.push(current.trim());

  if (blocks.length <= 1) {
    const inline = splitInlineNumberedSteps(trimmed);
    if (inline.length > 1) {
      return inline.map((block, index) => ({ order: index + 1, text: block }));
    }
  }

  if (blocks.length === 0) {
    return [{ order: 1, text: trimmed }];
  }

  return blocks.map((block, index) => ({ order: index + 1, text: block }));
}

export function parseRecipeText(raw: string): ParsedRecipeText | { error: string } {
  const lines = preprocessOcrText(raw).split("\n").map(normalizeLine);

  if (!lines.some((line) => line.length > 0)) {
    return { error: "テキストを貼ってください" };
  }

  const buckets: Record<Section, string[]> = {
    title: [],
    ingredients: [],
    steps: [],
    notes: [],
  };

  let section: Section = "title";
  let sawHeading = false;

  for (const line of lines) {
    if (!line) {
      if (section !== "title") buckets[section].push("");
      continue;
    }
    const heading = headingOf(line);
    if (heading) {
      section = heading.section;
      sawHeading = true;
      if (heading.rest && !isServings(heading.rest)) {
        buckets[section].push(heading.rest);
      }
      continue;
    }
    buckets[section].push(line);
  }

  const titleLines = buckets.title.filter(Boolean);
  let title = titleLines[0] ?? "";
  let ingredients = toIngredients(buckets.ingredients);
  let stepLines = buckets.steps;

  if (titleLines.length > 1) {
    const split = takeLeadingIngredients(titleLines.slice(1));
    ingredients = [...split.ingredients, ...ingredients];
    if (split.rest.length > 0) {
      stepLines = [...split.rest, ...stepLines];
    }
  }

  let stepText = stepLines.join("\n").trim();
  const notes = buckets.notes.join("\n").trim() || null;

  if (!sawHeading) {
    const body = lines.filter((line) => line.length > 0);
    title = body[0] ?? "";
    const split = takeLeadingIngredients(body.slice(1));
    ingredients = split.ingredients;
    stepText = split.rest.join("\n").trim();
  } else if (!title) {
    title = ingredients[0]?.name || "取り込み";
  }

  let steps = splitSteps(stepText);

  if (steps.length === 0 && ingredients.length === 0) {
    const rest = lines.filter((line) => line && line !== title).join("\n").trim();
    if (rest) steps = splitSteps(rest);
  }

  if (!title.trim()) {
    return { error: "名前になる行が見つかりませんでした" };
  }

  return {
    title: title.trim().slice(0, 80),
    ingredients,
    steps,
    notes,
  };
}
