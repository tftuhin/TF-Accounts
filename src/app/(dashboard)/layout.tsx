import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { SessionProvider } from "@/components/layout/session-provider";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const entities = await prisma.entity.findMany({
    orderBy: { type: "asc" },
    select: { id: true, slug: true, name: true, type: true, color: true, parentId: true },
  });

  return (
    <SessionProvider user={session}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar entities={entities} user={session} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar user={session} />
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}
