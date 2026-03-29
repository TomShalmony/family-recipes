"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Link as LinkIcon, Loader2, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

export default function AddRecipePage() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [recipeId, setRecipeId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus("processing");
    setStatusMessage("Fetching and parsing recipe...");

    try {
      const res = await fetch("/api/ingest-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, groupId }),
      });

      const data = await res.json();

      if (res.ok && data.status === "done") {
        setStatus("done");
        setStatusMessage(`"${data.title}" added successfully!`);
        setRecipeId(data.recipeId);
      } else {
        setStatus("error");
        setStatusMessage(data.error ?? "Failed to process recipe");
      }
    } catch (err) {
      setStatus("error");
      setStatusMessage(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
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
                  disabled={loading || status === "done"}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Paste any recipe URL. We&apos;ll extract, translate, and organize it
                for you.
              </p>
            </div>

            {status === "idle" || status === "error" ? (
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                Add recipe
              </Button>
            ) : null}

            {status === "processing" && (
              <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>{statusMessage}</span>
              </div>
            )}

            {status === "done" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span>{statusMessage}</span>
                </div>
                <div className="flex gap-2">
                  {recipeId && (
                    <Button
                      className="flex-1"
                      onClick={() =>
                        router.push(
                          `/groups/${groupId}/recipes/${recipeId}`
                        )
                      }
                    >
                      View recipe
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setUrl("");
                      setStatus("idle");
                      setStatusMessage("");
                      setRecipeId(null);
                    }}
                  >
                    Add another
                  </Button>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
                <XCircle className="h-4 w-4 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
