"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api";

export default function ForgotPasswordForm({
  showReset,
  showLogin,
}: {
  showReset: (email: string) => void;
  showLogin: () => void;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSendOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError("");

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Please enter your email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      await apiPost("/auth/forgot-password", { email: cleanEmail });
      showReset(cleanEmail);
    } catch (e: any) {
      setError(e.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSendOtp} className="space-y-4">
      <div>
        <h2 className="text-xl font-bold mb-1">Forgot Password</h2>
        <p className="text-sm text-slate-500">
          Enter your registered email. We’ll send an OTP to reset your password.
        </p>
      </div>

      {/* INLINE ERROR */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg p-2.5">
          {error}
        </div>
      )}

      <div>
        <input
          className="input w-full text-base sm:text-sm"
          type="email"
          placeholder="Email Address"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <button
        type="submit"
        className="btn-primary w-full mt-2"
        disabled={loading || !email.trim()}
      >
        {loading ? "Sending OTP..." : "Send OTP"}
      </button>

      <div className="text-sm pt-2 flex justify-start">
        <button
          type="button"
          className="flex items-center gap-1 text-primary font-semibold hover:underline"
          onClick={showLogin}
        >
          <span aria-hidden>←</span>
          Back to login
        </button>
      </div>
    </form>
  );
}
