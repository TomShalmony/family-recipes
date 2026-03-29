import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Settings, Users, UtensilsCrossed, ExternalLink } from "lucide-react";
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

  // Get group details and user's membership
  const { data: membership } = await supabase
    .from("group_members")
    .select("role, group:groups(*)")
    .eq("group_id", groupId)
    .eq("user_id", user!.id)
    .single();

  const groupData = membership?.group as unknown as { id: string; name: string; description: string; invite_code: string } | null;
  if (!groupData) {
    notFound();
  }

  const group = groupData;
  const userRole = membership!.role;
  const canAdd = userRole === "admin" || userRole === "contributor";

  // Get recipes for this group
  const { data: recipes } = await supabase
    .from("recipes")
    .select(
      `
      id,
      source_url,
      ingestion_status,
      created_at,
      recipe_translations (title, language)
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
        <div className="flex gap-2">
          {canAdd && (
            <Button render={<Link href={`/groups/${groupId}/recipes/add`} />} size="sm">
                <Plus className="me-1.5 h-4 w-4" />
                Add
            </Button>
          )}
          {userRole === "admin" && (
            <Button render={<Link href={`/groups/${groupId}/settings`} />} size="sm" variant="outline">
                <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="mt-2 flex gap-2">
        <Button render={<Link href={`/groups/${groupId}/members`} />} size="sm" variant="ghost">
            <Users className="me-1.5 h-4 w-4" />
            Members
        </Button>
      </div>

      {!recipes || recipes.length === 0 ? (
        <div className="mt-12 flex flex-col items-center text-center">
          <UtensilsCrossed className="h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-medium">No recipes yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {canAdd
              ? "Add your first recipe by pasting a URL."
              : "Recipes added by contributors will appear here."}
          </p>
          {canAdd && (
            <Button render={<Link href={`/groups/${groupId}/recipes/add`} />} className="mt-4">
                Add first recipe
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {recipes.map((recipe) => {
            const title =
              recipe.recipe_translations?.find(
                (t: { language: string; title: string }) => t.language === "en"
              )?.title ??
              recipe.recipe_translations?.[0]?.title ??
              "Untitled recipe";

            return (
              <Link
                key={recipe.id}
                href={`/groups/${groupId}/recipes/${recipe.id}`}
              >
                <Card className="transition-colors hover:bg-accent/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base line-clamp-1">
                        {title}
                      </CardTitle>
                      {recipe.ingestion_status !== "done" && (
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {recipe.ingestion_status}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        {new Date(recipe.created_at).toLocaleDateString()}
                      </span>
                      {recipe.source_url && (
                        <span className="flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          {new URL(recipe.source_url).hostname}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
