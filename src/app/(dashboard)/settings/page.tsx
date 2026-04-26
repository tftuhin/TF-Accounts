import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return (
      <div className="card p-10 text-center text-ink-faint">
        Admin access required.
      </div>
    );
  }

  const entities = await prisma.entity.findMany({
    orderBy: { type: "asc" },
    select: { id: true, slug: true, name: true, type: true, color: true },
  });

  return <SettingsClient entities={entities} />;
}
