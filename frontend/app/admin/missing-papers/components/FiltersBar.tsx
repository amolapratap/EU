"use client";

import React from "react";
import { ALL_BRANCHES, ALL_SEMESTERS } from "@/lib/constants/academic";
// import { BRANCHES, SEMESTERS } from "../../../../lib/constants/academic";
// import { BRANCHES } from "@/lib/constants/academic";


interface Props {
  filters: any;
  setFilters: any;
}

export default function FiltersBar({
  filters,
  setFilters,
}: Props) {
  return (
    <div className="bg-white border rounded-2xl p-5 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        
        {/* Search */}
        <input
          type="text"
          placeholder="Search subject code..."
          className="border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black"
          value={filters.search || ""}
          onChange={(e) =>
            setFilters((prev: any) => ({
              ...prev,
              search: e.target.value,
            }))
          }
        />

        {/* Semester */}
        <select
          className="border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black"
          value={filters.semester_code || ""}
          onChange={(e) =>
            setFilters((prev: any) => ({
              ...prev,
              semester_code: e.target.value,
            }))
          }
        >
          <option value="">All Semester</option>

          {ALL_SEMESTERS.map((sem) => (
            <option key={sem.code} value={sem.code}>
              {sem.name}
            </option>
          ))}
        </select>

        {/* Branch */}
        <select
          className="border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black"
          value={filters.branch_code || ""}
          onChange={(e) =>
            setFilters((prev: any) => ({
              ...prev,
              branch_code: e.target.value,
            }))
          }
        >
          <option value="">All Branch</option>

          {ALL_BRANCHES.map((branch) => (
            <option key={branch.code} value={branch.code}>
              {branch.short_name}
            </option>
          ))}
        </select>

        {/* Status */}
        <select
          className="border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black"
          value={filters.status || ""}
          onChange={(e) =>
            setFilters((prev: any) => ({
              ...prev,
              status: e.target.value,
            }))
          }
        >
          <option value="">All Status</option>
          <option value="missing">Missing</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>

        {/* Year */}
        <input
          type="text"
          placeholder="Year"
          className="border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black"
          value={filters.year || ""}
          onChange={(e) =>
            setFilters((prev: any) => ({
              ...prev,
              year: e.target.value,
            }))
          }
        />

        {/* Reset */}
        <button
          onClick={() => setFilters({})}
          className="border rounded-xl px-4 py-3 hover:bg-gray-100 transition"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
}