"use client"

import Link from "next/link";
import { useState } from "react";
import { apiPost } from "@/lib/api";
import { toast } from "sonner";



export default function Footer() {


  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  
  
  const handleSubscribe = async (
    e: React.FormEvent
  ) => {

    // if (!email){
    //   toast.error("Enter Email",{duration: 5000});
    //   // return;
    // }
  
    e.preventDefault();
  
    try {
  
      setLoading(true);
  
      const res = await apiPost(
        "/api/public/newsletter/subscribe",
        { email }
      );
  
      toast.success(
        res.message ||
        "Subscribed successfully"
      );
  
      setEmail("");
  
    } catch (err: any) {
  
      toast.error(
        err.message ||
        "Subscription failed"
      );
  
    } finally {
  
      setLoading(false);
  
    }
  };




  return (
    <footer className="bg-slate-900 text-slate-300 mt-20">
      <div className="container mx-auto px-4 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">

        {/* BRAND */}
        <div>
          <h2 className="text-white font-extrabold text-xl mb-3">
            Alpha Result
          </h2>
          <p className="text-sm leading-relaxed">
            Smarter exam preparation with PYQs, solutions, and tools designed
            especially for university students.
          </p>

          {/* CONTACT EMAIL */}
          <p className="text-sm mt-4">
            Contact us:
            <a
              href="mailto:alpharesult.in@gmail.com"
              className="ml-1 text-indigo-400 hover:text-indigo-300 underline"
            >
              alpharesult.in@gmail.com
            </a>
          </p>
        </div>

        {/* LINKS */}
        <div>
          <h3 className="text-white font-semibold mb-3">Platform</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/pyq/download" className="hover:text-white">PYQs</Link></li>
            <li><Link href="/pyq" className="hover:text-white">Solution</Link></li>
            {/* <li><Link href="/result" className="hover:text-white">Result</Link></li> */}
            <li><Link href="/cgpa" className="hover:text-white">CGPA</Link></li>
            <li><Link href="/blog" className="hover:text-white">Blog</Link></li>
            <li><Link href="/about" className="hover:text-white">About</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-white font-semibold mb-3">Legal & Support</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/privacy-policy" className="hover:text-white cursor-pointer">Privacy Policy</Link></li>
            <li><Link href="/terms-and-conditions" className="hover:text-white cursor-pointer">Terms & Conditions</Link></li>
            <li><Link href="/disclaimer" className="hover:text-white cursor-pointer">Disclaimer</Link></li>
            <li><Link href="/contact-us" className="hover:text-white">Contact Us</Link></li>
            <li><Link href="/help" className="hover:text-white">Help</Link></li>
          </ul>
        </div>

        {/* NEWSLETTER (optional future use) */}
        {/* <div>
          <h3 className="text-white font-semibold mb-3">Stay Updated</h3>
          <div className="flex">
            <input
              className="flex-1 px-4 py-2 rounded-l-lg bg-slate-800 outline-none text-sm"
              placeholder="Email address"
            />
            <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-r-lg">
              →
            </button>
          </div>
        </div> */}
        {/* NEWSLETTER / COMMUNITY */}
              <div className="space-y-4">

                  <div>

                      <h3 className="text-white font-semibold text-lg">
                        Stay Updated
                      </h3>

                      <p className="text-slate-400 text-sm mt-1 leading-relaxed">
                        Get updates about PYQs, notes, exam resources,
                        and important student announcements.
                      </p>

                    </div>

                    <form
                      onSubmit={handleSubscribe}
                      // className="flex flex-col sm:flex-row gap-3"
                      className="flex items-center rounded-2xl overflow-hidden border border-slate-700 bg-slate-800/80 focus-within:ring-2 focus-within:ring-indigo-500/30 transition"
                    >
                      <input
                        type="email"
                        value={email}
                        onChange={(e) =>
                          setEmail(e.target.value)
                        }
                        // className="flex-1 min-w-0 px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 outline-none text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/30 transition"
                        className="flex-1 min-w-0 px-4 py-3 bg-transparent outline-none text-sm text-white placeholder:text-slate-500"
                        placeholder="Enter your email"
                      />
                        <button
                        type="submit"
                        disabled={loading}
                        className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-medium whitespace-nowrap transition-all duration-200 shrink-0"
                      >

                        {loading
                          ? "Please wait..."
                          : "Subscribe"}

                      </button>
                    </form>



                    <p className="text-xs text-slate-500 leading-relaxed">
                      No spam. Only useful academic updates for Bihar Engineering students.
                    </p>

                </div>


      </div>

      {/* MOVING CREDIT BAR */}
      {/* <div className="border-t border-slate-700 overflow-hidden">
        <div className="whitespace-nowrap animate-marquee py-4 text-sm text-slate-400">
          <span className="mx-8">
            Designed & Developed with ❤️ by Alpha Team of K.E.C Katihar
          </span>
        </div>
      </div> */}

{/* MOVING CREDIT BAR */}
<div className="border-t border-slate-700 overflow-hidden">
  <div className="whitespace-nowrap py-4 text-sm text-slate-400 animate-marquee-left">
    <span className="mx-8">
      Designed & Developed with ❤️ by Alpha Team of K.E.C Katihar
    </span>
  </div>
</div>

        <div className="text-center text-xs py-3 text-slate-500">
          © {new Date().getFullYear()} Alpha Result. All rights reserved.
        </div>

    </footer>
  );
}
