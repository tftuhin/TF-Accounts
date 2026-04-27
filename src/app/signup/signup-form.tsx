"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signupAction, getGoogleOAuthUrl } from "./actions";
import { Chrome } from "lucide-react";

export function SignupForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!fullName || !email || !password || !confirmPassword) {
      setError("All fields are required");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    startTransition(async () => {
      const result = await signupAction(email, password, fullName);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("Account created successfully! Please check your email to verify your account.");
        setFullName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setTimeout(() => router.push("/login"), 3000);
      }
    });
  }

  function handleGoogleSignup() {
    setIsGoogleLoading(true);
    setError("");
    startTransition(async () => {
      const result = await getGoogleOAuthUrl();
      if (result.error) {
        setError(result.error);
        setIsGoogleLoading(false);
      } else if (result.url) {
        window.location.href = result.url;
      }
    });
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="px-4 py-3 rounded-lg bg-accent-red/10 border border-accent-red/20 text-accent-red text-sm animate-slide-down">
          {error}
        </div>
      )}

      {success && (
        <div className="px-4 py-3 rounded-lg bg-accent-green/10 border border-accent-green/20 text-accent-green text-sm animate-slide-down">
          {success}
        </div>
      )}

      <div>
        <label htmlFor="fullName" className="input-label">Full Name</label>
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="input"
          placeholder="John Doe"
          required
          autoFocus
          autoComplete="name"
          disabled={isPending}
        />
      </div>

      <div>
        <label htmlFor="email" className="input-label">Email Address</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
          placeholder="you@example.com"
          required
          autoComplete="email"
          disabled={isPending}
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
            autoComplete="new-password"
            disabled={isPending}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-muted text-xs"
            disabled={isPending}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        <p className="text-2xs text-ink-faint mt-1.5">At least 8 characters</p>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="input-label">Confirm Password</label>
        <input
          id="confirmPassword"
          type={showPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="input"
          placeholder="••••••••••"
          required
          autoComplete="new-password"
          disabled={isPending}
        />
      </div>

      <button
        type="submit"
        onClick={handleSubmit}
        disabled={isPending}
        className="btn-primary w-full"
      >
        {isPending ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Creating account…
          </span>
        ) : (
          "Create Account"
        )}
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-surface-border" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-surface-1 text-ink-faint">or</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignup}
        disabled={isPending || isGoogleLoading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                   border border-surface-border bg-surface-2 hover:bg-surface-3
                   transition-colors text-sm font-medium text-ink-primary disabled:opacity-50"
      >
        <Chrome className="w-4 h-4" />
        Sign up with Google
      </button>

      <div className="pt-2 text-center text-sm">
        <span className="text-ink-muted">Already have an account? </span>
        <Link href="/login" className="text-accent-blue hover:underline font-medium">
          Sign in
        </Link>
      </div>
    </div>
  );
}
