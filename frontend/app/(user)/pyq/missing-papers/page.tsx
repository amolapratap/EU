"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import MissingPaperFilters from "./components/MissingPaperFilters";
import MissingPaperSection from "./components/MissingPaperSection";
import UploadPaperDrawer from "./components/UploadPaperDrawer";

import {
  getPublicMissingPapers,
} from "./services/missingPaperApi";

import { MissingPaper } from "./types/missing-paper";
import AppPromoBanner from "@/components/app-promo/AppPromoBanner";

export default function MissingPapersPage() {

  const [papers, setPapers] = useState<MissingPaper[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedPaper, setSelectedPaper] =
    useState<MissingPaper | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);

  const [filters, setFilters] = useState({
    search: "",
    req_semester_code: "",
    branch_code: "",
    year: "",
    status: "all",
  });

  const fetchPapers = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      if (filters.search)
        params.append("search", filters.search);

      if (filters.req_semester_code)
        params.append(
          "req_semester_code",
          filters.req_semester_code
          
        );

      if (filters.branch_code)
        params.append(
          "branch_code",
          filters.branch_code
        );

      if (filters.year)
        params.append("year", filters.year);

      const res = await getPublicMissingPapers(
        `?${params.toString()}`
      );

      setPapers(res.data || []);

    } catch (err: any) {

      toast.error(
        err.message || "Failed to load papers"
      );

    } finally {

      setLoading(false);

    }
  };

  useEffect(() => {
    fetchPapers();
  }, [filters]);


  const filteredPapers = useMemo(() => {

    if (filters.status === "all") {
      return papers;
    }

    return papers.filter(
      (p) => p.status === filters.status
    );

  }, [papers, filters.status]);


  const uploadNeeded = filteredPapers.filter(
    (p) =>
      p.status === "missing" ||
      p.status === "rejected"
  );

  const underReview = filteredPapers.filter(
    (p) => p.status === "under_review"
  );

  const approved = filteredPapers.filter(
    (p) => p.status === "approved"
  );


  return (
    <div className="min-h-screen bg-gray-50">

      {/* HERO */}
      <div className="border-b bg-white">

        <div className="max-w-7xl mx-auto px-4 py-10">

          <div className="max-w-3xl">

            <h1 className="text-4xl font-bold tracking-tight text-gray-900">
              Contribute Missing Question Papers
            </h1>

            <p className="text-gray-600 mt-4 text-lg leading-relaxed">
              Help thousands of students by uploading
              missing BEU PYQs. Every contribution is
              manually reviewed before publishing.
            </p>

          </div>

          {/* STATS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">

            <div className="bg-red-50 border border-red-100 rounded-3xl p-6">
              <p className="text-sm text-red-600 font-medium">
                Missing Papers
              </p>

              <h2 className="text-3xl font-bold mt-2 text-red-700">
                {papers.filter(
                  (p) => p.status === "missing"
                ).length}
              </h2>
            </div>

            <div className="bg-yellow-50 border border-yellow-100 rounded-3xl p-6">
              <p className="text-sm text-yellow-700 font-medium">
                Under Review
              </p>

              <h2 className="text-3xl font-bold mt-2 text-yellow-700">
                {papers.filter(
                  (p) => p.status === "under_review"
                ).length}
              </h2>
            </div>

            <div className="bg-green-50 border border-green-100 rounded-3xl p-6">
              <p className="text-sm text-green-700 font-medium">
                Approved Contributions
              </p>

              <h2 className="text-3xl font-bold mt-2 text-green-700">
                {papers.filter(
                  (p) => p.status === "approved"
                ).length}
              </h2>
            </div>

          </div>

          <AppPromoBanner context="general" variant="compact" className="mt-8" />
        </div>

      </div>

      {/* CONTENT */}
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

        <MissingPaperFilters
          filters={filters}
          setFilters={setFilters}
        />

        <MissingPaperSection
          title="Missing Papers"
          subtitle="These papers are still missing or need re-upload."
          papers={uploadNeeded}
          type="upload"
          loading={loading}
          onUpload={(paper) => {
            setSelectedPaper(paper);
            setDrawerOpen(true);
          }}
        />

        <MissingPaperSection
          title="Under Review"
          subtitle="Uploaded papers waiting for admin verification."
          papers={underReview}
          type="review"
          loading={loading}
        />

        <MissingPaperSection
          title="Approved Contributions"
          subtitle="Successfully contributed papers by students."
          papers={approved}
          type="approved"
          loading={loading}
        />

      </div>

      <UploadPaperDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        paper={selectedPaper}
        onSuccess={fetchPapers}
      />

    </div>
  );
}

