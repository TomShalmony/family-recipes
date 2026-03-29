import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, preferred_language, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <AppShell
      user={{
        id: user.id,
        email: user.email ?? "",
        displayName: profile?.display_name ?? user.email ?? "",
        avatarUrl: profile?.avatar_url,
      }}
      lang={profile?.preferred_language ?? "en"}
    >
      {children}
    </AppShell>
  );
}
