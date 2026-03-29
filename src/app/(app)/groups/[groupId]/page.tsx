import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Settings, Users, UtensilsCrossed } from "lucide-react";
import Link from "next/link";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from("group_members")
    .select("role, group:groups(*)")
    .eq("group_id", groupId)
    .eq("user_id", user!.id)
    .single();

  const groupData = membership?.group as unknown as {
    id: string;
    name: string;
    description: string;
    invite_code: string;
  } | null;
  if (!groupData) notFound();

  const group = groupData;
  const userRole = membership!.role;
  const canAdd = userRole === "admin" || userRole === "contributor";

  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_language")
    .eq("id", user!.id)
    .single();
  const lang = profile?.preferred_language ?? "en";

  const { data: recipes } = await supabase
    .from("recipes")
    .select(
      `
      id,
      source_url,
      image_url,
      ingestion_status,
      created_at,
      default_servings,
      total_time_minutes,
      recipe_translations (title, language),
      recipe_tags (
        tag:tags (slug, tag_translations (label, language))
      )
    `
    )
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{group.name}</h1>
          {group.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {group.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {canAdd && (
            <Button
              render={<Link href={`/groups/${groupId}/recipes/add`} />}
              size="sm"
            >
              <Plus className="me-1.5 h-4 w-4" />
              Add
            </Button>
          )}
          {userRole === "admin" && (
            <Button
              render={<Link href={`/groups/${groupId}/settings`} />}
              size="sm"
              variant="outline"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="mt-2">
        <Button
          render={<Link href={`/groups/${groupId}/members`} />}
          size="sm"
          variant="ghost"
          className="-ms-2"
        >
          <Users className="me-1.5 h-4 w-4" />
          Members
        </Button>
      </div>

      {!recipes || recipes.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <UtensilsCrossed className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">No recipes yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {canAdd
              ? "Add your first recipe by pasting a URL."
              : "Recipes added by contributors will appear here."}
          </p>
          {canAdd && (
            <Button
              render={<Link href={`/groups/${groupId}/recipes/add`} />}
              className="mt-4"
            >
              <Plus className="me-1.5 h-4 w-4" />
              Add first recipe
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {recipes.map((recipe) => {
            const r = recipe as unknown as {
              id: string;
              source_url?: string;
              image_url?: string;
              ingestion_status: string;
              created_at: string;
              default_servings?: number;
              total_time_minutes?: number;
              recipe_translations?: { language: string; title: string }[];
              recipe_tags?: {
                tag: {
                  slug: string;
                  tag_translations: { language: string; label: string }[];
                };
              }[];
            };

            const title =
              r.recipe_translations?.find((t) => t.language === lang)?.title ??
              r.recipe_translations?.find((t) => t.language === "en")?.title ??
              r.recipe_translations?.[0]?.title ??
              "Untitled recipe";

            const tags = r.recipe_tags
              ?.map((rt) => {
                const label =
                  rt.tag?.tag_translations?.find(
                    (t: { language: string }) => t.language === lang
                  )?.label ??
                  rt.tag?.tag_translations?.find(
                    (t: { language: string }) => t.language === "en"
                  )?.label ??
                  rt.tag?.slug;
                return { slug: rt.tag?.slug, label };
              })
              .filter(Boolean)
              .slice(0, 3) ?? [];

            const hostname = (() => {
              try {
                return new URL(r.source_url ?? "").hostname.replace("www.", "");
              } catch {
                return null;
              }
            })();

            return (
              <Link
                key={r.id}
                href={`/groups/${groupId}/recipes/${r.id}`}
                className="block"
              >
                <div className="flex overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-md hover:border-primary/30 active:scale-[0.99]">
                  {/* Text content */}
                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold leading-snug line-clamp-2">
                          {title}
                        </h3>
                        {r.ingestion_status !== "done" && (
                          <Badge
                            variant="secondary"
                            className="shrink-0 text-xs"
                          >
                            {r.ingestion_status}
                          </Badge>
                        )}
                      </div>

                      {tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {tags.map(
                            (t: { slug: string; label: string } | null) =>
                              t && (
                                <Badge
                                  key={t.slug}
                                  variant="secondary"
                                  className="px-1.5 py-0 text-xs font-normal"
                                >
                                  {t.label}
                                </Badge>
                              )
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      {r.total_time_minutes && (
                        <>
                          <span>{r.total_time_minutes} min</span>
                          <span>·</span>
                        </>
                      )}
                      {hostname && <span>{hostname}</span>}
                    </div>
                  </div>

                  {/* Thumbnail */}
                  {r.image_url && (
                    <div className="w-28 shrink-0 overflow-hidden">
                      <img
                        src={r.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
