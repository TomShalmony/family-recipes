import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";

export default async function RecipePage({
  params,
}: {
  params: Promise<{ groupId: string; recipeId: string }>;
}) {
  const { groupId, recipeId } = await params;
  const supabase = await createClient();

  const { data: recipe } = await supabase
    .from("recipes")
    .select(
      `
      *,
      recipe_translations (title, description, language),
      ingredients (
        id, sort_order, quantity, unit, section,
        ingredient_translations (name, preparation, language)
      ),
      instructions (
        id, step_number, section,
        instruction_translations (text, language)
      ),
      recipe_tags (
        tag:tags (
          slug,
          tag_translations (label, language)
        )
      )
    `
    )
    .eq("id", recipeId)
    .eq("group_id", groupId)
    .single();

  if (!recipe) notFound();

  // Default to English for now (i18n in Phase 4)
  const lang = "en";
  const translation = recipe.recipe_translations?.find(
    (t: { language: string }) => t.language === lang
  ) ?? recipe.recipe_translations?.[0];

  const ingredients = recipe.ingredients
    ?.sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
    .map((ing: { ingredient_translations: { language: string; name: string; preparation?: string }[]; quantity?: number; unit?: string }) => ({
      ...ing,
      translation: ing.ingredient_translations?.find(
        (t: { language: string }) => t.language === lang
      ) ?? ing.ingredient_translations?.[0],
    }));

  const instructions = recipe.instructions
    ?.sort((a: { step_number: number }, b: { step_number: number }) => a.step_number - b.step_number)
    .map((inst: { instruction_translations: { language: string; text: string }[]; step_number: number }) => ({
      ...inst,
      translation: inst.instruction_translations?.find(
        (t: { language: string }) => t.language === lang
      ) ?? inst.instruction_translations?.[0],
    }));

  return (
    <div>
      <Link
        href={`/groups/${groupId}`}
        className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="me-1 h-4 w-4" />
        Back
      </Link>

      <h1 className="text-2xl font-bold">
        {translation?.title ?? "Untitled recipe"}
      </h1>

      {translation?.description && (
        <p className="mt-2 text-muted-foreground">{translation.description}</p>
      )}

      {/* Tags */}
      {recipe.recipe_tags && recipe.recipe_tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {recipe.recipe_tags.map((rt: { tag: { slug: string; tag_translations: { language: string; label: string }[] } }) => {
            const tagLabel =
              rt.tag?.tag_translations?.find(
                (t: { language: string }) => t.language === lang
              )?.label ?? rt.tag?.slug;
            return (
              <Badge key={rt.tag?.slug} variant="secondary">
                {tagLabel}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Source link */}
      {recipe.source_url && (
        <a
          href={recipe.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ExternalLink className="h-4 w-4" />
          View original recipe
        </a>
      )}

      {/* Ingredients */}
      {ingredients && ingredients.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">Ingredients</h2>
          {recipe.default_servings && (
            <p className="mt-1 text-sm text-muted-foreground">
              Serves {recipe.default_servings}
            </p>
          )}
          <ul className="mt-3 space-y-2">
            {ingredients.map((ing: { id: string; quantity?: number; unit?: string; translation?: { name: string; preparation?: string } }) => (
              <li key={ing.id} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>
                  {ing.quantity && (
                    <strong>
                      {ing.quantity}
                      {ing.unit ? ` ${ing.unit}` : ""}
                    </strong>
                  )}{" "}
                  {ing.translation?.name}
                  {ing.translation?.preparation && (
                    <span className="text-muted-foreground">
                      , {ing.translation.preparation}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Instructions */}
      {instructions && instructions.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">Instructions</h2>
          <ol className="mt-3 space-y-4">
            {instructions.map((inst: { step_number: number; translation?: { text: string } }, i: number) => (
              <li key={inst.step_number} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  {i + 1}
                </span>
                <p className="pt-0.5">{inst.translation?.text}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
