export interface ParsedRecipe {
  title: string;
  description?: string;
  servings?: number;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  totalTimeMinutes?: number;
  imageUrl?: string;
  language?: string;
  ingredients: {
    quantity?: number;
    unit?: string;
    name: string;
    preparation?: string;
  }[];
  instructions: {
    step: number;
    text: string;
  }[];
}

function parseDuration(iso8601: string | undefined): number | undefined {
  if (!iso8601) return undefined;
  const match = iso8601.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return undefined;
  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  return hours * 60 + minutes || undefined;
}

function parseIngredientString(s: string): {
  quantity?: number;
  unit?: string;
  name: string;
  preparation?: string;
} {
  // Simple regex: tries to match "1 1/2 cups flour, sifted"
  const match = s.match(
    /^([\d./½¼¾⅓⅔⅛\s]+)?\s*(tbsp|tsp|tablespoons?|teaspoons?|cups?|oz|ounces?|lbs?|pounds?|kg|g|grams?|ml|liters?|l|pinch|cloves?|pieces?|slices?)?\s*[.]?\s*(.+)$/i
  );
  if (!match) return { name: s.trim() };

  let quantity: number | undefined;
  const rawQty = match[1]?.trim();
  if (rawQty) {
    // Handle unicode fractions
    const fractionMap: Record<string, number> = {
      "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 0.333, "⅔": 0.667, "⅛": 0.125,
    };
    let q = rawQty;
    for (const [frac, val] of Object.entries(fractionMap)) {
      q = q.replace(frac, String(val));
    }
    // Handle "1 1/2" style fractions
    const parts = q.trim().split(/\s+/);
    quantity = parts.reduce((sum, p) => {
      if (p.includes("/")) {
        const [num, den] = p.split("/");
        return sum + parseInt(num) / parseInt(den);
      }
      return sum + parseFloat(p);
    }, 0);
    if (isNaN(quantity)) quantity = undefined;
  }

  const unit = match[2]?.trim() || undefined;
  const rest = match[3]?.trim() || s.trim();

  // Split "flour, sifted" into name + preparation
  const commaIdx = rest.indexOf(",");
  if (commaIdx > 0) {
    return {
      quantity,
      unit,
      name: rest.slice(0, commaIdx).trim(),
      preparation: rest.slice(commaIdx + 1).trim(),
    };
  }

  return { quantity, unit, name: rest };
}

export function extractJsonLd(html: string): ParsedRecipe | null {
  // Find all JSON-LD blocks
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  const candidates: unknown[] = [];

  while ((match = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed)) {
        candidates.push(...parsed);
      } else if (parsed["@graph"]) {
        candidates.push(...parsed["@graph"]);
      } else {
        candidates.push(parsed);
      }
    } catch {
      // skip malformed JSON-LD
    }
  }

  // Find the Recipe type
  const recipe = candidates.find(
    (c: unknown) =>
      (c as { "@type"?: string | string[] })["@type"] === "Recipe" ||
      (Array.isArray((c as { "@type"?: string | string[] })["@type"]) &&
        ((c as { "@type"?: string[] })["@type"] as string[]).includes("Recipe"))
  ) as Record<string, unknown> | undefined;

  if (!recipe) return null;

  // Parse instructions - can be string, array of strings, or array of HowToStep
  let instructions: { step: number; text: string }[] = [];
  const rawInstructions = recipe.recipeInstructions;
  if (typeof rawInstructions === "string") {
    instructions = rawInstructions
      .split(/\n+/)
      .filter(Boolean)
      .map((text, i) => ({ step: i + 1, text: text.trim() }));
  } else if (Array.isArray(rawInstructions)) {
    instructions = rawInstructions.map((inst, i) => {
      if (typeof inst === "string") return { step: i + 1, text: inst.trim() };
      if (inst.text) return { step: i + 1, text: inst.text.trim() };
      if (inst.itemListElement) {
        // HowToSection
        return inst.itemListElement.map(
          (sub: { text: string }, j: number) => ({
            step: i + j + 1,
            text: sub.text?.trim(),
          })
        );
      }
      return { step: i + 1, text: String(inst) };
    }).flat();
  }

  // Parse ingredients
  const rawIngredients = (recipe.recipeIngredient ?? []) as string[];
  const ingredients = rawIngredients.map((s) => parseIngredientString(s));

  // Parse servings
  let servings: number | undefined;
  const rawYield = recipe.recipeYield;
  if (typeof rawYield === "number") {
    servings = rawYield;
  } else if (typeof rawYield === "string") {
    const m = rawYield.match(/(\d+)/);
    if (m) servings = parseInt(m[1]);
  } else if (Array.isArray(rawYield) && rawYield.length > 0) {
    const m = String(rawYield[0]).match(/(\d+)/);
    if (m) servings = parseInt(m[1]);
  }

  // Parse image
  let imageUrl: string | undefined;
  if (typeof recipe.image === "string") {
    imageUrl = recipe.image;
  } else if (Array.isArray(recipe.image)) {
    imageUrl = typeof recipe.image[0] === "string" ? recipe.image[0] : (recipe.image[0] as { url?: string })?.url;
  } else if (recipe.image && typeof recipe.image === "object") {
    imageUrl = (recipe.image as { url?: string }).url;
  }

  return {
    title: String(recipe.name ?? ""),
    description: recipe.description ? String(recipe.description) : undefined,
    servings,
    prepTimeMinutes: parseDuration(recipe.prepTime as string | undefined),
    cookTimeMinutes: parseDuration(recipe.cookTime as string | undefined),
    totalTimeMinutes: parseDuration(recipe.totalTime as string | undefined),
    imageUrl,
    language: recipe.inLanguage ? String(recipe.inLanguage) : undefined,
    ingredients,
    instructions: instructions.filter((i) => i.text),
  };
}
