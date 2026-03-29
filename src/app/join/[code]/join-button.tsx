"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function JoinButton({ groupId }: { groupId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleJoin() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("group_members").insert({
      group_id: groupId,
      user_id: user.id,
      role: "guest",
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push(`/groups/${groupId}`);
    }
  }

  return (
    <>
      {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
      <Button onClick={handleJoin} disabled={loading} className="w-full">
        {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
        Join as guest
      </Button>
    </>
  );
}
