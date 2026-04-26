import type { Metadata } from "next";
import { QueryProvider } from "@/lib/query-provider";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Teamosis Ledger · Profit First Accounting",
  description: "Double-entry accounting system with Profit First methodology for Teamosis and sub-brands",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-surface-0">
        <QueryProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#131920",
                border: "1px solid #2A3140",
                color: "#CBD5E1",
                fontSize: "13px",
              },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  );
}
