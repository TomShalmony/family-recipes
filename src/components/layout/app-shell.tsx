"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  UtensilsCrossed,
  Users,
  User,
  LogOut,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppShellProps {
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl?: string | null;
  };
  lang: string;
  children: React.ReactNode;
}

export function AppShell({ user, lang, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const navItems = [
    {
      href: "/groups",
      label: "Groups",
      icon: Users,
      active: pathname.startsWith("/groups"),
    },
    {
      href: "/profile",
      label: "Profile",
      icon: User,
      active: pathname === "/profile",
    },
  ];

  return (
    <div className="flex min-h-svh flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link href="/groups" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <UtensilsCrossed className="h-4 w-4" />
            </div>
            <span className="hidden font-semibold sm:inline">FamilyRecipes</span>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger className="outline-none">
              <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {user.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-muted-foreground text-xs" disabled>
                {user.email}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/profile")}>
                <User className="me-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="me-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-6 pb-24 sm:pb-8">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:hidden">
        <div className="mx-auto flex max-w-2xl">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors ${
                item.active
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <item.icon className={`h-5 w-5 ${item.active ? "stroke-[2.5]" : ""}`} />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
