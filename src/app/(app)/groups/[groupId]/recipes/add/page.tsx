"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Link as LinkIcon, Loader2 } from "lucide-react";
import Link from "next/link";

export default function AddRecipePage() {
  const { groupId } = useParams<{ groupId: string }>();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus("Recipe ingestion pipeline coming in Phase 2...");
    // TODO: Phase 2 - Call the ingest-recipe edge function
    setLoading(false);
  }

  return (
    <div>
      <Link
        href={`/groups/${groupId}`}
        className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="me-1 h-4 w-4" />
        Back to recipes
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Add a recipe</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="url">Recipe URL</Label>
              <div className="relative">
                <LinkIcon className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="url"
                  type="url"
                  placeholder="https://www.allrecipes.com/recipe/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="ps-9"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Paste any recipe URL. We&apos;ll extract, translate, and organize it
                for you.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              Add recipe
            </Button>

            {status && (
              <p className="text-sm text-muted-foreground text-center">
                {status}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
