"use client";

import { useState } from "react";
import Image from "next/image";
import { useAuth, useSignOut } from "@/hooks/use-auth";
import { APP_NAME } from "@/lib/constants";
import { LogOut, ChevronDown } from "lucide-react";

export function Header() {
  const { user, isLoading } = useAuth();
  const signOut = useSignOut();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
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
          {isLoading ? (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
              <span className="text-xs text-muted-foreground">...</span>
            </div>
          ) : user?.avatarUrl ? (
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
            {isLoading ? "Loading..." : user?.fullName ?? "User"}
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