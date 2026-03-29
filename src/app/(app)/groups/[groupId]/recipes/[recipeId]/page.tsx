import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, ExternalLink, Flame, Users } from "lucide-react";
import Link from "next/link";
import { cleanText, formatTime } from "@/lib/clean-text";
import { DeleteRecipeButton } from "./delete-button";

export default async function RecipePage({
  params,
}: {
  params: Promise<{ groupId: string; recipeId: string }>;
}) {
  const { groupId, recipeId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: recipe }, { data: profile }, { data: membership }] =
    await Promise.all([
      supabase
        .from("recipes")
        .select(
          `
          *,
          recipe_translations (title, description, language),
          ingredients (
            id, sort_order, quantity, unit,
            ingredient_translations (name, preparation, language)
          ),
          instructions (
            id, step_number,
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
        .single(),
      supabase
        .from("profiles")
        .select("preferred_language")
        .eq("id", user!.id)
        .single(),
      supabase
        .from("group_members")
        .select("role")
        .eq("group_id", groupId)
        .eq("user_id", user!.id)
        .single(),
    ]);

  if (!recipe) notFound();

  const lang = profile?.preferred_language ?? "en";
  const isAdmin = membership?.role === "admin";

  function pickTranslation<T extends { language: string }>(
    arr: T[] | null | undefined
  ): T | undefined {
    if (!arr) return undefined;
    return (
      arr.find((t) => t.language === lang) ??
      arr.find((t) => t.language === "en") ??
      arr[0]
    );
  }

  const translation = pickTranslation(
    recipe.recipe_translations as { language: string; title: string; description?: string }[]
  );

  const ingredients = recipe.ingredients
    ?.sort(
      (a: { sort_order: number }, b: { sort_order: number }) =>
        a.sort_order - b.sort_order
    )
    .map(
      (ing: {
        id: string;
        quantity?: number;
        unit?: string;
        ingredient_translations: { language: string; name: string; preparation?: string }[];
      }) => ({
        ...ing,
        translation: pickTranslation(ing.ingredient_translations),
      })
    );

  const instructions = recipe.instructions
    ?.sort(
      (a: { step_number: number }, b: { step_number: number }) =>
        a.step_number - b.step_number
    )
    .map(
      (inst: {
        id: string;
        step_number: number;
        instruction_translations: { language: string; text: string }[];
      }) => ({
        ...inst,
        translation: pickTranslation(inst.instruction_translations),
      })
    );

  const title = cleanText(translation?.title) || "Untitled recipe";
  const description = cleanText(translation?.description);

  const r = recipe as {
    image_url?: string;
    source_url?: string;
    prep_time_minutes?: number;
    cook_time_minutes?: number;
    total_time_minutes?: number;
    default_servings?: number;
    recipe_tags?: {
      tag: { slug: string; tag_translations: { language: string; label: string }[] };
    }[];
  };

  return (
    <div>
      {/* Hero image */}
      {r.image_url && (
        <div className="-mx-4 mb-6 h-52 overflow-hidden sm:mx-0 sm:rounded-2xl sm:h-64">
          <img
            src={r.image_url}
            alt={title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Top nav row */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <Link
          href={`/groups/${groupId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        {isAdmin && (
          <DeleteRecipeButton recipeId={recipeId} groupId={groupId} />
        )}
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold leading-tight">{title}</h1>

      {/* Description — skip if it's identical to the title */}
      {description && description !== title && (
        <p className="mt-2 text-muted-foreground leading-relaxed">{description}</p>
      )}

      {/* Tags */}
      {r.recipe_tags && r.recipe_tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {r.recipe_tags.map(
            (rt: {
              tag: {
                slug: string;
                tag_translations: { language: string; label: string }[];
              };
            }) => {
              const tagLabel =
                rt.tag?.tag_translations?.find(
                  (t: { language: string }) => t.language === lang
                )?.label ??
                rt.tag?.tag_translations?.find(
                  (t: { language: string }) => t.language === "en"
                )?.label ??
                rt.tag?.slug;
              return (
                <Badge key={rt.tag?.slug} variant="secondary" className="font-normal">
                  {tagLabel}
                </Badge>
              );
            }
          )}
        </div>
      )}

      {/* Time + servings chips */}
      {(r.prep_time_minutes ||
        r.cook_time_minutes ||
        r.total_time_minutes ||
        r.default_servings) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {r.prep_time_minutes && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {formatTime(r.prep_time_minutes)} prep
            </span>
          )}
          {r.cook_time_minutes && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
              <Flame className="h-3.5 w-3.5" />
              {formatTime(r.cook_time_minutes)} cook
            </span>
          )}
          {!r.prep_time_minutes && !r.cook_time_minutes && r.total_time_minutes && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {formatTime(r.total_time_minutes)} total
            </span>
          )}
          {r.default_servings && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              Serves {r.default_servings}
            </span>
          )}
        </div>
      )}

      {/* Source link */}
      {r.source_url && (
        <a
          href={r.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View original recipe
        </a>
      )}

      {/* Ingredients */}
      {ingredients && ingredients.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold tracking-tight">Ingredients</h2>
          <ul className="mt-3 divide-y divide-border/50">
            {ingredients.map(
              (ing: {
                id: string;
                quantity?: number;
                unit?: string;
                translation?: { name: string; preparation?: string };
              }) => (
                <li key={ing.id} className="flex items-start gap-3 py-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span className="text-sm leading-relaxed">
                    {ing.quantity != null && (
                      <span className="font-semibold text-foreground">
                        {ing.quantity}
                        {ing.unit ? ` ${ing.unit}` : ""}
                        {" "}
                      </span>
                    )}
                    {cleanText(ing.translation?.name)}
                    {ing.translation?.preparation && (
                      <span className="text-muted-foreground">
                        , {cleanText(ing.translation.preparation)}
                      </span>
                    )}
                  </span>
                </li>
              )
            )}
          </ul>
        </section>
      )}

      {/* Instructions */}
      {instructions && instructions.length > 0 && (
        <section className="mt-8 pb-4">
          <h2 className="text-lg font-semibold tracking-tight">Instructions</h2>
          <ol className="mt-4 space-y-5">
            {instructions
              .filter((inst: { translation?: { text: string } }) =>
                cleanText(inst.translation?.text).length > 0
              )
              .map(
                (
                  inst: {
                    id: string;
                    step_number: number;
                    translation?: { text: string };
                  },
                  i: number
                ) => (
                  <li key={inst.id} className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {i + 1}
                    </span>
                    <p className="pt-1 text-sm leading-relaxed">
                      {cleanText(inst.translation?.text)}
                    </p>
                  </li>
                )
              )}
          </ol>
        </section>
      )}
    </div>
  );
}
