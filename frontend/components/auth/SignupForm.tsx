"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api";
import { SEMESTERS } from "@/lib/constants/academic";
import { BRANCHES } from "@/lib/constants/academic";

const semesters = SEMESTERS;
const branches = BRANCHES;

export default function SignupForm({ showLogin, showOtp }: any) {
  const [data, setData] = useState({
    name: "",
    email: "",
    password: "",
    semester: "",
    branch: "",
    mobile: "",
    reg_no: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSignup(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError("");

    // Trim inputs
    const name = data.name.trim();
    const email = data.email.trim();
    const password = data.password.trim();
    const mobile = data.mobile.trim();
    const reg_no = data.reg_no.trim();

    if (!name || !email || !password || !data.semester || !data.branch || !mobile || !reg_no) {
      setError("Please fill all required fields");
      return;
    }

    // Email check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    // Password minimum length check
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    // Mobile validation (10 digits only)
    if (!/^\d{10}$/.test(mobile)) {
      setError("Mobile number must be exactly 10 digits");
      return;
    }

    // Registration number validation (11 digits)
    if (!/^\d{11}$/.test(reg_no)) {
      setError("Invalid Registration No.");
      return;
    }

    try {
      setLoading(true);
      await apiPost("/auth/signup", {
        ...data,
        name,
        email,
        password,
        mobile,
        reg_no,
      });

      showOtp(email); // Switch view, keep modal open
    } catch (e: any) {
      setError(e.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSignup} className="space-y-3.5">
      <div className="text-center">
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
          Create Account
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Join Alpha Result and prepare smarter
        </p>
      </div>

      {/* INLINE ERROR DISPLAY */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl p-3 animate-fadeIn">
          {error}
        </div>
      )}

      {/* BASIC INFO */}
      <input
        className="input text-base sm:text-sm"
        placeholder="Full Name"
        autoComplete="name"
        value={data.name}
        onChange={e => setData({ ...data, name: e.target.value })}
      />
      <input
        className="input text-base sm:text-sm"
        placeholder="Email Address"
        type="email"
        autoComplete="email"
        value={data.email}
        onChange={e => setData({ ...data, email: e.target.value })}
      />

      {/* PASSWORD WITH EYE ICON */}
      <div className="relative">
        <input
          className="input pr-11 w-full text-base sm:text-sm"
          placeholder="Password (min. 6 characters)"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          value={data.password}
          onChange={e => setData({ ...data, password: e.target.value })}
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

      {/* ACADEMIC INFO */}
      <div className="grid grid-cols-2 gap-2.5">
        <select
          className="input text-base sm:text-sm"
          value={data.semester}
          onChange={e => setData({ ...data, semester: e.target.value })}
        >
          <option value="">Select Semester</option>
          {semesters.map(s => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          className="input text-base sm:text-sm"
          value={data.branch}
          onChange={e => setData({ ...data, branch: e.target.value })}
        >
          <option value="">Select Branch</option>
          {branches.map(b => (
            <option key={b.code} value={b.code}>
              {b.short_name}
            </option>
          ))}
        </select>
      </div>

      {/* CONTACT */}
      <div className="grid grid-cols-2 gap-2.5">
        <input
          className="input text-base sm:text-sm"
          placeholder="Mobile (10 digits)"
          inputMode="numeric"
          maxLength={10}
          autoComplete="tel"
          value={data.mobile}
          onChange={e => setData({ ...data, mobile: e.target.value })}
        />
        <input
          className="input text-base sm:text-sm"
          placeholder="Registration  No."
          inputMode="numeric"
          maxLength={11}
          value={data.reg_no}
          onChange={e => setData({ ...data, reg_no: e.target.value })}
        />
      </div>

      {/* CTA */}
      <button
        type="submit"
        className="btn-primary w-full py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50 mt-2"
        disabled={loading}
      >
        {loading ? "Creating account..." : "Sign Up"}
      </button>

      <div className="pt-1 text-center">
        <p className="text-xs sm:text-sm text-slate-500 flex items-center justify-center flex-wrap gap-1">
          <span>Already have an account?</span>
          <button
            type="button"
            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold transition border border-indigo-200 shadow-xs"
            onClick={showLogin}
          >
            Sign in
          </button>
        </p>
      </div>
    </form>
  );
}
