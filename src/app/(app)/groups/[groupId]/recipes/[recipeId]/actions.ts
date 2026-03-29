"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function deleteRecipe(recipeId: string, groupId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.role !== "admin") {
    throw new Error("Only admins can delete recipes");
  }

  const { error } = await supabase.from("recipes").delete().eq("id", recipeId);
  if (error) throw new Error(error.message);

  redirect(`/groups/${groupId}`);
}
