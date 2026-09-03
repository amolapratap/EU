"use client";

import Image from "next/image";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useAuthModal } from "@/components/auth/AuthModal";
import { ChevronDown } from "lucide-react";
import { Triangle } from "lucide-react";
import ProfileMenu from "./ProfileMenu";

import { usePathname } from "next/navigation";

import { SEMESTERS, BRANCHES } from "@/lib/constants/academic";



type NavLink = {
  href: string;
  label: string;
};

const USER_NAV: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "News & Blog" },
  { href: "/pyq/download", label: "PYQs" },
  { href: "/pyq", label: "Solution" },
  // { href: "/result", label: "Result"},
  { href: "/cgpa", label: "CGPA" },
  { href: "/pyq/missing-papers", label: "Missing Papers"},
  { href: "/about", label: "About" },
  { href: "/help", label: "Help" },
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
        <Link href="/" className="flex items-center gap-3">
          <div >
            
            <Image
                src="/ar_logo2.png"
                alt="Alpha Result"
                width={44}
                height={44}
                className="object-contain"
                priority
            />

          </div>
          <div>
            <div className="font-extrabold text-lg text-slate-900">
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

        {/* AUTH */}
        <div className="hidden md:flex">
          {!user ? (
            <button onClick={showLogin} className="btn-primary">
              Sign In
            </button>
          ) : (
            <ProfileMenu user={user} />
          )}
        </div>






        {/* MOBILE */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden text-slate-800"
        >
          ☰
        </button>
      </div>




      {/* MOBILE MENU */}
{/* MOBILE MENU */}
    

      {/* MOBILE MENU */}
{open && (
  <div className="md:hidden bg-white border-t px-6 py-4 space-y-4">

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
          href="/about"
          onClick={() => setOpen(false)}
          className="block text-slate-700 hover:text-[#5B2EBD]"
        >
          About
        </Link>

        <Link
          href="/help"
          onClick={() => setOpen(false)}
          className="block text-slate-700 hover:text-[#5B2EBD]"
        >
          Help
        </Link>

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
