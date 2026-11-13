"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api";

export default function ResetPasswordForm({
  email,
  showLogin,
  showForgot,
  hide,
}: {
  email: string;
  showLogin: () => void;
  showForgot: () => void;
  hide: () => void;
}) {
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleReset(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError("");
    setSuccess("");

    const cleanOtp = otp.trim();
    const cleanPassword = password.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanOtp) {
      setError("Please enter the OTP sent to your email");
      return;
    }

    if (cleanPassword.length < 6) {
      setError("New password must be at least 6 characters long");
      return;
    }

    if (cleanPassword !== cleanConfirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      await apiPost("/auth/reset-password", {
        email: email.trim(),
        otp: cleanOtp,
        new_password: cleanPassword,
      });

      setSuccess("Password reset successful! Redirecting to login...");
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
    <form onSubmit={handleReset} className="space-y-4">
      <div>
        <h2 className="text-xl font-bold mb-1">Reset Password</h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Enter the OTP sent to your email and set a new password.
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

      {/* Email (readonly) */}
      <div className="space-y-1">
        <label className="text-xs text-slate-400">Account Email</label>
        <div className="flex items-center gap-2">
          <input
            className="input flex-1 bg-slate-50 text-base sm:text-sm"
            value={email}
            disabled
          />
          <button
            type="button"
            onClick={showForgot}
            className="text-xs text-primary font-semibold hover:underline px-2 py-1"
          >
            Change
          </button>
        </div>
      </div>

      {/* OTP */}
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

      {/* New password with eye toggle */}
      <div className="relative">
        <input
          className="input pr-11 w-full text-base sm:text-sm"
          type={showPwd ? "text" : "password"}
          placeholder="New password (min. 6 characters)"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setShowPwd(!showPwd)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-1.5"
          tabIndex={-1}
        >
          {showPwd ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>

      {/* Confirm password */}
      <div>
        <input
          className={`input w-full text-base sm:text-sm ${
            confirmPassword && password !== confirmPassword ? "border-red-400 focus:border-red-500" : ""
          }`}
          type={showPwd ? "text" : "password"}
          placeholder="Confirm new password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>

      <button
        type="submit"
        className="btn-primary w-full py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50"
        disabled={loading || !otp.trim() || !password.trim() || !confirmPassword.trim() || !!success}
      >
        {loading ? "Resetting..." : "Reset Password"}
      </button>

      <div className="text-sm pt-1 text-center">
        <button
          type="button"
          className="text-primary hover:underline font-semibold text-xs sm:text-sm"
          onClick={showLogin}
        >
          ← Back to login
        </button>
      </div>
    </form>
  );
}
