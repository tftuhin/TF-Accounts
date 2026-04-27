import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getActiveEntities } from "@/lib/queries";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { SessionProvider } from "@/components/layout/session-provider";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const entities = await getActiveEntities();

  return (
    <SessionProvider user={session}>
      <div className="flex h-screen overflow-hidden flex-col lg:flex-row">
        <Sidebar entities={entities} user={session} />
        <div className="flex-1 flex flex-col overflow-hidden w-full">
          <TopBar user={session} />
          <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}
