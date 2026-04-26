import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/rbac";
import { JournalsClient } from "./journals-client";

export default async function JournalsPage() {
  const session = await getSession();
  if (!session || !canAccess(session.role, "journals")) {
    return <div className="card p-10 text-center text-ink-faint">Access denied.</div>;
  }

  const entities = await prisma.entity.findMany({
    where: { isActive: true },
    orderBy: { type: "asc" },
    select: { id: true, name: true, color: true },
  });

  return <JournalsClient entities={entities} userRole={session.role} />;
}
