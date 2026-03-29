// Density table (g per ml) for common ingredients
const DENSITY_TABLE: Record<string, number> = {
  water: 1.0,
  milk: 1.03,
  oil: 0.92,
  "olive oil": 0.91,
  "vegetable oil": 0.92,
  "canola oil": 0.92,
  "coconut oil": 0.92,
  honey: 1.42,
  "heavy cream": 1.01,
  cream: 1.01,
  "sour cream": 1.05,
  yogurt: 1.03,
  butter: 0.91,
  "maple syrup": 1.32,
  "corn syrup": 1.38,
  molasses: 1.42,
  "soy sauce": 1.08,
  vinegar: 1.01,
  "lemon juice": 1.03,
  "tomato sauce": 1.04,
  flour: 0.53,
  "all-purpose flour": 0.53,
  "bread flour": 0.55,
  "whole wheat flour": 0.51,
  sugar: 0.85,
  "brown sugar": 0.83,
  "powdered sugar": 0.56,
  "cocoa powder": 0.43,
  cornstarch: 0.54,
  "baking powder": 0.77,
  "baking soda": 0.69,
  salt: 1.22,
  rice: 0.75,
  oats: 0.41,
  "almond flour": 0.46,
  "coconut flour": 0.48,
};

// Volume to ml conversion
const VOLUME_TO_ML: Record<string, number> = {
  cup: 236.588,
  cups: 236.588,
  "fluid ounce": 29.5735,
  "fluid ounces": 29.5735,
  "fl oz": 29.5735,
  pint: 473.176,
  pints: 473.176,
  quart: 946.353,
  quarts: 946.353,
  gallon: 3785.41,
  gallons: 3785.41,
  liter: 1000,
  liters: 1000,
  l: 1000,
  ml: 1,
  milliliter: 1,
  milliliters: 1,
};

// Weight to grams conversion
const WEIGHT_TO_G: Record<string, number> = {
  oz: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
  lb: 453.592,
  lbs: 453.592,
  pound: 453.592,
  pounds: 453.592,
  kg: 1000,
  kilogram: 1000,
  kilograms: 1000,
  g: 1,
  gram: 1,
  grams: 1,
};

// Units to keep as-is
const KEEP_UNITS = new Set([
  "tsp", "teaspoon", "teaspoons",
  "tbsp", "tablespoon", "tablespoons",
  "pinch", "pinches",
  "clove", "cloves",
  "piece", "pieces",
  "slice", "slices",
  "bunch", "bunches",
  "sprig", "sprigs",
  "head", "heads",
  "stalk", "stalks",
  "can", "cans",
  "package", "packages",
  "bag", "bags",
]);

// Canonical unit names
const CANONICAL: Record<string, string> = {
  teaspoon: "tsp", teaspoons: "tsp",
  tablespoon: "tbsp", tablespoons: "tbsp",
  gram: "g", grams: "g",
  kilogram: "kg", kilograms: "kg",
  milliliter: "ml", milliliters: "ml",
  liter: "l", liters: "l",
  ounce: "oz", ounces: "oz",
  pound: "lb", pounds: "lb", lbs: "lb",
  "fluid ounce": "fl oz", "fluid ounces": "fl oz",
};

export function normalizeIngredient(ingredient: {
  quantity?: number;
  unit?: string;
  name: string;
}): {
  quantity?: number;
  unit?: string;
  originalQuantity?: number;
  originalUnit?: string;
} {
  const { quantity, unit, name } = ingredient;
  if (!quantity || !unit) {
    return { quantity, unit: unit ?? undefined };
  }

  const unitLower = unit.toLowerCase().trim();
  const nameLower = name.toLowerCase().trim();

  // Keep tsp/tbsp and countable units
  if (KEEP_UNITS.has(unitLower)) {
    const canonical = CANONICAL[unitLower] ?? unitLower;
    return { quantity, unit: canonical };
  }

  // Weight conversion → grams
  if (WEIGHT_TO_G[unitLower]) {
    const grams = Math.round(quantity * WEIGHT_TO_G[unitLower]);
    return {
      quantity: grams,
      unit: "g",
      originalQuantity: quantity,
      originalUnit: unit,
    };
  }

  // Volume conversion → try to convert to grams via density
  if (VOLUME_TO_ML[unitLower]) {
    const ml = quantity * VOLUME_TO_ML[unitLower];

    // Look up density by ingredient name
    const density =
      DENSITY_TABLE[nameLower] ??
      Object.entries(DENSITY_TABLE).find(([key]) =>
        nameLower.includes(key)
      )?.[1];

    if (density) {
      const grams = Math.round(ml * density);
      return {
        quantity: grams,
        unit: "g",
        originalQuantity: quantity,
        originalUnit: unit,
      };
    }

    // No density found — keep as ml
    return {
      quantity: Math.round(ml),
      unit: "ml",
      originalQuantity: quantity,
      originalUnit: unit,
    };
  }

  // Unknown unit — keep as-is
  const canonical = CANONICAL[unitLower] ?? unitLower;
  return { quantity, unit: canonical };
}
