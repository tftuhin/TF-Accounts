"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginAction } from "./actions";

export function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    startTransition(async () => {
      try {
        console.log("Attempting login with:", email);
        const result = await loginAction(email, password);
        console.log("Login result:", result);
        if (result.error) {
          setError(result.error);
        } else {
          console.log("Login successful, redirecting to dashboard");
          await new Promise(resolve => setTimeout(resolve, 500));
          router.push("/dashboard");
        }
      } catch (err) {
        console.error("Login error:", err);
        setError(err instanceof Error ? err.message : "Login failed");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="px-4 py-3 rounded-lg bg-accent-red/10 border border-accent-red/20 text-accent-red text-sm animate-slide-down">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="input-label">Email Address</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
          placeholder="admin@teamosis.com"
          required
          autoFocus
          autoComplete="email"
        />
      </div>

      <div>
        <label htmlFor="password" className="input-label">Password</label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input pr-12"
            placeholder="••••••••••"
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-muted text-xs"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="btn-primary w-full"
      >
        {isPending ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Signing in…
          </span>
        ) : (
          "Sign In"
        )}
      </button>

      <div className="text-center text-sm pt-2">
        <span className="text-ink-muted">Don't have an account? </span>
        <Link href="/signup" className="text-accent-blue hover:underline font-medium">
          Sign up
        </Link>
      </div>

      {/* Demo credentials */}
      <div className="pt-4 border-t border-surface-border">
        <p className="text-2xs text-ink-faint mb-3 text-center">Demo Accounts</p>
        <div className="grid gap-2">
          {[
            { email: "admin@teamosis.com", pass: "admin@teamosis2025", role: "Admin" },
            { email: "accounts@teamosis.com", pass: "manager@2025", role: "Accounts Manager" },
            { email: "entry@teamosis.com", pass: "entry@2025", role: "Entry Manager" },
          ].map((demo) => (
            <button
              key={demo.email}
              type="button"
              onClick={() => { setEmail(demo.email); setPassword(demo.pass); }}
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-2 hover:bg-surface-3 
                         border border-surface-border text-xs transition-colors group"
            >
              <span className="text-ink-secondary group-hover:text-ink-primary">{demo.email}</span>
              <span className="badge bg-surface-4 text-ink-muted">{demo.role}</span>
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
