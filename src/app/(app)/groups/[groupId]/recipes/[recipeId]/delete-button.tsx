"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteRecipe } from "./actions";

export function DeleteRecipeButton({
  recipeId,
  groupId,
}: {
  recipeId: string;
  groupId: string;
}) {
  const [confirm, setConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (confirm) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-1.5">
        <span className="text-xs text-destructive">Delete recipe?</span>
        <Button
          variant="destructive"
          size="sm"
          className="h-7 text-xs"
          disabled={isPending}
          onClick={() => startTransition(() => deleteRecipe(recipeId, groupId))}
        >
          {isPending ? "Deleting…" : "Delete"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setConfirm(false)}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setConfirm(true)}
      className="text-muted-foreground hover:text-destructive"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
