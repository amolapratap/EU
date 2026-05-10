"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

import StatsCards from "./components/StatsCards";
import FiltersBar from "./components/FiltersBar";

import MissingRejectedTable from "./components/MissingRejectedTable";
import UnderReviewTable from "./components/UnderReviewTable";
import ApprovedTable from "./components/ApprovedTable";

import AddMissingPaperDialog from "./components/AddMissingPaperDialog";

import { useMissingPapers } from "./hooks/useMissingPapers";

export default function MissingPapersAdminPage() {

  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [filters, setFilters] = useState({});

  const [openAdd, setOpenAdd] = useState(false);

  // const { data, isLoading } = useMissingPapers(filters);

  // const papers = data?.data || [];
  const shouldFetch =
  !loading &&
  user &&
  (user.role === "admin" ||
    user.role === "superalpha");

const { data, isLoading } =
  useMissingPapers(
    shouldFetch ? filters : null
  );

const papers = data?.data || [];

    // 🔐 Guard
  useEffect(() => {
    if (!loading && (!user || (user.role !== "admin" && user.role !== "superalpha"))) {
      router.replace("/");
    }
  }, [user, loading, router]);


  // useEffect(() => {

  //   if (
  //     !loading &&
  //     (!user ||
  //       (user.role !== "admin" &&
  //         user.role !== "superalpha"))
  //   ) {
  //     router.replace("/");
  //   }
  
  // }, [user, loading, router]);
  
  
  // ✅ STOP PAGE RENDER
  // if (
  //   !loading &&
  //   (!user ||
  //     (user.role !== "admin" &&
  //       user.role !== "superalpha"))
  // ) {
  //   return null;
  // }



  const missingRejected = useMemo(
    () =>
      papers.filter(
        (p: any) =>
          p.status === "missing" || p.status === "rejected"
      ),
    [papers]
  );

  const underReview = useMemo(
    () => papers.filter((p: any) => p.status === "under_review"),
    [papers]
  );

  const approved = useMemo(
    () => papers.filter((p: any) => p.status === "approved"),
    [papers]
  );


    // ⏳ Loading state (important on refresh)
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0B0F1A] text-slate-300">
          Loading admin dashboard...
        </div>
      );
    }


    // ❌ Not admin (extra safety)
  if (!user || (user.role !== "admin" && user.role !== "superalpha")) {
      return null;
    }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Missing Papers Moderation
          </h1>

          <p className="text-muted-foreground mt-1">
            Manage public uploads and missing papers.
          </p>
        </div>

        <button
          onClick={() => setOpenAdd(true)}
          className="bg-black text-white px-5 py-3 rounded-xl"
        >
          + Add Missing Paper
        </button>
      </div>

      {/* Stats */}
      <StatsCards
        missing={missingRejected.filter((p: any) => p.status === "missing").length}
        rejected={missingRejected.filter((p: any) => p.status === "rejected").length}
        underReview={underReview.length}
        approved={approved.length}
      />

      {/* Filters */}
      <FiltersBar
        filters={filters}
        setFilters={setFilters}
      />

      {/* Missing + Rejected */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">
          Missing & Rejected Papers
        </h2>

        <MissingRejectedTable data={missingRejected} />
      </div>

      {/* Under Review */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">
          Under Review
        </h2>

        <UnderReviewTable data={underReview} />
      </div>

      {/* Approved */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">
          Approved Papers
        </h2>

        <ApprovedTable data={approved} />
      </div>

      <AddMissingPaperDialog
        open={openAdd}
        onOpenChange={setOpenAdd}
      />
    </div>
  );
}