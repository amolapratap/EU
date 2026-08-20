"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuthModal } from "@/components/auth/AuthModal";
import { useAuth } from "@/lib/auth";
import { Check, ClipboardList } from "lucide-react";
import McqTestPromoBanner from "@/components/test/McqTestPromoBanner";

export default function HomePage() {
  const { showLogin, showSignup } = useAuthModal();
  const { user } = useAuth();

  return (
    <div className="space-y-20">

      {/* ================= HERO ================= */}
<section className="relative ">
  <div
    className="relative rounded-3xl overflow-hidden
               bg-gradient-to-br from-[#5B2EBD] via-[#6D3FD3] to-[#7C4DFF]
               text-white border border-white/20 shadow-2xl"
  >
    {/* Subtle Glow Effect */}
    {/* <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.15),transparent_60%)]" /> */}

    <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-24 text-center">

      {/* HEADLINE */}
      <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight">
        Smarter Exam Preparation
        <br />
        <span className="text-indigo-100">For BEU Students</span>
      </h1>

      {/* SUBTEXT */}
      <p className="mt-5 text-lg text-indigo-100 max-w-2xl mx-auto leading-relaxed">
        Access Previous Year Questions with Solutions, attempt MCQ tests in exam mode,
        check results instantly, and calculate CGPA — all in one simple platform.
      </p>

      {/* PRIMARY ACTIONS */}
      <div className="mt-10 flex justify-center gap-4 flex-wrap">

        <Link
          href="/test"
          className="px-8 py-3 rounded-xl bg-emerald-500 text-white
                     font-semibold shadow-lg
                     hover:scale-105 hover:bg-emerald-600 hover:shadow-xl
                     transition duration-200 inline-flex items-center gap-2"
        >
          <ClipboardList className="w-5 h-5" />
          Take MCQ Test
        </Link>

        <Link
          href="/pyq/download"
          className="px-8 py-3 rounded-xl bg-white text-[#5B2EBD]
                     font-semibold shadow-lg
                     hover:scale-105 hover:shadow-xl
                     transition duration-200"
        >
          Explore PYQs
        </Link>

        <Link
          href="/pyq"
          className="px-8 py-3 rounded-xl bg-white text-[#5B2EBD]
                     font-semibold shadow-lg
                     hover:scale-105 hover:shadow-xl
                     transition duration-200"
        >
          Solution
        </Link>

        

        {/* <Link
          href="/result"
          className="px-8 py-3 rounded-xl border border-white/40
                     bg-white/10 backdrop-blur
                     hover:bg-white/20
                     font-semibold transition"
        >
          Check Result
        </Link> */}

        <Link
          href="/cgpa"
          className="px-8 py-3 rounded-xl border border-white/40
                     bg-white/10 backdrop-blur
                     hover:bg-white/20
                     font-semibold transition"
        >
          Calculate CGPA
        </Link>
      </div>

      {/* AUTH CTA */}
      {!user && (
        <div className="mt-8 flex justify-center gap-4">
          <button
            onClick={showSignup}
            className="px-6 py-2 rounded-lg bg-white text-[#5B2EBD]
                       font-semibold hover:bg-gray-100 transition"
          >
            Create Free Account
          </button>

          <button
            onClick={showLogin}
            className="px-6 py-2 rounded-lg border border-white/40
                       hover:bg-white/10 transition"
          >
            Log In
          </button>
        </div>
      )}

      {/* TRUST STATS */}
      <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm text-indigo-100 opacity-90">
        <div>
          <p className="text-xl font-bold text-white">2000+</p>
          <p>Questions</p>
        </div>
        <div>
          <p className="text-xl font-bold text-white">100+</p>
          <p>Subjects</p>
        </div>
        <div>
          <p className="text-xl font-bold text-white">CBT</p>
          <p>MCQ Test Mode</p>
        </div>
        <div>
          <p className="text-xl font-bold text-white">Free</p>
          <p>For Students</p>
        </div>
      </div>

    </div>
  </div>
</section>

      {/* ================= MCQ TEST SPOTLIGHT ================= */}
      <section className="container mx-auto px-6">
        <McqTestPromoBanner />
      </section>



      {/* ================= FEATURES ================= */}
      <section className="container mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-10">
          Core Features
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard
            title="MCQ Test Mode"
            desc="Attempt objective papers in a timed CBT interface with instant scoring."
            href="/test"
            highlight
          />
          <FeatureCard
            title="Previous Year Questions"
            desc="Structured subject → paper → question navigation with solutions."
            href="/pyq/download"
          />
          <FeatureCard
            title="Solution Viewer"
            desc="Step-by-step solutions with markdown, images, and LaTeX support."
            href="/pyq"
          />
          <FeatureCard
            title="CGPA Calculator"
            desc="Calculate SGPA & CGPA quickly and accurately."
            href="/cgpa"
          />
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className="bg-slate-50 py-2">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-10">
            How AlphaResult Works
          </h2>

          <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <StepCard number="1" title="Login Once"
              desc="Your semester & branch are securely saved." />
            <StepCard number="2" title="Pick a Paper"
              desc="Browse PYQs by subject and year, or open the MCQ test catalog." />
            <StepCard number="3" title="Practice in CBT Mode"
              desc="Take objective tests with timer, palette navigation, and review." />
            <StepCard number="4" title="Track Progress"
              desc="View solutions, download PDFs, and check your test results." />
          </div>

          <p className="mt-6 text-slate-600 text-sm">
            🔓 Result & CGPA tools are available without login.
          </p>
        </div>
      </section>

      {/* ================= WHY CHOOSE ================= */}
      <section className="container mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-10">
          Why Choose AlphaResult?
        </h2>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">

          {[
            "Timed MCQ tests with instant evaluation",
            "Clean and distraction-free interface",
            "Mobile-optimized smooth navigation",
            "Structured subject-wise organization",
            "Fast loading & reliable performance",
            "Secure backend architecture",
            "Designed specifically for BEU syllabus"
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <Check className="text-[#5B2EBD]" size={18} />
              <p className="text-slate-700">{item}</p>
            </div>
          ))}

        </div>
      </section>

      {/* ================= FAQ ================= */}
<section className="py-8 bg-white">
  <div className="max-w-4xl mx-auto px-6">
    <h2 className="text-3xl font-semibold text-center mb-8">
      Frequently asked questions
    </h2>

    <FAQ />
  </div>
</section>

      {/* ================= FINAL CTA ================= */}
      {!user && (
<section className="py-14 bg-gradient-to-r from-[#5B2EBD] to-[#7C4DFF] text-white">
  <div className="max-w-4xl mx-auto px-6 text-center rounded-2xl py-12">
    <h3 className="text-2xl font-bold">
      Ready to Prepare Smarter?
    </h3>

    <p className="mt-3 text-indigo-100">
      Join AlphaResult today and simplify your academic journey.
    </p>

    <button
      onClick={showSignup}
      className="mt-6 bg-white text-[#5B2EBD] px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
    >
      Create Free Account
    </button>
  </div>
</section>
)}


    </div>
  );
}

/* ================= COMPONENTS ================= */

function FeatureCard({
  title,
  desc,
  href,
  highlight = false,
}: {
  title: string;
  desc: string;
  href?: string;
  highlight?: boolean;
}) {
  const content = (
    <div
      className={`rounded-2xl shadow-md p-6 hover:shadow-lg transition h-full ${
        highlight
          ? "bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200"
          : "bg-white"
      }`}
    >
      {highlight && (
        <span className="inline-block text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded mb-2">
          New
        </span>
      )}
      <h3 className={`font-semibold text-lg mb-2 ${highlight ? "text-emerald-900" : ""}`}>
        {title}
      </h3>
      <p className={`text-sm ${highlight ? "text-emerald-800/80" : "text-slate-600"}`}>
        {desc}
      </p>
      {href && (
        <p className={`mt-3 text-sm font-medium ${highlight ? "text-emerald-700" : "text-[#5B2EBD]"}`}>
          Explore →
        </p>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

function StepCard({ number, title, desc }: any) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <div className="w-10 h-10 rounded-full bg-[#5B2EBD] text-white 
                      flex items-center justify-center font-bold mb-3 mx-auto">
        {number}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-slate-600 text-sm">{desc}</p>
    </div>
  );
}


function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  const faqs = [
    {
      q: "What is MCQ Test Mode?",
      a: "MCQ Test Mode lets you attempt objective questions from previous year papers in a competitive exam-style interface. It includes a timer, question palette, mark for review, and instant score after you submit. Browse available tests at /test or start directly from any PYQ paper that has objective questions."
    },
    {
      q: "Do I need to login to access PYQs?",
      a: "Yes. Only logged-in users can access PYQs. Your semester and branch are automatically saved for faster navigation."
    },
    {
      q: "Can I check results without logging in?",
      a: "Yes. Result checking and CGPA calculator are available without login."
    },
    {
      q: "Are PDFs downloadable?",
      a: "Yes. Admin-uploaded PDFs can be downloaded directly by students."
    },
    {
      q: "Is AlphaResult completely free?",
      a: "Yes. AlphaResult is 100% free for students."
    },
  ];

  return (
    <div className="border-t border-slate-200">
      {faqs.map((faq, index) => {
        const isOpen = open === index;

        return (
          <div
            key={index}
            className="border-b border-slate-200"
          >
            {/* QUESTION ROW */}
            <button
              onClick={() => setOpen(isOpen ? null : index)}
              className="w-full flex justify-between items-center py-5 text-left"
            >
              <span className="text-slate-900 text-base font-medium">
                {faq.q}
              </span>

              <span
                className={`text-slate-500 transition-transform duration-300 ${
                  isOpen ? "rotate-180" : ""
                }`}
              >
                ▼
              </span>
            </button>

            {/* ANSWER */}
            <div
              className={`grid transition-all duration-300 ease-in-out ${
                isOpen
                  ? "grid-rows-[1fr] opacity-100 pb-5"
                  : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <p className="text-slate-600 text-sm leading-relaxed">
                  {faq.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


