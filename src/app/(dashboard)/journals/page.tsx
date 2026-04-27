import { getSession } from "@/lib/auth";
import { canAccess } from "@/lib/rbac";
import { getActiveEntities } from "@/lib/queries";
import { JournalsClient } from "./journals-client";

export default async function JournalsPage() {
  const session = await getSession();
  if (!session || !canAccess(session.role, "journals")) {
    return <div className="card p-10 text-center text-ink-faint">Access denied.</div>;
  }

  const entities = await getActiveEntities();

  return <JournalsClient entities={entities} userRole={session.role} />;
}
