import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed } from "lucide-react";
import Link from "next/link";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/groups");
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-4 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <UtensilsCrossed className="h-8 w-8 text-primary" />
      </div>
      <h1 className="mt-6 text-3xl font-bold">FamilyRecipes</h1>
      <p className="mt-2 max-w-sm text-muted-foreground">
        Share and discover recipes with your family. Paste a URL, and we handle
        the rest — parsing, translating, and organizing your recipes.
      </p>
      <div className="mt-8 flex gap-3">
        <Button render={<Link href="/login" />}>
          Sign in
        </Button>
        <Button variant="outline" render={<Link href="/signup" />}>
          Create account
        </Button>
      </div>
    </div>
  );
}
