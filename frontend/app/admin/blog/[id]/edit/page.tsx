"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiGet, apiPut } from "@/lib/api";
import {
  ArrowLeft,
  Save,
  Send,
  Eye,
  Edit3,
  History,
  Tag,
  Clock,
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

export default function EditBlogPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { user, loading } = useAuth();

  // Blog existing details
  const [fetching, setFetching] = useState(true);
  const [currentVersion, setCurrentVersion] = useState<number>(1);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("Exam");
  const [tags, setTags] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [status, setStatus] = useState<"published" | "draft">("published");

  // Modular Blocks
  const [blocks, setBlocks] = useState<BlogBlock[]>([]);

  // Revision Tracking
  const [changeSummary, setChangeSummary] = useState("");

  // UI State
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [submitting, setSubmitting] = useState(false);

  // 🔐 Role Guard
  useEffect(() => {
    if (!loading && (!user || (user.role !== "admin" && user.role !== "superalpha"))) {
      router.replace("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || (user.role !== "admin" && user.role !== "superalpha") || !id) return;
    loadBlogData();
  }, [user, loading, id]);

  async function loadBlogData() {
    try {
      setFetching(true);
      const res = await apiGet(`/admin/blog/${id}`);
      if (res?.success && res.data) {
        const d = res.data;
        setTitle(d.title || "");
        setSlug(d.slug || "");
        setCategory(d.category || "General");
        setTags(Array.isArray(d.tags) ? d.tags.join(", ") : "");
        setCoverImage(d.cover_image || "");
        setExcerpt(d.excerpt || "");
        setStatus(d.status || "published");
        setCurrentVersion(d.version || 1);

        if (d.blocks && Array.isArray(d.blocks) && d.blocks.length > 0) {
          setBlocks(d.blocks);
        } else {
          // Convert legacy fields into initial modular blocks
          const initialBlocks: BlogBlock[] = [];
          if (d.alert_box && d.alert_box.message) {
            initialBlocks.push({
              id: "b_alert_0",
              type: "alert",
              data: d.alert_box,
            });
          }
          if (d.content) {
            initialBlocks.push({
              id: "b_md_0",
              type: "markdown",
              data: { content: d.content },
            });
          }
          if (d.tables && Array.isArray(d.tables) && d.tables.length > 0) {
            d.tables.forEach((tbl: any, idx: number) => {
              initialBlocks.push({
                id: `b_tbl_${idx}`,
                type: "table",
                data: tbl,
              });
            });
          }
          if (d.sub_topics && Array.isArray(d.sub_topics) && d.sub_topics.length > 0) {
            d.sub_topics.forEach((st: any, idx: number) => {
              initialBlocks.push({
                id: `b_st_${idx}`,
                type: "sub_topic",
                data: st,
              });
            });
          }
          setBlocks(initialBlocks);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load post data");
    } finally {
      setFetching(false);
    }
  }

  async function handleUpdate(targetStatus: "published" | "draft") {
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
        change_summary: changeSummary.trim() || `Updated to version ${currentVersion + 1}`,
      };

      const res = await apiPut(`/admin/blog/${id}`, payload);
      if (res?.success) {
        toast.success(`Post updated! New revision: v${res.version}`);
        router.push("/admin/blog");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update post");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F1A] text-slate-300">
        Loading post details...
      </div>
    );
  }

  if (!user || (user.role !== "admin" && user.role !== "superalpha")) {
    return null;
  }

  const categories = ["Exam", "Result", "Syllabus", "News", "College", "Guide", "General"];

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
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">Edit Post</h1>
                <span className="text-xs px-2 py-0.5 rounded-md font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Active Version: v{currentVersion}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Saving changes will create a new version snapshot and preserve history
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* View Revisions Button */}
            <Link
              href={`/admin/blog/${id}/revisions`}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 transition"
            >
              <History className="w-3.5 h-3.5" />
              Revision History
            </Link>

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
              onClick={() => handleUpdate("draft")}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-slate-200 transition cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              Save as Draft
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleUpdate("published")}
              className="flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? "Updating..." : `Publish (v${currentVersion + 1})`}
            </button>
          </div>
        </div>

        {/* Change Summary Box */}
        <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-xl p-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-indigo-400 shrink-0" />
          <div className="flex-1">
            <label className="block text-xs font-semibold text-indigo-200 mb-1">
              Revision Note / Change Summary (For Version History Log)
            </label>
            <input
              type="text"
              placeholder="e.g. Added revised syllabus comparison table and corrected exam date"
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              className="w-full bg-[#0B0F1A] border border-indigo-500/30 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400"
            />
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
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
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
                      onChange={(e) => setSlug(slugify(e.target.value))}
                      className="bg-transparent focus:outline-none w-full text-white"
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
                  Short Excerpt / Summary
                </label>
                <textarea
                  rows={2}
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
                  Preview • Version {currentVersion + 1}
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                {title || "Untitled Post"}
              </h1>
              {excerpt && (
                <p className="text-base text-slate-600 leading-relaxed">{excerpt}</p>
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
