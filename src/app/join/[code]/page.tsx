import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { JoinButton } from "./join-button";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();

  // Look up the group
  const { data: group } = await supabase
    .from("groups")
    .select("id, name, description")
    .eq("invite_code", code)
    .single();

  if (!group) {
    return (
      <div className="flex min-h-svh items-center justify-center p-4 text-center">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Invalid invite link</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p>This invite link is no longer valid.</p>
            <Button render={<Link href="/login" />} className="mt-4">
              Go to login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If not logged in, redirect to login with return URL
  if (!user) {
    redirect(`/login?next=/join/${code}`);
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", group.id)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    redirect(`/groups/${group.id}`);
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <UtensilsCrossed className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Join {group.name}?</CardTitle>
        </CardHeader>
        <CardContent>
          {group.description && (
            <p className="mb-4 text-sm text-muted-foreground">
              {group.description}
            </p>
          )}
          <JoinButton groupId={group.id} />
        </CardContent>
      </Card>
    </div>
  );
}
