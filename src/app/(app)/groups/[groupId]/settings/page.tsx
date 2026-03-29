"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function GroupSettingsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("groups")
        .select("name, description")
        .eq("id", groupId)
        .single();
      if (data) {
        setName(data.name);
        setDescription(data.description ?? "");
      }
    }
    load();
  }, [groupId, supabase]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase
      .from("groups")
      .update({ name, description })
      .eq("id", groupId);

    if (error) {
      setError(error.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setLoading(false);
  }

  async function handleRegenerateInvite() {
    const newCode = crypto.randomUUID().slice(0, 12);
    await supabase
      .from("groups")
      .update({ invite_code: newCode })
      .eq("id", groupId);
    router.refresh();
  }

  return (
    <div>
      <Link
        href={`/groups/${groupId}`}
        className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="me-1 h-4 w-4" />
        Back
      </Link>

      <h1 className="text-2xl font-bold">Group Settings</h1>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">General</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Group name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desc">Description</Label>
              <Input
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {saved ? "Saved!" : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Invite Link</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Regenerate the invite code to invalidate the current link.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={handleRegenerateInvite}
          >
            <RefreshCw className="me-1.5 h-4 w-4" />
            Regenerate invite code
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
