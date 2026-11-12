"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiGet, apiPut, apiDelete } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useAuthModal } from "@/components/auth/AuthModal";

import { SEMESTERS } from "@/lib/constants/academic";
import { BRANCHES } from "@/lib/constants/academic";

const semesters = SEMESTERS;
const branches = BRANCHES;


export default function AccountPage() {
  const { user, loading, logout } = useAuth();
  const { showForgot, showLogin } = useAuthModal() || {};
  const router = useRouter();


  // To get
  const [profile, setProfile] = useState<any>(null);
  const [fetchError, setFetchError] = useState("");

  // To update
  const [semester, setSemester] = useState("");
  const [branch, setbranch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // For Account Deletion
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  /* ---------------- FETCH PROFILE ---------------- */
  useEffect(() => {
    if (!user) return;

    fetchprofile();

  }, [user]);

  /* ---------------- AUTO PROMPT LOGIN IF LOGGED OUT ---------------- */
  useEffect(() => {
    if (!loading && !user) {
      showLogin?.();
    }
  }, [loading, user]);

  async function fetchprofile() {
    setFetchError("");
    try {
      const json = await apiGet("/user/account");
      setProfile(json.data);
      setSemester(json.data.semester);
      setbranch(json.data.branch);
    } catch (err: any) {
      console.error(err.message);
      setFetchError(err.message || "Failed to load account profile");
    }
  }

  async function updateProfile() {
    if (!semester) return;

    setSaving(true);

    try {
      await apiPut("/user/account/edit", { semester, branch });
      alert("Semester updated successfully");
      fetchprofile();

      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.semester = semester;
        parsed.branch = branch;
        localStorage.setItem("user", JSON.stringify(parsed));
      }

      setShowModal(false);  // close modal
    } catch (e: any) {
      alert(e.message || "Failed to update semester");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteError("");
    const isGoogle = profile?.login_type === "google" && !profile?.has_password;

    if (!isGoogle && !deletePassword) {
      setDeleteError("Password is required to confirm account deletion.");
      return;
    }

    if (isGoogle && deleteConfirmText.trim().toUpperCase() !== "DELETE") {
      setDeleteError("Please type DELETE to confirm.");
      return;
    }

    setDeleting(true);
    try {
      await apiDelete("/auth/account", {
        password: isGoogle ? undefined : deletePassword,
        reason: deleteReason.trim() || undefined,
      });

      alert("Your account has been permanently deleted.");
      logout();
      router.push("/");
    } catch (e: any) {
      setDeleteError(e.message || "Failed to delete account. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  // 1. Initial auth loading
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  }

  // 2. Not logged in: Show clear sign-in screen instead of endless loading
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-7 h-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Sign in to View Account</h2>
            <p className="text-sm text-slate-500 mt-1">
              Please log in to view and manage your academic profile.
            </p>
          </div>
          <div className="space-y-2 pt-2">
            <button
              onClick={() => showLogin?.()}
              className="w-full btn-primary py-2.5 rounded-xl font-medium text-sm transition"
            >
              Log in
            </button>
            <button
              onClick={() => router.push("/")}
              className="w-full py-2.5 rounded-xl border text-slate-600 hover:bg-slate-50 font-medium text-sm transition"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Error loading profile
  if (fetchError && !profile) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border p-6 text-center space-y-4">
          <p className="text-sm text-red-600">{fetchError}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={fetchprofile}
              className="px-4 py-2 btn-primary rounded-xl text-sm"
            >
              Retry
            </button>
            <button
              onClick={() => {
                logout();
                router.push("/");
              }}
              className="px-4 py-2 border rounded-xl text-sm text-slate-600 hover:bg-slate-50"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Loading profile data
  if (!profile) {
    return (
      <div className="h-screen flex items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  }

  const isGoogleUser = profile?.login_type === "google" && !profile?.has_password;

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border p-6 space-y-8">
  
        {/* HEADER */}
        <div className="text-center">
          <h1 className="text-xl font-semibold text-slate-900">My Account</h1>
          <p className="text-sm text-slate-500">
            Manage your academic profile
          </p>
        </div>
  
        {/* BASIC INFO */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase text-slate-400">
            Personal Information
          </h3>
  
          <ProfileField label="Name" value={profile?.name} />
          <ProfileField label="Email" value={profile?.email} />
          <ProfileField label="Registration No." value={profile?.reg_no} />
          <ProfileField label="Mobile" value={profile?.mobile} />
          {(profile?.role === "admin" || profile?.role === "superalpha") && (
            <ProfileField label="Admin id" value={profile?.admin_userid} />
          )}
        </section>
  
        {/* ACADEMIC INFO */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase text-slate-400">
            Academic Information
          </h3>
  
          <ProfileField label="Branch" value={profile?.branch} />
          <ProfileField label="Semester" value={profile?.semester} />
  
          <button
            onClick={() => setShowModal(true)}
            className="w-full btn-primary mt-2"
          >
            Update Semester / Branch
          </button>
        </section>
  
        {/* LOGOUT & DISCRETE DELETE LINK */}
        <section className="pt-6 border-t border-slate-200">
          <button
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="w-full flex items-center justify-center gap-2
                       px-4 py-2.5 rounded-xl text-sm font-medium
                       text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
          >
            Logout
          </button>

          {/* Discrete / Small delete trigger like other platforms */}
          <div className="pt-5 text-center">
            <button
              onClick={() => {
                setDeleteError("");
                setDeletePassword("");
                setDeleteConfirmText("");
                setDeleteReason("");
                setShowDeleteModal(true);
              }}
              className="text-xs text-slate-400 hover:text-red-500 hover:underline transition"
            >
              Delete Account
            </button>
          </div>
        </section>
  
      </div>
  
      {/* ================= UPDATE MODAL ================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl">
  
            <h3 className="text-lg font-semibold">Update Academic Profile</h3>
            <p className="text-sm text-slate-500">
              Select your current semester and branch
            </p>
  
            <select
              className="input w-full"
              value={semester}
              onChange={e => setSemester(e.target.value)}
            >
              <option value="">Select semester</option>
              {semesters.map(s => (
                <option key={s.code} value={s.code}>
                  {s.code} – {s.name}
                </option>
              ))}
            </select>
  
            <select
              className="input w-full"
              value={branch}
              onChange={e => setbranch(e.target.value)}
            >
              <option value="">Select branch</option>
              {branches.map(b => (
                <option key={b.code} value={b.code}>
                  {b.code} – {b.short_name}
                </option>
              ))}
            </select>
  
            <div className="flex gap-3 pt-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 rounded-lg border text-slate-700 bg-slate-100 hover:bg-slate-200 text-sm font-medium transition"
              >
                Cancel
              </button>
  
              <button
                onClick={updateProfile}
                disabled={!semester || !branch || saving}
                className="flex-1 btn-primary text-sm font-medium transition disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= DELETE ACCOUNT CONFIRMATION MODAL ================= */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl border border-red-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Delete Account</h3>
                <p className="text-xs text-slate-500">
                  This action is permanent and cannot be undone.
                </p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl p-3 leading-relaxed">
              ⚠️ <strong>Warning:</strong> Your account will be permanently deleted and you will be logged out immediately. All access will be lost.
            </div>

            {deleteError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex flex-col gap-1.5">
                <span>{deleteError}</span>
                {!isGoogleUser && deleteError.toLowerCase().includes("password") && (
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeleteModal(false);
                        showForgot?.();
                      }}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline transition"
                    >
                      Forgot your password? Reset it here
                    </button>
                  </div>
                )}
              </div>
            )}

            {!isGoogleUser ? (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-700">
                    Enter Password to Confirm
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteModal(false);
                      showForgot?.();
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline transition"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Your account password"
                  className="w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Type <span className="font-bold text-red-600">DELETE</span> to Confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Reason for leaving (Optional)
              </label>
              <select
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white"
              >
                <option value="">Select a reason</option>
                <option value="Completed degree / Graduated">Completed degree / Graduated</option>
                <option value="Switching to another platform">Switching to another platform</option>
                <option value="Privacy concerns">Privacy concerns</option>
                <option value="Temporary break">Temporary break</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border text-slate-700 bg-slate-100 hover:bg-slate-200 text-sm font-medium transition disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={
                  deleting ||
                  (!isGoogleUser && !deletePassword) ||
                  (isGoogleUser && deleteConfirmText.trim().toUpperCase() !== "DELETE")
                }
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition shadow-sm"
              >
                {deleting ? "Deleting…" : "Permanently Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- FIELD ---------------- */
function ProfileField({ label, value }: any) {
  return (
    <div className="flex justify-between items-center rounded-lg border px-3 py-2 bg-slate-50 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium">{value || "-"}</span>
    </div>
  );
}
