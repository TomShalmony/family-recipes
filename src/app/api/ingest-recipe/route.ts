import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { extractJsonLd } from "@/lib/ingestion/extract-jsonld";
import { extractRecipeWithGemini, autoTagRecipe, translateRecipe } from "@/lib/ingestion/gemini";
import { normalizeIngredient } from "@/lib/ingestion/normalize-units";
import type { ParsedRecipe } from "@/lib/ingestion/extract-jsonld";

export async function POST(request: Request) {
  try {
    // Auth check — use user's session for all DB operations (RLS enforced)
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url, groupId } = await request.json();
    if (!url || !groupId) {
      return NextResponse.json(
        { error: "url and groupId are required" },
        { status: 400 }
      );
    }

    // Check user is contributor/admin in group
    const { data: membership } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .single();

    if (!membership || membership.role === "guest") {
      return NextResponse.json(
        { error: "Only contributors and admins can add recipes" },
        { status: 403 }
      );
    }

    // 1. Create pending recipe
    const { data: recipe, error: insertError } = await supabase
      .from("recipes")
      .insert({
        group_id: groupId,
        added_by: user.id,
        source_url: url,
        ingestion_status: "processing",
      })
      .select()
      .single();

    if (insertError || !recipe) {
      return NextResponse.json(
        { error: "Failed to create recipe: " + insertError?.message },
        { status: 500 }
      );
    }

    const recipeId = recipe.id;

    try {
      // 2. Fetch HTML
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; FamilyRecipes/1.0; +https://family-recipes.vercel.app)",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status}`);
      }

      const html = await response.text();

      // 3. Try JSON-LD extraction first
      let parsed: ParsedRecipe | null = extractJsonLd(html);

      // 4. Fallback to Gemini
      if (
        !parsed ||
        !parsed.title ||
        parsed.ingredients.length === 0 ||
        parsed.instructions.length === 0
      ) {
        parsed = await extractRecipeWithGemini(html);
      }

      // Detect source language
      const sourceLang = parsed.language ?? "en";
      const validLang = ["en", "he", "fr"].includes(sourceLang)
        ? sourceLang
        : "en";

      // 5. Normalize units
      const normalizedIngredients = parsed.ingredients.map((ing) => {
        const normalized = normalizeIngredient(ing);
        return { ...ing, ...normalized };
      });

      // 6. Auto-tag
      const { data: tags } = await supabase
        .from("tags")
        .select("id, slug, tag_translations(label, language)")
        .order("sort_order");

      const availableTags =
        tags?.map((t) => ({
          slug: t.slug,
          label:
            (
              t.tag_translations as unknown as {
                label: string;
                language: string;
              }[]
            )?.find((tt) => tt.language === "en")?.label ?? t.slug,
          id: t.id,
        })) ?? [];

      let tagSlugs: string[] = [];
      try {
        tagSlugs = await autoTagRecipe(
          parsed.title,
          normalizedIngredients.map((i) => i.name),
          availableTags
        );
      } catch {
        // Auto-tagging failure is non-fatal
      }

      // 7. Translate to all 3 languages
      const allLangs = ["en", "he", "fr"];
      const translations: Record<
        string,
        {
          title: string;
          description?: string;
          ingredients: { name: string; preparation?: string }[];
          instructions: { text: string }[];
        }
      > = {};

      // Source language uses the parsed data directly
      translations[validLang] = {
        title: parsed.title,
        description: parsed.description,
        ingredients: normalizedIngredients.map((i) => ({
          name: i.name,
          preparation: i.preparation,
        })),
        instructions: parsed.instructions.map((i) => ({ text: i.text })),
      };

      // Translate to the other 2 languages
      const targetLangs = allLangs.filter((l) => l !== validLang);
      for (const targetLang of targetLangs) {
        try {
          translations[targetLang] = await translateRecipe(
            translations[validLang],
            validLang,
            targetLang
          );
        } catch {
          // Translation failure — copy source as fallback
          translations[targetLang] = translations[validLang];
        }
      }

      // 8. Save everything to DB

      // Update recipe metadata
      await supabase
        .from("recipes")
        .update({
          original_language: validLang,
          default_servings: parsed.servings ?? 4,
          prep_time_minutes: parsed.prepTimeMinutes,
          cook_time_minutes: parsed.cookTimeMinutes,
          total_time_minutes: parsed.totalTimeMinutes,
          image_url: parsed.imageUrl,
          ingestion_status: "done",
        })
        .eq("id", recipeId);

      // Save recipe translations
      for (const lang of allLangs) {
        await supabase.from("recipe_translations").insert({
          recipe_id: recipeId,
          language: lang,
          title: translations[lang].title,
          description: translations[lang].description,
        });
      }

      // Save ingredients + translations
      for (let i = 0; i < normalizedIngredients.length; i++) {
        const ing = normalizedIngredients[i];
        const { data: savedIng } = await supabase
          .from("ingredients")
          .insert({
            recipe_id: recipeId,
            sort_order: i,
            quantity: ing.quantity,
            unit: ing.unit,
            original_quantity: ing.originalQuantity,
            original_unit: ing.originalUnit,
          })
          .select("id")
          .single();

        if (savedIng) {
          for (const lang of allLangs) {
            const translatedIng = translations[lang].ingredients[i];
            if (translatedIng) {
              await supabase.from("ingredient_translations").insert({
                ingredient_id: savedIng.id,
                language: lang,
                name: translatedIng.name,
                preparation: translatedIng.preparation,
              });
            }
          }
        }
      }

      // Save instructions + translations
      for (let i = 0; i < parsed.instructions.length; i++) {
        const { data: savedInst } = await supabase
          .from("instructions")
          .insert({
            recipe_id: recipeId,
            step_number: i + 1,
          })
          .select("id")
          .single();

        if (savedInst) {
          for (const lang of allLangs) {
            const translatedInst = translations[lang].instructions[i];
            if (translatedInst) {
              await supabase.from("instruction_translations").insert({
                instruction_id: savedInst.id,
                language: lang,
                text: translatedInst.text,
              });
            }
          }
        }
      }

      // Save tags
      for (const slug of tagSlugs) {
        const tag = availableTags.find((t) => t.slug === slug);
        if (tag) {
          await supabase.from("recipe_tags").insert({
            recipe_id: recipeId,
            tag_id: tag.id,
          });
        }
      }

      return NextResponse.json({
        recipeId,
        status: "done",
        title: translations["en"]?.title ?? parsed.title,
      });
    } catch (err) {
      // Mark recipe as failed
      await supabase
        .from("recipes")
        .update({
          ingestion_status: "failed",
          ingestion_error: err instanceof Error ? err.message : "Unknown error",
        })
        .eq("id", recipeId);

      return NextResponse.json(
        {
          recipeId,
          status: "failed",
          error: err instanceof Error ? err.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
