"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function LoginForm({ showSignup, showForgot, hide }: any) {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError("");

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError("Please enter your email and password");
      return;
    }

    try {
      setLoading(true);

      const res = await apiPost("/auth/login", { email: cleanEmail, password });

      // Save auth
      login(res.token, {
        user_id: res.user_id,
        email: cleanEmail,
        name: res.name || "NA",
        role: res.role,
        semester: res.semester,
        branch: res.branch,
      });

      hide();

      // Role-based redirect
      if (res.role === "admin") {
        router.push("/admin");
      } else {
        router.refresh();
      }

    } catch (e: any) {
      setError(e.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <h2 className="text-xl font-bold mb-1">Login</h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Welcome back to Alpha Result
        </p>
      </div>

      {/* INLINE ERROR */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl p-3 animate-fadeIn">
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

      {/* PASSWORD WITH EYE ICON */}
      <div className="relative">
        <input
          className="input pr-11 w-full text-base sm:text-sm"
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-1.5"
          tabIndex={-1}
        >
          {showPassword ? (
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

      <button
        type="submit"
        className="btn-primary w-full py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50"
        disabled={loading}
      >
        {loading ? "Signing in..." : "Login"}
      </button>

      <div className="flex flex-col gap-2.5 pt-2 text-center text-xs sm:text-sm">
        <p className="text-slate-500 flex items-center justify-center flex-wrap gap-1">
          <span>Don&apos;t have an account?</span>
          <button
            type="button"
            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold transition border border-indigo-200 shadow-xs"
            onClick={showSignup}
          >
            Sign up
          </button>
        </p>

        <p>
          <button
            type="button"
            className="text-slate-400 hover:text-slate-600 text-xs transition"
            onClick={showForgot}
          >
            Forgot password?
          </button>
        </p>
      </div>
    </form>
  );
}
