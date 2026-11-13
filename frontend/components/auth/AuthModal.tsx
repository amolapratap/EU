"use client";

import { createContext, useContext, useState, useRef } from "react";

import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";
import OtpVerifyForm from "./OtpVerifyForm";
import ForgotPasswordForm from "./ForgotPasswordForm";
import ResetPasswordForm from "./ResetPasswordForm";

type AuthView =
  | "login"
  | "signup"
  | "otp"
  | "forgot"
  | "reset";

export const ModalContext = createContext<any>(null);

export function AuthModalProvider({ children }: any) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<AuthView>("login");
  const [emailForOtp, setEmailForOtp] = useState("");

  const modalRef = useRef<HTMLDivElement>(null);

  // ---------------- VIEW HANDLERS ----------------

  const showLogin = () => {
    setView("login");
    setOpen(true);
  };

  const showSignup = () => {
    setView("signup");
    setOpen(true);
  };

  const showOtp = (email: string) => {
    setEmailForOtp(email);
    setView("otp");
    setOpen(true);
  };

  const showForgot = () => {
    setView("forgot");
    setOpen(true);
  };

  const showReset = (email: string) => {
    setEmailForOtp(email);
    setView("reset");
    setOpen(true);
  };

  const hide = () => setOpen(false);

  // ---------------- OUTSIDE CLICK ----------------

  const handleOverlayClick = (e: any) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      hide();
    }
  };

  return (
    <ModalContext.Provider
      value={{
        showLogin,
        showSignup,
        showOtp,
        showForgot,
        showReset,
      }}
    >
      {children}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center
                     bg-black/60 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={handleOverlayClick}
        >
          <div
            ref={modalRef}
            className="modal-glass relative w-full max-w-[400px] rounded-2xl shadow-2xl animate-scaleIn overflow-hidden"
          >
            {/* MOBILE-FRIENDLY CLOSE BUTTON */}
            <button
              type="button"
              onClick={hide}
              className="absolute right-3.5 top-3.5 z-20 text-slate-400 hover:text-slate-600 bg-white/40 hover:bg-white/80 rounded-full p-1.5 transition"
              aria-label="Close modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            <div className="max-h-[85vh] overflow-y-auto p-5 sm:p-6">
              {/* ---------------- LOGIN ---------------- */}
              {view === "login" && (
                <LoginForm
                  showSignup={showSignup}
                  showForgot={showForgot}
                  hide={hide}
                />
              )}

              {/* ---------------- SIGNUP ---------------- */}
              {view === "signup" && (
                <SignupForm
                  showLogin={showLogin}
                  showOtp={showOtp}
                  hide={hide}
                />
              )}

              {/* ---------------- SIGNUP OTP ---------------- */}
              {view === "otp" && (
                <OtpVerifyForm
                  email={emailForOtp}
                  hide={hide}
                  backToSignup={showSignup}
                  showLogin={showLogin}
                />
              )}

              {/* ---------------- FORGOT PASSWORD ---------------- */}
              {view === "forgot" && (
                <ForgotPasswordForm
                  showReset={showReset}
                  showLogin={showLogin}
                />
              )}

              {/* ---------------- RESET PASSWORD ---------------- */}
              {view === "reset" && (
                <ResetPasswordForm
                  email={emailForOtp}
                  showForgot={showForgot}
                  showLogin={showLogin}
                  hide={hide}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

// ---------------- EXPORT HOOK ----------------

export function useAuthModal() {
  return useContext(ModalContext);
}
