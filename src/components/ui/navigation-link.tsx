"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";

function NavigationProgress() {
  const { pending } = useLinkStatus();
  if (!pending) return null;

  return (
    <span role="status" className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 animate-pulse bg-primary motion-reduce:animate-none">
      <span className="sr-only">กำลังเปิดหน้า…</span>
    </span>
  );
}

/** Keep Next.js prefetch and navigation behavior, with immediate pending feedback. */
export function NavigationLink({ children, ...props }: ComponentProps<typeof Link>) {
  return <Link {...props}>{children}<NavigationProgress /></Link>;
}
