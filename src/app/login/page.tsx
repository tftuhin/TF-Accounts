import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-0 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-brand-500/[0.03] blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/4 w-[600px] h-[600px] rounded-full bg-accent-blue/[0.03] blur-3xl" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative w-full max-w-md px-6">
        {/* Logo & Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 mb-5">
            <span className="text-2xl text-brand-400 font-display">◆</span>
          </div>
          <h1 className="text-3xl font-display text-ink-white tracking-tight">
            Teamosis <span className="italic text-ink-muted">Ledger</span>
          </h1>
          <p className="text-sm text-ink-muted mt-2">
            Profit First Accounting System
          </p>
        </div>

        {/* Login Card */}
        <div className="card p-8">
          <LoginForm />
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-2xs text-ink-faint">
          <p>Double-Entry · Multi-Entity · RBAC</p>
          <p className="mt-1">Teamosis © 2025</p>
        </div>
      </div>
    </div>
  );
}
