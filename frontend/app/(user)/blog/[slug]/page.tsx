import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import {
  Calendar,
  Eye,
  ArrowLeft,
  ChevronRight,
  User,
  Tag,
  Clock,
  BookOpen,
} from "lucide-react";
import { API_URL } from "@/lib/api";
import BlogRenderer from "@/components/blog/BlogRenderer";
import BlogShareBar from "@/components/blog/BlogShareBar";

interface PageProps {
  params: {
    slug: string;
  };
}

async function fetchBlog(slug: string) {
  try {
    const res = await fetch(`${API_URL}/api/public/blog/${slug}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.success ? json : null;
  } catch (err) {
    console.error("Error fetching blog post:", err);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await fetchBlog(params.slug);
  if (!data || !data.data) {
    return {
      title: "Blog Post Not Found - Alpha Result",
    };
  }

  const post = data.data;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://alpharesult.in";
  const postUrl = `${siteUrl}/blog/${post.slug}`;

  return {
    title: `${post.title} | Alpha Result`,
    description: post.excerpt || "Latest academic update, exam news, and syllabus revision from Alpha Result.",
    keywords: post.tags?.join(", ") || "BEU, Exam, Syllabus, News, Alpha Result",
    openGraph: {
      title: post.title,
      description: post.excerpt || "Read the latest update on Alpha Result",
      url: postUrl,
      type: "article",
      publishedTime: post.published_at || post.created_at,
      images: post.cover_image ? [{ url: post.cover_image }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt || "Read the latest update on Alpha Result",
      images: post.cover_image ? [post.cover_image] : [],
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const data = await fetchBlog(params.slug);
  if (!data || !data.data) {
    notFound();
  }

  const post = data.data;
  const related = data.related || [];

  const publishedDateStr = post.published_at
    ? new Date(post.published_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const updatedDateStr = post.updated_at
    ? new Date(post.updated_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <article className="min-h-screen pb-20 bg-slate-50/50">
      {/* ===== BREADCRUMB & TOP HEADER ===== */}
      <div className="bg-white border-b border-slate-200/80 py-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 overflow-x-auto">
            <Link href="/" className="hover:text-indigo-600 transition">
              Home
            </Link>
            <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
            <Link href="/blog" className="hover:text-indigo-600 transition">
              Blog
            </Link>
            <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="text-slate-800 font-medium truncate max-w-xs">
              {post.title}
            </span>
          </nav>
        </div>
      </div>

      {/* ===== ARTICLE HERO ===== */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {post.category || "General"}
            </span>

            {post.version > 1 && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-medium">
                Updated (Rev {post.version})
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              {post.excerpt}
            </p>
          )}

          {/* Meta Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 text-xs text-slate-500">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1 font-medium text-slate-700">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Alpha Result
              </span>

              {publishedDateStr && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {publishedDateStr}
                </span>
              )}

              {updatedDateStr && updatedDateStr !== publishedDateStr && (
                <span className="flex items-center gap-1 text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Updated {updatedDateStr}
                </span>
              )}
            </div>

            <BlogShareBar title={post.title} />
          </div>
        </div>

        {/* Cover Image */}
        {post.cover_image && (
          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm max-h-[440px] bg-slate-100">
            <img
              src={post.cover_image}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* ===== ARTICLE MAIN BODY ===== */}
        <div className="bg-white rounded-2xl p-6 sm:p-10 border border-slate-200 shadow-xs">
          <BlogRenderer
            blocks={post.blocks}
            content={post.content}
            alertBox={post.alert_box}
            tables={post.tables}
            subTopics={post.sub_topics}
          />

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="pt-8 mt-8 border-t border-slate-200 flex items-center gap-2 flex-wrap">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500 font-medium mr-1">Tags:</span>
              {post.tags.map((tg: string, idx: number) => (
                <span
                  key={idx}
                  className="px-2.5 py-0.5 rounded-md text-[11px] bg-slate-100 text-slate-700 border border-slate-200"
                >
                  #{tg}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ===== RELATED POSTS ===== */}
        {related && related.length > 0 && (
          <div className="pt-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              Related Updates in {post.category || "General"}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {related.map((rel: any) => (
                <Link
                  key={rel.slug}
                  href={`/blog/${rel.slug}`}
                  className="bg-white rounded-xl border border-slate-200 p-4 hover:border-indigo-300 hover:shadow-sm transition flex flex-col justify-between space-y-2 group"
                >
                  <p className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600 transition line-clamp-2">
                    {rel.title}
                  </p>
                  <span className="text-[10px] text-slate-400">
                    {rel.published_at
                      ? new Date(rel.published_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })
                      : "Recent"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Back Link */}
        <div className="pt-4 text-center">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to all blogs & announcements
          </Link>
        </div>
      </div>
    </article>
  );
}
