"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiPost } from "@/lib/api";
import {
  ArrowLeft,
  Save,
  Send,
  Eye,
  Edit3,
  Tag,
  Sparkles,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import LocalImageUploader from "@/components/blog/LocalImageUploader";
import ModularBlockEditor, { BlogBlock } from "@/components/blog/ModularBlockEditor";
import BlogRenderer from "@/components/blog/BlogRenderer";

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CreateBlogPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Basic Metadata
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [category, setCategory] = useState("Exam");
  const [tags, setTags] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [excerpt, setExcerpt] = useState("");

  // Modular Blocks Architecture
  const [blocks, setBlocks] = useState<BlogBlock[]>([
    {
      id: "init_md_1",
      type: "markdown",
      data: {
        content: "## Overview\n\nWrite your announcement or article content here. You can use standard Markdown, bullet lists, and LaTeX equations like $E = mc^2$ or $\\int_{a}^{b} f(x) dx$.",
      },
    },
  ]);

  // UI State
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [submitting, setSubmitting] = useState(false);

  // 🔐 Role Guard
  useEffect(() => {
    if (!loading && (!user || (user.role !== "admin" && user.role !== "superalpha"))) {
      router.replace("/");
    }
  }, [user, loading, router]);

  function handleTitleChange(val: string) {
    setTitle(val);
    if (!slugManual) {
      setSlug(slugify(val));
    }
  }

  async function handleSubmit(targetStatus: "published" | "draft") {
    if (!title.trim()) {
      toast.error("Please enter a title for the post");
      return;
    }

    try {
      setSubmitting(true);
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        title: title.trim(),
        slug: slug.trim() || slugify(title),
        category,
        tags: tagList,
        cover_image: coverImage.trim(),
        excerpt: excerpt.trim(),
        blocks: blocks,
        status: targetStatus,
      };

      const res = await apiPost("/admin/blog", payload);
      if (res?.success) {
        toast.success(
          targetStatus === "published"
            ? "Post published successfully!"
            : "Draft saved successfully!"
        );
        router.push("/admin/blog");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create post");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F1A] text-slate-300">
        Verifying permissions...
      </div>
    );
  }

  if (!user || (user.role !== "admin" && user.role !== "superalpha")) {
    return null;
  }

  const categories = [
    "Exam",
    "Result",
    "Syllabus",
    "News",
    "College",
    "Guide",
    "General",
  ];

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* ===== TOP BAR ===== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/blog"
              className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white">Create New Post</h1>
              <p className="text-xs text-slate-400">
                Modular builder: add local images, tables, LaTeX math, and sub-topics anywhere in any order
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Tab switch */}
            <div className="flex bg-[#11172C] p-1 rounded-lg border border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab("edit")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                  activeTab === "edit"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                Editor
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                  activeTab === "preview"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Live Preview
              </button>
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit("draft")}
              className="flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-slate-200 transition cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              Save Draft
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit("published")}
              className="flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? "Publishing..." : "Publish Post"}
            </button>
          </div>
        </div>

        {/* ===== TAB CONTENT ===== */}
        {activeTab === "edit" ? (
          <div className="space-y-6">
            {/* Basic Metadata */}
            <div className="bg-[#11172C] border border-white/10 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white">General Information</h3>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. BEU 7th Sem Exam Schedule & Revised Syllabus"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full bg-[#0B0F1A] border border-white/15 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Slug (URL address)
                  </label>
                  <div className="flex items-center bg-[#0B0F1A] border border-white/15 rounded-lg px-3 py-2 text-xs text-slate-300">
                    <span className="text-slate-500 mr-1 select-none">/blog/</span>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => {
                        setSlugManual(true);
                        setSlug(slugify(e.target.value));
                      }}
                      className="bg-transparent focus:outline-none w-full text-white"
                      placeholder="post-slug-url"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#0B0F1A] border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-slate-500" />
                  Tags (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="BEU, CSE, Exam 2026, Routine"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full bg-[#0B0F1A] border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Cover Image Uploader from Local Device */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Cover Image (Upload from Local Device or Paste Link)
                </label>
                <LocalImageUploader
                  value={coverImage}
                  onChange={setCoverImage}
                  label="Upload Cover Image from Computer"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Short Excerpt / Summary (Used for Google SEO and Social Cards)
                </label>
                <textarea
                  rows={2}
                  placeholder="A concise 1-2 sentence summary of what this post or news is about..."
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  className="w-full bg-[#0B0F1A] border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Modular Blocks Builder */}
            <div className="bg-[#11172C] border border-white/10 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    Article Sections & Blocks
                  </h3>
                  <p className="text-xs text-slate-400">
                    Add Text with LaTeX equations, Upload local images, insert custom tables, sub-topics, or alerts
                  </p>
                </div>
              </div>

              <ModularBlockEditor blocks={blocks} onChange={setBlocks} />
            </div>
          </div>
        ) : (
          /* Live Preview View */
          <div className="bg-white rounded-2xl p-6 sm:p-10 shadow-lg border border-slate-200">
            <div className="border-b border-slate-200 pb-6 mb-8 space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {category}
                </span>
                <span className="text-xs text-slate-400">
                  Preview • Version 1 (Draft)
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                {title || "Untitled Post"}
              </h1>
              {excerpt && (
                <p className="text-base text-slate-600 leading-relaxed">
                  {excerpt}
                </p>
              )}
            </div>

            {coverImage && (
              <div className="mb-8 rounded-xl overflow-hidden border border-slate-200 max-h-96">
                <img
                  src={coverImage}
                  alt={title}
                  className="w-full h-full object-cover"
                  onError={(e: any) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            )}

            <BlogRenderer blocks={blocks} />
          </div>
        )}
      </div>
    </div>
  );
}
