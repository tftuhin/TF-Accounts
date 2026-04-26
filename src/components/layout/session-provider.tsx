"use client";

import { useEffect, type ReactNode } from "react";
import { useAppStore } from "@/lib/store";
import type { SessionUser } from "@/types";

export function SessionProvider({ user, children }: { user: SessionUser; children: ReactNode }) {
  const setUser = useAppStore((s) => s.setUser);

  useEffect(() => {
    setUser(user);
  }, [user, setUser]);

  return <>{children}</>;
}
