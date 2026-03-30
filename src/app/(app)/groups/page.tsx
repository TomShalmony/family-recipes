import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { JoinGroupFormClient } from "./join-form";

export default async function GroupsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberships } = await supabase
    .from("group_members")
    .select(
      `
      role,
      group:groups (
        id,
        name,
        description
      )
    `
    )
    .eq("user_id", user!.id);

  const groups = memberships?.map((m) => {
    const group = m.group as unknown as { id: string; name: string; description: string };
    return { ...group, role: m.role };
  }) ?? [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Groups</h1>
        <Button render={<Link href="/groups/new" />} size="sm">
            <Plus className="me-1.5 h-4 w-4" />
            New group
        </Button>
      </div>

      {groups.length === 0 ? (
        <div className="mt-12 flex flex-col items-center text-center">
          <Users className="h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-medium">No groups yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a group to start sharing recipes with your family.
          </p>
          <Button render={<Link href="/groups/new" />} className="mt-4">
            Create your first group
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {groups.map((group) => (
            <Link key={group.id} href={`/groups/${group.id}`}>
              <Card className="transition-colors hover:bg-accent/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                      {group.role}
                    </span>
                  </div>
                </CardHeader>
                {group.description && (
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {group.description}
                    </p>
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6">
        <JoinGroupForm />
      </div>
    </div>
  );
}

function JoinGroupForm() {
  return (
    <details className="rounded-lg border p-4">
      <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
        Have an invite code? Join a group
      </summary>
      <JoinGroupFormClient />
    </details>
  );
}
