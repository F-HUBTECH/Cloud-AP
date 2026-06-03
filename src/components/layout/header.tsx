"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { APP_NAME } from "@/lib/constants";
import { LogOut, ChevronDown } from "lucide-react";

interface UserProfile {
  email: string;
  fullName: string;
  avatarUrl: string | null;
}

export function Header() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        const { data: profile } = await supabase
          .from("app_users")
          .select("display_name, email")
          .eq("auth_uid", authUser.id)
          .single();

        setUser({
          email: profile?.email ?? authUser.email ?? "",
          fullName:
            profile?.display_name ?? authUser.user_metadata?.full_name ?? "",
          avatarUrl: authUser.user_metadata?.avatar_url ?? null,
        });
      }
    }

    loadUser();
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-6">
      <div className="text-sm font-medium text-muted-foreground">{APP_NAME}</div>

      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-accent"
        >
          {user?.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={user.fullName}
              width={28}
              height={28}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {initials}
            </div>
          )}
          <span className="max-w-[150px] truncate text-sm font-medium">
            {user?.fullName ?? "User"}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border bg-popover p-1 shadow-lg">
              <div className="border-b px-3 py-2">
                <p className="text-sm font-medium">{user?.fullName ?? "User"}</p>
                <p className="text-xs text-muted-foreground">{user?.email ?? ""}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-accent"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}