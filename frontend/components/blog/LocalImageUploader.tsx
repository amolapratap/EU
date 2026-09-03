"use client";

import React, { useState, useRef } from "react";
import { Upload, Image as ImageIcon, X, Loader2, Link2, Check } from "lucide-react";
import { API_URL } from "@/lib/api";
import { toast } from "sonner";

interface LocalImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  className?: string;
}

export default function LocalImageUploader({
  value,
  onChange,
  label = "Upload Image from Device",
  className = "",
}: LocalImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WebP, etc.)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file is too large (max 10MB)");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

      const res = await fetch(`${API_URL}/admin/blog/upload-image`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.url) {
        throw new Error(data.detail || data.error || "Failed to upload image");
      }

      onChange(data.url);
      toast.success("Image uploaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image from device");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleManualUrlSubmit() {
    if (!manualUrl.trim()) return;
    onChange(manualUrl.trim());
    setShowUrlInput(false);
    setManualUrl("");
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelected}
        className="hidden"
      />

      {value ? (
        /* Image Preview Box */
        <div className="relative rounded-xl border border-white/15 bg-[#0B0F1A] overflow-hidden group">
          <div className="max-h-60 w-full overflow-hidden flex items-center justify-center bg-black/40">
            <img
              src={value}
              alt="Uploaded blog asset"
              className="max-h-60 w-auto object-contain"
            />
          </div>

          <div className="p-2.5 bg-[#11172C] flex items-center justify-between border-t border-white/10 text-xs">
            <span className="text-slate-400 truncate max-w-xs text-[11px] font-mono">
              {value}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
              >
                Change Image
              </button>
              <button
                type="button"
                onClick={() => onChange("")}
                className="text-xs text-red-400 hover:text-red-300 p-1 cursor-pointer"
                title="Remove image"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Upload Area */
        <div className="space-y-2">
          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
              uploading
                ? "border-indigo-500 bg-indigo-500/5 cursor-wait"
                : "border-white/15 hover:border-indigo-500/50 hover:bg-white/[0.02]"
            }`}
          >
            {uploading ? (
              <>
                <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                <p className="text-xs text-indigo-300 font-medium">
                  Uploading image to Cloudinary...
                </p>
              </>
            ) : (
              <>
                <div className="w-9 h-9 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">{label}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Click to browse from local computer (PNG, JPG, WebP up to 10MB)
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Optional Direct URL Toggle */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Or paste an existing image link</span>
            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
            >
              <Link2 className="w-3 h-3" />
              {showUrlInput ? "Hide Link Input" : "Paste Image URL"}
            </button>
          </div>

          {showUrlInput && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="https://..."
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                className="flex-1 bg-[#0B0F1A] border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button
                type="button"
                onClick={handleManualUrlSubmit}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
              >
                Set URL
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
