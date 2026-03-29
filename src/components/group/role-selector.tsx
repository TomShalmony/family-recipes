"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

const ROLES = [
  { value: "guest", label: "Guest" },
  { value: "contributor", label: "Contributor" },
  { value: "admin", label: "Admin" },
] as const;

export function RoleSelector({
  groupId,
  memberId,
  currentRole,
  isCurrentUser,
}: {
  groupId: string;
  memberId: string;
  currentRole: string;
  isCurrentUser: boolean;
}) {
  const [role, setRole] = useState(currentRole);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Don't allow admins to change their own role
  if (isCurrentUser) {
    return (
      <Badge variant="secondary" className="text-xs">
        {role}
      </Badge>
    );
  }

  async function handleRoleChange(newRole: string) {
    if (newRole === role) return;
    setLoading(true);

    const { error } = await supabase
      .from("group_members")
      .update({ role: newRole })
      .eq("group_id", groupId)
      .eq("user_id", memberId);

    if (!error) {
      setRole(newRole);
    }
    setLoading(false);
    router.refresh();
  }

  async function handleRemove() {
    if (!confirm("Remove this member from the group?")) return;
    setLoading(true);

    await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", memberId);

    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs outline-none"
        disabled={loading}
      >
        {role}
        <ChevronDown className="h-3 w-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {ROLES.map((r) => (
          <DropdownMenuItem
            key={r.value}
            onClick={() => handleRoleChange(r.value)}
            className={role === r.value ? "font-semibold" : ""}
          >
            {r.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem
          onClick={handleRemove}
          className="text-destructive"
        >
          Remove from group
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
