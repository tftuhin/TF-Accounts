"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signupAction, acceptInviteAction } from "./actions";

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isInvite, setIsInvite] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");
    const invitedEmail = searchParams.get("email");

    setIsInvite(!!token);

    // Auto-fill email for invited users
    if (invitedEmail) {
      setEmail(invitedEmail);
    }
  }, [searchParams]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (isInvite) {
      // Invite acceptance: only password required
      if (!password || !confirmPassword) {
        setError("Password is required");
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

      const token = searchParams.get("token");
      if (!token) {
        setError("Invalid invitation link");
        return;
      }

      startTransition(async () => {
        const result = await acceptInviteAction(token, password, email);
        if (result.error) {
          setError(result.error);
        } else {
          setSuccess("Invitation accepted! Redirecting to dashboard...");
          setTimeout(() => router.push("/dashboard"), 2000);
        }
      });
    } else {
      // Regular signup or invitation signup
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
        const token = searchParams.get("token");
        const result = await signupAction(email, password, fullName, token || undefined);
        if (result.error) {
          setError(result.error);
        } else {
          setSuccess("Account created successfully! Redirecting to dashboard...");
          setFullName("");
          setEmail("");
          setPassword("");
          setConfirmPassword("");
          setTimeout(() => router.push("/dashboard"), 2000);
        }
      });
    }
  }


  return (
    <div className="space-y-5">
      {error && (
        <div className="px-4 py-3 rounded-lg bg-accent-red/10 border border-accent-red/20 text-accent-red text-sm animate-slide-down">
          {error}
        </div>
      )}

      {success && (
        <div className="space-y-3">
          <div className="px-4 py-3 rounded-lg bg-accent-green/10 border border-accent-green/20 text-accent-green text-sm animate-slide-down">
            {success}
          </div>
          <div className="text-xs text-ink-faint space-y-2 text-center">
            <p>Redirecting to dashboard...</p>
          </div>
        </div>
      )}

      {isInvite && (
        <div className="px-4 py-3 rounded-lg bg-accent-blue/10 border border-accent-blue/20 text-accent-blue text-sm">
          You've been invited to Teamosis Ledger — create your account to get started
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
          autoFocus={!isInvite}
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
          disabled={isPending || isInvite}
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

      {!isInvite && (
        <div className="pt-2 text-center text-sm">
          <span className="text-ink-muted">Already have an account? </span>
          <Link href="/login" className="text-accent-blue hover:underline font-medium">
            Sign in
          </Link>
        </div>
      )}

      {isInvite && (
        <div className="pt-2 text-center text-xs text-ink-faint">
          Your role has been predefined by your admin
        </div>
      )}
    </div>
  );
}
