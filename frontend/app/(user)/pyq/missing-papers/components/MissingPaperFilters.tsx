"use client";

import {
  ALL_BRANCHES,
  ALL_SEMESTERS,
} from "@/lib/constants/academic";

interface Props {
  filters: any;
  setFilters: any;
}

export default function MissingPaperFilters({
  filters,
  setFilters,
}: Props) {

  return (
    // <div className="bg-white border rounded-3xl p-5 sticky top-4 z-20 shadow-sm">
    <div className="bg-white border rounded-2xl p-5 shadow-sm">

      {/* <div className="grid grid-cols-1 md:grid-cols-5 gap-4"> */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">


        <input
          placeholder="Search Paper code"
          value={filters.search}
          onChange={(e) =>
            setFilters({
              ...filters,
              search: e.target.value,
            })
          }
          className="border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-black/10"
        />

        <select
          value={filters.req_semester_code}
          onChange={(e) =>
            setFilters({
              ...filters,
              req_semester_code: e.target.value,
            })
          }
          className="border rounded-2xl px-4 py-3 bg-white"
        >
          <option value="">
            All Semesters
          </option>

          {ALL_SEMESTERS.map((sem) => (
            <option
              key={sem.code}
              value={sem.code}
            >
              {sem.name}
            </option>
          ))}
        </select>

        <select
          value={filters.branch_code}
          onChange={(e) =>
            setFilters({
              ...filters,
              branch_code: e.target.value,
            })
          }
          className="border rounded-2xl px-4 py-3 bg-white"
        >
          <option value="">
            All Branches
          </option>

          {ALL_BRANCHES.map((branch) => (
            <option
              key={branch.code}
              value={branch.code}
            >
              {branch.short_name}({branch.code})
            </option>
          ))}
        </select>

        <input
          placeholder="Year"
          value={filters.year}
          onChange={(e) =>
            setFilters({
              ...filters,
              year: e.target.value,
            })
          }
          className="border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-black/10"
        />

        <select
          value={filters.status}
          onChange={(e) =>
            setFilters({
              ...filters,
              status: e.target.value,
            })
          }
          className="border rounded-2xl px-4 py-3 bg-white"
        >
          <option value="all">All Status</option>
          <option value="missing">Missing</option>
          <option value="rejected">Rejected</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
        </select>

      </div>

    </div>
  );
}