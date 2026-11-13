"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api";
import { useAuthModal } from "./AuthModal";

export default function OtpVerifyForm({ email, backToSignup }: any) {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { showLogin } = useAuthModal();

  async function handleVerify(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError("");
    setSuccess("");

    const cleanOtp = otp.trim();
    if (!cleanOtp) {
      setError("Please enter the verification OTP");
      return;
    }

    setLoading(true);

    try {
      await apiPost("/auth/verify-email", { email: email.trim(), otp: cleanOtp });
      setSuccess("Email verified successfully! Redirecting to login...");
      setTimeout(() => {
        showLogin();
      }, 1200);
    } catch (e: any) {
      setError(e.message || "Invalid or expired OTP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleVerify} className="space-y-4">
      <div>
        <h2 className="text-xl font-bold mb-1">Verify Email</h2>
        <p className="text-xs sm:text-sm text-slate-500">
          We sent a verification code to <span className="font-semibold text-slate-800 break-all">{email}</span>
        </p>
      </div>

      {/* INLINE ERROR */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl p-3 animate-fadeIn">
          {error}
        </div>
      )}

      {/* INLINE SUCCESS */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl p-3 animate-fadeIn">
          {success}
        </div>
      )}

      <div>
        <input
          className="input w-full text-base sm:text-sm tracking-widest text-center"
          placeholder="Enter 6-digit OTP"
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={loading || !otp.trim() || !!success}
        className="btn-primary w-full py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50"
      >
        {loading ? "Verifying..." : "Verify OTP"}
      </button>

      {backToSignup && (
        <div className="text-sm pt-1 text-center">
          <button
            type="button"
            className="text-primary hover:underline text-xs sm:text-sm font-medium"
            onClick={backToSignup}
          >
            ← Back to Sign Up
          </button>
        </div>
      )}
    </form>
  );
}
