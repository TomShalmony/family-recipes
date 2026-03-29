import { GoogleGenAI } from "@google/genai";
import type { ParsedRecipe } from "./extract-jsonld";

function getAI() {
  return new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! });
}

function stripHtml(html: string): string {
  let clean = html
    .replace(/<(script|style|nav|footer|header|aside|noscript)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#?[\w]+;/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length > 15000) clean = clean.slice(0, 15000);
  return clean;
}

export async function extractRecipeWithGemini(
  html: string
): Promise<ParsedRecipe> {
  const text = stripHtml(html);

  const response = await getAI().models.generateContent({
    model: "gemini-2.0-flash",
    contents: `Extract the recipe from this webpage text. Return ONLY valid JSON with this exact structure (no markdown, no code fences):
{
  "title": "Recipe title",
  "description": "A brief description of the dish in 1-2 sentences. MUST be different from the title — describe what it is, not just repeat the name.",
  "servings": 4,
  "prepTimeMinutes": 15,
  "cookTimeMinutes": 30,
  "language": "en",
  "ingredients": [
    {"quantity": 2, "unit": "cups", "name": "flour", "preparation": "sifted"}
  ],
  "instructions": [
    {"step": 1, "text": "Preheat oven to 350F"}
  ]
}

CRITICAL RULES:
- description must describe the dish, NOT repeat the title. If no description exists, write a brief one yourself.
- ingredients MUST be an array where each element is ONE ingredient. Never combine multiple ingredients into a single element.
- If an ingredient has no quantity (like "salt to taste"), set quantity to null and unit to null.
- instructions MUST be an array where each element is ONE step. Do not combine steps.
- Detect the language of the recipe (en, he, or fr) and set the "language" field.
- If a field is unknown, use null.

Webpage text:
${text}`,
  });

  const raw = response.text ?? "";
  const jsonStr = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(jsonStr);

  return {
    title: parsed.title ?? "Untitled",
    description: parsed.description ?? undefined,
    servings: parsed.servings ?? undefined,
    prepTimeMinutes: parsed.prepTimeMinutes ?? undefined,
    cookTimeMinutes: parsed.cookTimeMinutes ?? undefined,
    totalTimeMinutes: parsed.totalTimeMinutes ?? undefined,
    language: parsed.language ?? undefined,
    imageUrl: undefined,
    ingredients: (parsed.ingredients ?? []).map(
      (i: { quantity?: number; unit?: string; name: string; preparation?: string }) => ({
        quantity: i.quantity ?? undefined,
        unit: i.unit ?? undefined,
        name: i.name,
        preparation: i.preparation ?? undefined,
      })
    ),
    instructions: (parsed.instructions ?? []).map(
      (i: { step: number; text: string }, idx: number) => ({
        step: i.step ?? idx + 1,
        text: i.text,
      })
    ),
  };
}

export async function autoTagRecipe(
  title: string,
  ingredientNames: string[],
  availableTags: { slug: string; label: string }[]
): Promise<string[]> {
  const tagList = availableTags.map((t) => `${t.slug} (${t.label})`).join(", ");

  const response = await getAI().models.generateContent({
    model: "gemini-2.0-flash",
    contents: `Given this recipe, select ALL applicable tags from this exact list: [${tagList}]

Recipe title: ${title}
Ingredients: ${ingredientNames.join(", ")}

Return ONLY a JSON array of tag slugs using the exact slug names from the list above, nothing else.
Example: ["main","vegetarian","baking"]
If no tags apply, return: []`,
  });

  const raw = response.text ?? "[]";
  const jsonStr = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
  const result = JSON.parse(jsonStr);
  // Validate: only return slugs that actually exist in availableTags
  const validSlugs = new Set(availableTags.map((t) => t.slug));
  return (result as string[]).filter((s) => validSlugs.has(s));
}

export async function translateRecipe(
  recipe: {
    title: string;
    description?: string;
    ingredients: { name: string; preparation?: string }[];
    instructions: { text: string }[];
  },
  sourceLanguage: string,
  targetLanguage: string
): Promise<{
  title: string;
  description?: string;
  ingredients: { name: string; preparation?: string }[];
  instructions: { text: string }[];
}> {
  const langNames: Record<string, string> = {
    en: "English",
    he: "Hebrew",
    fr: "French",
  };

  const response = await getAI().models.generateContent({
    model: "gemini-2.0-flash",
    contents: `Translate this recipe from ${langNames[sourceLanguage] ?? sourceLanguage} to ${langNames[targetLanguage] ?? targetLanguage}.
Preserve cooking terminology accurately. Return ONLY valid JSON (no markdown, no code fences):

{
  "title": "translated title",
  "description": "translated description or null",
  "ingredients": [
    {"name": "translated name", "preparation": "translated preparation or null"}
  ],
  "instructions": [
    {"text": "translated instruction text"}
  ]
}

The ingredients array MUST have exactly ${recipe.ingredients.length} elements in the same order.
The instructions array MUST have exactly ${recipe.instructions.length} elements in the same order.

Source recipe:
Title: ${recipe.title}
Description: ${recipe.description ?? "none"}
Ingredients:
${recipe.ingredients.map((i) => `- ${i.name}${i.preparation ? `, ${i.preparation}` : ""}`).join("\n")}
Instructions:
${recipe.instructions.map((i, idx) => `${idx + 1}. ${i.text}`).join("\n")}`,
  });

  const raw = response.text ?? "";
  const jsonStr = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
  return JSON.parse(jsonStr);
}
