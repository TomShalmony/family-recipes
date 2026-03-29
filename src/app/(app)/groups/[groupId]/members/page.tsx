import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import { CopyInviteButton } from "@/components/group/copy-invite-button";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get group + current user's role
  const { data: membership } = await supabase
    .from("group_members")
    .select("role, group:groups(name, invite_code)")
    .eq("group_id", groupId)
    .eq("user_id", user!.id)
    .single();

  const group = membership?.group as unknown as { name: string; invite_code: string } | null;
  if (!group) notFound();

  const isAdmin = membership!.role === "admin";

  // Get all members
  const { data: members } = await supabase
    .from("group_members")
    .select("role, joined_at, user:profiles(id, display_name)")
    .eq("group_id", groupId)
    .order("joined_at", { ascending: true });

  return (
    <div>
      <Link
        href={`/groups/${groupId}`}
        className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="me-1 h-4 w-4" />
        Back to {group.name}
      </Link>

      <h1 className="text-2xl font-bold">Members</h1>

      {isAdmin && (
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              <LinkIcon className="me-1.5 inline h-4 w-4" />
              Invite link
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-xs text-muted-foreground">
              Share this link to invite guests to the group.
            </p>
            <CopyInviteButton inviteCode={group.invite_code!} />
          </CardContent>
        </Card>
      )}

      <div className="mt-4 space-y-2">
        {members?.map((member) => {
          const memberUser = member.user as unknown as { id: string; display_name: string } | null;
          return (
            <div
              key={memberUser?.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {(memberUser?.display_name ?? "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">
                  {memberUser?.display_name}
                </span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {member.role}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
