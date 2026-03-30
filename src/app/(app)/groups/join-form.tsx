"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function JoinGroupFormClient() {
  const [code, setCode] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    // Strip full URL if user pasted the full invite link
    const match = trimmed.match(/\/join\/([^/?#]+)/);
    const inviteCode = match ? match[1] : trimmed;
    router.push(`/join/${inviteCode}`);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        type="text"
        placeholder="Paste invite code or link"
        className="flex-1 rounded-md border px-3 py-2 text-sm"
        required
      />
      <Button type="submit" size="sm" variant="outline">
        Join
      </Button>
    </form>
  );
}
