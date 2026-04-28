import { getSession } from "@/lib/auth";
import { SalaryClient } from "./salary-client";

export default async function SalaryPage() {
  const session = await getSession();
  if (!session) {
    return <div className="card p-10 text-center text-ink-faint">Unauthorized</div>;
  }

  return <SalaryClient userRole={session.role} />;
}
