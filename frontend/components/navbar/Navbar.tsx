"use client";

import Image from "next/image";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useAuthModal } from "@/components/auth/AuthModal";
import { ChevronDown, Triangle, Menu, X } from "lucide-react";
import ProfileMenu from "./ProfileMenu";
import { GooglePlayIcon, PLAY_STORE_URL } from "@/components/app-promo/GooglePlayButton";

import { usePathname } from "next/navigation";

import { SEMESTERS, BRANCHES } from "@/lib/constants/academic";



type NavLink = {
  href: string;
  label: string;
};

const USER_NAV: NavLink[] = [
  { href: "/", label: "Home" },
  // { href: "/blog", label: "News & Blog" },
  { href: "/pyq/download", label: "PYQs" },
  { href: "/pyq", label: "Solution" },
  // { href: "/result", label: "Result"},
  { href: "/cgpa", label: "CGPA" },
  { href: "/pyq/missing-papers", label: "Missing Papers"},
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
  // { href: "/help", label: "Help" },
  { href: "/contact-us", label: "Contact-Us" },
];

const ADMIN_NAV: NavLink[] = [
  { href: "/admin", label: "Admin Dashboard" },
  { href: "/admin/blog", label: "Blogs & News" },
  { href: "/admin/ssb", label: "Subject" },
  { href: "/admin/papers", label: "Paper" },
  { href: "/admin/missing-papers", label: "Missing Papers"},
  { href: "/admin/pdf", label: "Watermark" },
];


function MegaMenu({
  id,
  label,
  basePath,
  openMenu,
  setOpenMenu,
}: {
  id: string;
  label: string;
  basePath: string;
  openMenu: string | null;
  setOpenMenu: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  const [activeSemester, setActiveSemester] = useState("");
  const [activeBranch, setActiveBranch] = useState("");

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpenMenu(id)}
      // onMouseLeave={() => setOpenMenu(null)}
      onMouseLeave={() => {
        setOpenMenu(null);
    
        setActiveSemester("");
        setActiveBranch("");
      }}
    >
      {/* <button className="hover:text-[#5B2EBD] font-medium">
        {label}
      </button> */}

              <button
                className="
                  flex items-center gap-1
                  hover:text-[#5B2EBD]
                  font-medium
                "
              >
              {label}
              <span
                className={`
                  text-[10px]
                  transition-transform duration-200
                  inline-block
                  ${
                    openMenu === id
                      ? "rotate-180"
                      : ""
                  }
                `}
              >
                ▼
              </span>
                
              </button>   

      <div
        className={`
          absolute top-full left-0 mt-1
          w-[450px]
          bg-white
          border
          rounded-2xl
          shadow-2xl
          z-[9999]
          transition-all duration-200

          ${
            openMenu === id
              ? "opacity-100 visible"
              : "opacity-0 invisible"
          }
        `}
      >
        <div className="grid grid-cols-[180px_1fr]">

          {/* SEMESTERS */}
          <div className="border-r bg-slate-50 rounded-l-2xl">

            {SEMESTERS.map((sem) => (
              <button
                key={sem.code}
                onMouseEnter={() =>
                  setActiveSemester(sem.code)
                }
                className={`
                  w-full text-left px-5 py-4
                  transition-colors

                  ${
                    activeSemester === sem.code
                    ? "bg-[#5B2EBD] text-white font-semibold"
                     : "hover:bg-slate-100"
                  }
                `}
              >
                {sem.name}
              </button>
            ))}

          </div>

          {/* BRANCHES */}
          <div className="p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500">
            Semester {activeSemester}
          </p>

            <div className="flex flex-col">

            {BRANCHES.map((branch) => (





              <Link
              key={branch.code}
                onMouseEnter={() =>
                  setActiveBranch(branch.code)
                }
                onClick={() => {
                  setOpenMenu(null);
                  setActiveSemester(null);
                  setActiveBranch("");
                }}
                className={`
                  w-full text-left px-5 py-4
                  transition-colors

                  ${
                    activeBranch === branch.code
                    ? "bg-[#1B21BD] text-white font-semibold"
                     : "hover:bg-slate-100"
                  }
                `}
                href={`${basePath}/${branch.code}/sem-${activeSemester}`}
                
                // className="
                //   px-4 py-3
                //   rounded-lg
                //   hover:bg-indigo-50
                //   hover:bg-slate-50
                //   hover:border-l-4
                //   hover:border-[#5B2EBD]
                //   hover:text-indigo-700
                //   transition
                //   flex justify-between
                // "

              >
                <span>{branch.full_name}</span>

                <span className="text-xs text-slate-400">
                  →
                </span>
              </Link>

              ))}

            </div>

          </div>

        </div>
      </div>
    </div>
  );
}


export default function Navbar() {
  const { user } = useAuth();
  const { showLogin } = useAuthModal();
  const [open, setOpen] = useState(false);
  const [mobileMenu, setMobileMenu] =
  useState<string | null>(null);

  const pathname = usePathname();
  
  const role = user?.role ?? "guest";
  const isAdmin = role === "admin" || role === "superalpha";
  const isAdminArea = pathname.startsWith("/admin");

const [openMenu, setOpenMenu] = useState<string | null>(null);

  
  
  let links: NavLink[] = USER_NAV;

  if (isAdmin) {
    if (isAdminArea) {
      // Admin mode
      links = [
        { href: "/", label: "Study" },
        ...ADMIN_NAV,
      ];
    } else {
      // Study mode
      links = [
        ...USER_NAV,
        { href: "/admin", label: "Admin Dashboard" },
      ];
    }
  }



  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md shadow-sm">
      <div className="container flex items-center justify-between py-4">

        {/* LOGO */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm border border-slate-200/80 group-hover:scale-105 transition-transform shrink-0">
            <Image
              src="/alpha_result_logo.png"
              alt="Alpha Result"
              width={40}
              height={40}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <div>
            <div className="font-extrabold text-lg text-slate-900 leading-tight">
              Alpha Result
            </div>
            <div className="text-xs text-slate-500">
              PYQs • Solutions • Tools
            </div>
          </div>
        </Link>

        {/* NAV LINKS */}
          {/* <nav className="hidden md:flex gap-8 font-medium text-slate-700">
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-[#5B2EBD]"
              >
                {link.label}
              </Link>
            ))}
          </nav> */}



<nav className="hidden md:flex gap-8 items-center">
{isAdminArea ? (

links.map(link => (
  <Link
    key={link.href}
    href={link.href}
    className="hover:text-[#5B2EBD]"
  >
    {link.label}
  </Link>
))

) : (<>

<Link href="/" className="
  font-medium
  text-slate-700
  hover:text-[#5B2EBD]
  transition-colors duration-200
  ">
  Home
  </Link>

  <MegaMenu
    id="pyq"
    label="PYQs"
    basePath="/pyq/download"
    openMenu={openMenu}
    setOpenMenu={setOpenMenu}
  />

  <MegaMenu
    id="solution"
    label="Solution"
    basePath="/pyq"
    openMenu={openMenu}
    setOpenMenu={setOpenMenu}
  />

  <MegaMenu
    id="cgpa"
    label="CGPA"
    basePath="/cgpa"
    openMenu={openMenu}
    setOpenMenu={setOpenMenu}
  />

<Link href="/pyq/missing-papers" 
  className="
  font-medium
  text-slate-700
  hover:text-[#5B2EBD]
  transition-colors duration-200
">
    Missing Papers
  </Link>

<Link href="/blog"
  className="
  font-medium
  text-slate-700
  hover:text-[#5B2EBD]
  transition-colors duration-200
">
    Blog
  </Link>

  <Link href="/about"
  className="
  font-medium
  text-slate-700
  hover:text-[#5B2EBD]
  transition-colors duration-200
">
    About
  </Link>



  {/* <Link href="/help"
  className="
  font-medium
  text-slate-700
  hover:text-[#5B2EBD]
  transition-colors duration-200
">
    Help
  </Link> */}

  <Link href="/contact-us" 
  className="
  font-medium
  text-slate-700
  hover:text-[#5B2EBD]
  transition-colors duration-200
">
    Contact-Us
  </Link>

  {isAdmin && (
    <Link href="/admin" 
    className="
  font-medium
  text-slate-700
  hover:text-[#5B2EBD]
  transition-colors duration-200
">
      Admin Dashboard
    </Link>
  )}
</>
)}
</nav>





{/* <nav className="hidden md:flex gap-8 font-medium text-slate-700 items-center">

  <Link href="/" className="
  font-medium
  text-slate-700
  hover:text-[#5B2EBD]
  transition-colors duration-200
  ">
  Home
  </Link>

  <MegaMenu
  id="pyq"
  label="PYQs"
  basePath="/pyq/download"
  openMenu={openMenu}
  setOpenMenu={setOpenMenu}
/>

<MegaMenu
  id="solution"
  label="Solution"
  basePath="/pyq"
  openMenu={openMenu}
  setOpenMenu={setOpenMenu}
/>

<MegaMenu
  id="cgpa"
  label="CGPA"
  basePath="/cgpa"
  openMenu={openMenu}
  setOpenMenu={setOpenMenu}
/>

  <Link href="/pyq/missing-papers" 
  className="
  font-medium
  text-slate-700
  hover:text-[#5B2EBD]
  transition-colors duration-200
">
    Missing Papers
  </Link>

  <Link href="/about"
  className="
  font-medium
  text-slate-700
  hover:text-[#5B2EBD]
  transition-colors duration-200
">
    About
  </Link>

  <Link href="/help"
  className="
  font-medium
  text-slate-700
  hover:text-[#5B2EBD]
  transition-colors duration-200
">
    Help
  </Link>

  <Link href="/contact-us" 
  className="
  font-medium
  text-slate-700
  hover:text-[#5B2EBD]
  transition-colors duration-200
">
    Contact-Us
  </Link>

  {isAdmin && (
    <Link href="/admin" 
    className="
  font-medium
  text-slate-700
  hover:text-[#5B2EBD]
  transition-colors duration-200
">
      Admin Dashboard
    </Link>
  )}

</nav> */}


        {/* <nav className="hidden md:flex gap-8 font-medium text-slate-700">
          <Link href="/" className="hover:text-[#5B2EBD]">Home</Link>
          <Link href="/pyq" className="hover:text-[#5B2EBD]">PYQs</Link>
          <Link href="/cgpa" className="hover:text-[#5B2EBD]">CGPA</Link> */}
          {/* <Link href="/result" className="hover:text-[#5B2EBD]">Result</Link> */}
          {/* <Link href="/about" className="hover:text-[#5B2EBD]">About</Link>
        </nav> */}

        {/* RIGHT ACTIONS: APP PROMO + AUTH + MOBILE MENU */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* App download button visible on ALL screen sizes (Mobile + Desktop) */}
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                       bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800 border border-emerald-300/90
                       hover:from-emerald-100 hover:to-teal-100 hover:border-emerald-400 transition-all shadow-xs hover:shadow active:scale-95 shrink-0"
            title="Download Alpha Result Android App"
          >
            <GooglePlayIcon className="w-3.5 h-3.5" />
            <span className="font-bold">App</span>
            <span className="hidden sm:inline">Download</span>
            <span className="flex h-1.5 w-1.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
          </a>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center">
            {!user ? (
              <button onClick={showLogin} className="btn-primary">
                Sign In
              </button>
            ) : (
              <ProfileMenu user={user} />
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded-xl text-slate-800 hover:bg-slate-100 active:bg-slate-200 transition focus:outline-none"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      {open && (
        <div className="md:hidden bg-white border-t border-slate-100 px-6 py-5 space-y-4 max-h-[calc(100vh-76px)] overflow-y-auto shadow-xl">

    {isAdminArea ? (

      <>
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setOpen(false)}
            className="block text-slate-700 hover:text-[#5B2EBD]"
          >
            {link.label}
          </Link>
        ))}
      </>

    ) : (

      <>
        {/* HOME */}
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="block text-slate-700 hover:text-[#5B2EBD]"
        >
          Home
        </Link>

        {/* PYQs */}
        <details>
          <summary className="cursor-pointer font-medium">
            PYQs
          </summary>

          <div className="pl-4 mt-3 space-y-3">

            {SEMESTERS.map((sem) => (
              <details key={sem.code}>

                <summary className="cursor-pointer text-sm font-medium">
                  {sem.name}
                </summary>

                <div className="grid grid-cols-2 gap-2 pl-3 mt-2">

                  {BRANCHES.map((branch) => (
                    <Link
                      key={branch.code}
                      href={`/pyq/download/${branch.code}/sem-${sem.code}`}
                      onClick={() => setOpen(false)}
                      className="text-sm text-slate-600 hover:text-[#5B2EBD]"
                    >
                      {branch.short_name}
                    </Link>
                  ))}

                </div>

              </details>
            ))}

          </div>
        </details>

        {/* SOLUTION */}
        <details>
          <summary className="cursor-pointer font-medium">
            Solution
          </summary>

          <div className="pl-4 mt-3 space-y-3">

            {SEMESTERS.map((sem) => (
              <details key={sem.code}>

                <summary className="cursor-pointer text-sm font-medium">
                  {sem.name}
                </summary>

                <div className="grid grid-cols-2 gap-2 pl-3 mt-2">

                  {BRANCHES.map((branch) => (
                    <Link
                      key={branch.code}
                      href={`/pyq/${branch.code}/sem-${sem.code}`}
                      onClick={() => setOpen(false)}
                      className="text-sm text-slate-600 hover:text-[#5B2EBD]"
                    >
                      {branch.short_name}
                    </Link>
                  ))}

                </div>

              </details>
            ))}

          </div>
        </details>

        {/* CGPA */}
        <details>
          <summary className="cursor-pointer font-medium">
            CGPA
          </summary>

          <div className="pl-4 mt-3 space-y-3">

            {SEMESTERS.map((sem) => (
              <details key={sem.code}>

                <summary className="cursor-pointer text-sm font-medium">
                  {sem.name}
                </summary>

                <div className="grid grid-cols-2 gap-2 pl-3 mt-2">

                  {BRANCHES.map((branch) => (
                    <Link
                      key={branch.code}
                      // href={`/cgpa?branch=${branch.code}&semester=${sem.code}`}
                      href={`/cgpa/${branch.code}/sem-${sem.code}`}
                      onClick={() => setOpen(false)}
                      className="text-sm text-slate-600 hover:text-[#5B2EBD]"
                    >
                      {branch.short_name}
                    </Link>
                  ))}

                </div>

              </details>
            ))}

          </div>
        </details>

        {/* OTHER LINKS */}
        <Link
          href="/pyq/missing-papers"
          onClick={() => setOpen(false)}
          className="block text-slate-700 hover:text-[#5B2EBD]"
        >
          Missing Papers
        </Link>

        <Link
          href="/blog"
          onClick={() => setOpen(false)}
          className="block text-slate-700 hover:text-[#5B2EBD]"
        >
          Blog
        </Link>

        <Link
          href="/about"
          onClick={() => setOpen(false)}
          className="block text-slate-700 hover:text-[#5B2EBD]"
        >
          About
        </Link>

        {/* <Link
          href="/help"
          onClick={() => setOpen(false)}
          className="block text-slate-700 hover:text-[#5B2EBD]"
        >
          Help
        </Link> */}

        <Link
          href="/contact-us"
          onClick={() => setOpen(false)}
          className="block text-slate-700 hover:text-[#5B2EBD]"
        >
          Contact-Us
        </Link>

        {isAdmin && (
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className="block text-slate-700 hover:text-[#5B2EBD]"
          >
            Admin Dashboard
          </Link>
        )}

      </>

    )}

    {/* Android App Button */}
    <a
      href={PLAY_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2.5 w-full py-2.5 px-4 rounded-xl
                 bg-slate-900 text-white font-medium text-sm shadow-md hover:bg-black transition"
    >
      <GooglePlayIcon className="w-4 h-4" />
      <span>Download Android App</span>
      <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-500 text-white px-1.5 py-0.5 rounded">Free</span>
    </a>

    {!user ? (
      <button
        onClick={showLogin}
        className="btn-primary"
      >
        Sign In
      </button>
    ) : (
      <Link href="/account" className="block">
        Account
      </Link>
    )}

  </div>
)}


      
    </header>
  );
}
