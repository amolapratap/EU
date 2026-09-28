"use client";

import { useEffect, useState } from "react";
import { Fragment } from "react";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { API_URL } from "@/lib/api";
import ReactSelect from "react-select";



/* =====================================================
   TYPES
===================================================== */

type TabType = "semester" | "branch" | "subject" | "elective";

interface Semester {
  code: string;
  name: string;
}

interface Branch {
  code: string;
  short_name: string;
  full_name: string;
}


interface SyllabusUnit {
  unit: string;
  topics: string[];
}

interface Subject {
  _id?: string;
  code: string;
  short_name: string;
  full_name: string;
  semester_code: string;
  branch_code: string | string[];
  subject_type: string;
  subject_credit: number;
  max_marks: number;
  all_paper_pdf: string;

  syllabus?: SyllabusUnit[]; // ✅ NEW
}

interface ElectiveChild {
  subject_id: string;
  short_name: string;
  full_name: string;
}

interface ElectiveGroup {
  _id: string;
  code?: string | null;
  short_name: string;
  full_name: string;
  semester_code: string;
  branch_code: string | string[];
  subjects: ElectiveChild[];
}

/* =====================================================
   PAGE
===================================================== */

export default function AdminStructurePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("semester");

  // 🔐 Guard
  useEffect(() => {
    if (!loading && (!user || (user.role !== "admin" && user.role !== "superalpha"))) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading) return <Loader />;
  if (!user || (user.role !== "admin" && user.role !== "superalpha")) return null;

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-slate-200">
    {/* //  <div className="min-h-screen bg-[#0B0F1A] text-slate-200 -mx-8"> */}


      <Header />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* <main className="w-full px-8 py-8 space-y-8"> */}

        <Tabs active={activeTab} setActive={setActiveTab} />

        <div className="bg-[#11172C] border border-white/10 rounded-xl p-6">
          {activeTab === "semester" && <SemesterSection />}
          {activeTab === "branch" && <BranchSection />}
          {activeTab === "subject" && <SubjectSection />}
          {activeTab === "elective" && <ElectiveSection />}
        </div>
      </main>
    </div>
  );
}

/* =====================================================
   SEMESTER
===================================================== */

function SemesterSection() {
  const [list, setList] = useState<Semester[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Semester | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    // const res = await fetch(`${API_URL}/admin/ssb/semester`, authHeader());
    // setList(await res.json());
    const res = await fetch(`${API_URL}/admin/ssb/semester`, authHeader());
    const json = await res.json();
    setList(json.data || []);

  }

  // async function remove(code: string) {
  //   const backup = list;
  //   setList(list.filter(s => s.code !== code));

  //   try {
  //     await fetch(`${API_URL}/admin/ssb/semester/${code}`, {
  //       method: "DELETE",
  //       ...authHeader(),
  //     });
  //   } catch {
  //     setList(backup);
  //   }
  // }
  async function remove(code?: string) {
    if (!code) return; // 🚫 prevent blank delete

    if (!confirm("Delete this semester?")) return;
  
    const backup = list;
    setList(list.filter(s => s.code !== code));
  
    try {
      await fetch(`${API_URL}/admin/ssb/semester/${code}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
    } catch {
      setList(backup);
    }
  }

  return (
    <SectionLayout title="Semesters" onAdd={() => { setEdit(null); setOpen(true); }}>
      <Table headers={["Code", "Name", "Actions"]}>
        {list.map(s => (
          <tr key={s.code}>
            <Td>{s.code}</Td>
            <Td>{s.name}</Td>
            <Td>
              <ActionBtn onClick={() => { setEdit(s); setOpen(true); }}>Edit</ActionBtn>
              <ActionBtn danger onClick={() => remove(s.code)}>Delete</ActionBtn>
            </Td>
          </tr>
        ))}
      </Table>

      {open && (
        <SemesterModal
          data={edit}
          onClose={() => setOpen(false)}
          onSaved={fetchData}
        />
      )}
    </SectionLayout>
  );
}

/* =====================================================
   BRANCH
===================================================== */

function BranchSection() {
  const [list, setList] = useState<Branch[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Branch | null>(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const res = await fetch(`${API_URL}/admin/ssb/branch`, authHeader());
    // setList(await res.json());
    const json = await res.json();
    setList(Array.isArray(json.data) ? json.data : []);

  }

  async function remove(code: string) {
    if (!code) return; // 🚫 prevent blank delete
    if (!confirm("Delete this branch?")) return;

    const backup = list;
    setList(list.filter(b => b.code !== code));

    try {
      await fetch(`${API_URL}/admin/ssb/branch/${code}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
    } catch {
      setList(backup);
    }
  }

  return (
    <SectionLayout title="Branches" onAdd={() => { setEdit(null); setOpen(true); }}>
      <Table headers={["Code", "Short", "Full Name", "Actions"]}>
        {list.map(b => (
          <tr key={b.code}>
            <Td>{b.code}</Td>
            <Td>{b.short_name}</Td>
            <Td>{b.full_name}</Td>
            <Td>
              <ActionBtn onClick={() => { setEdit(b); setOpen(true); }}>Edit</ActionBtn>
              <ActionBtn danger onClick={() => remove(b.code)}>Delete</ActionBtn>
            </Td>
          </tr>
        ))}
      </Table>

      {open && (
        <BranchModal
          data={edit}
          onClose={() => setOpen(false)}
          onSaved={fetchData}
        />
      )}
    </SectionLayout>
  );
}

/* =====================================================
   SUBJECT
===================================================== */

function SubjectSection() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [filterSem, setFilterSem] = useState("");
  const [filterBranch, setFilterBranch] = useState("");

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Subject | null>(null);

  // Syllabus
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  const [loadingSubject, setLoadingSubject] = useState<string | null>(null);
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});

  useEffect(() => {
    loadBase();
  }, []);

  async function loadBase() {
    const [s, b] = await Promise.all([
      fetch(`${API_URL}/admin/ssb/semester`, authHeader()).then(r => r.json()),
      fetch(`${API_URL}/admin/ssb/branch`, authHeader()).then(r => r.json()),
    ]);
    // setSemesters(s);
    // setBranches(b);
    setSemesters(Array.isArray(s.data) ? s.data : []);
    setBranches(Array.isArray(b.data) ? b.data : []);
    fetchSubjects();
  }

  async function fetchSubjects() {
    const q = new URLSearchParams();
    if (filterSem) q.append("semester", filterSem);
    if (filterBranch) q.append("branch", filterBranch);

    const res = await fetch(`${API_URL}/admin/ssb/subject?${q}`, authHeader());
    // setSubjects(await res.json());
    const json = await res.json();
    setSubjects(Array.isArray(json.data) ? json.data : []);

  }

  useEffect(() => {
    fetchSubjects();
  }, [filterSem, filterBranch]);

  async function remove(code: string) {

    if (!confirm("Delete this subject?")) return;
    
    const backup = subjects;
    setSubjects(subjects.filter(s => s.code !== code));

    try {
      await fetch(`${API_URL}/admin/ssb/subject/${code}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
    } catch {
      setSubjects(backup);
    }
  }


  // To merge all papers of a subject
  const handleMerge = async (subjectCode: string) => {
    try {
      setLoadingSubject(subjectCode);
      setStatusMap(prev => ({
        ...prev,
        [subjectCode]: "Merging..."
      }));
  
      const res = await fetch(`${API_URL}/admin/merge-subject-pdfs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ subject_code: subjectCode }),
      });
  
      const data = await res.json();
  
      if (!res.ok) {
        throw new Error(data.detail || "Merge failed");
      }
  
      // ✅ SUCCESS MESSAGE
      setStatusMap(prev => ({
        ...prev,
        [subjectCode]: `✔ ${data.total_papers} papers merged (${data.papers.map(p => p.year).join(", ")} years)`
      }));
  
      // 🔥 UPDATE ONLY THIS SUBJECT (NO RELOAD)
      setSubjects(prev =>
        prev.map(s =>
          s.code === subjectCode
            ? { ...s, all_paper_pdf: data.url }
            : s
        )
      );
  
    } catch (err: any) {
      setStatusMap(prev => ({
        ...prev,
        [subjectCode]: `Error: ${err.message}`
      }));
    } finally {
      setLoadingSubject(null);
    }
  };




  return (
    <SectionLayout title="Subjects" onAdd={() => { setEdit(null); setOpen(true); }}>
      <div className="flex gap-4 mb-4">
        <Select value={filterSem} onChange={setFilterSem} options={semesters} />
        <Select value={filterBranch} onChange={setFilterBranch} options={branches} />
      </div>

      <Table headers={["Code", "Short", "Full Name", "Semester", "Branch", "Type", "Credit", "max_marks", "Papers ", "Actions"]}>
        {subjects.map(s => (
          <Fragment  key={s.code}>
            <tr>
            <Td>{s.code}</Td>
            <Td>{s.short_name}</Td>
            <Td>{s.full_name}</Td>
            <Td>{s.semester_code}</Td>
            {/* <Td>{s.branch_code}</Td> */}
            <Td>
  <div className="flex flex-wrap gap-1">
    {Array.isArray(s.branch_code)
      ? s.branch_code.map((b: string) => (
          <span
            key={b}
            className="px-2 py-0.5 text-xs rounded bg-slate-200 text-slate-700"
          >
            {b}
          </span>
        ))
      : (
        <span className="px-2 py-0.5 text-xs rounded bg-slate-200 text-slate-700">
          {s.branch_code}
        </span>
      )}
  </div>
</Td>
            <Td>{s.subject_type}</Td>
            <Td>{s.subject_credit}</Td>
            <Td>{s.max_marks}</Td>
            {/* <Td>{s.all_paper_pdf || "Na"}</Td> */}

                <Td>
        <div className="flex flex-col items-start gap-1">

          <div className="flex items-center gap-3">
            
            {/* VIEW */}
            {s.all_paper_pdf ? (
              <a
                href={s.all_paper_pdf}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-500 hover:underline text-sm"
              >
                View
              </a>
            ) : (
              <span className="text-gray-400 text-xs">NA</span>
            )}

            {/* MERGE */}
            <button
              onClick={() => handleMerge(s.code)}
              disabled={loadingSubject === s.code}
              className={`text-xs px-2 py-1 rounded-md border transition
                ${
                  loadingSubject === s.code
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                }`}
            >
              {loadingSubject === s.code ? "Merging..." : "Merge"}
            </button>
          </div>

          {/* ✅ INLINE MESSAGE */}
          {statusMap[s.code] && (
            <span
              className={`text-xs ${
                statusMap[s.code].startsWith("Error")
                  ? "text-red-500"
                  : "text-green-600"
              }`}
            >
              {statusMap[s.code]}
            </span>
          )}

        </div>
      </Td>
        

            <Td>
              <ActionBtn onClick={() => { setEdit(s); setOpen(true); }}>Edit</ActionBtn>
              <ActionBtn danger onClick={() => remove(s.code)}>Delete</ActionBtn>
              <ActionBtn
                            onClick={() => {
                              setSelectedSubject(prev =>
                                prev?.code === s.code ? null : s
                              );
                            }}
                          >
                            {selectedSubject?.code === s.code ? "Close" : "Syllabus"}
                          </ActionBtn>
          </Td>
          </tr>
            {selectedSubject?.code === s.code && (
          <tr>
            
            <td colSpan={10}>
              <InlineSyllabusEditor
                subject={s}
                onSaved={() => {
                  fetchSubjects();
                  setSelectedSubject(null); // CLOSE AFTER SAVE
                }}
              />
            </td>

          </tr>
        )}
          </Fragment >
        ))}
      </Table>

      {open && (
        <SubjectModal
          data={edit}
          semesters={semesters}
          branches={branches}
          onClose={() => setOpen(false)}
          onSaved={fetchSubjects}
        />
      )}

        

    </SectionLayout>
  );
}

/* =====================================================
   ELECTIVE SUBJECT GROUPS
===================================================== */

function ElectiveSection() {
  const [electives, setElectives] = useState<ElectiveGroup[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [filterSem, setFilterSem] = useState("");
  const [filterBranch, setFilterBranch] = useState("");

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<ElectiveGroup | null>(null);

  useEffect(() => {
    loadBase();
  }, []);

  async function loadBase() {
    const [s, b] = await Promise.all([
      fetch(`${API_URL}/admin/ssb/semester`, authHeader()).then(r => r.json()),
      fetch(`${API_URL}/admin/ssb/branch`, authHeader()).then(r => r.json()),
    ]);
    setSemesters(Array.isArray(s.data) ? s.data : []);
    setBranches(Array.isArray(b.data) ? b.data : []);
    fetchElectives();
  }

  async function fetchElectives() {
    const q = new URLSearchParams();
    if (filterSem) q.append("semester", filterSem);
    if (filterBranch) q.append("branch", filterBranch);

    const res = await fetch(`${API_URL}/admin/ssb/electives?${q}`, authHeader());
    const json = await res.json();
    setElectives(Array.isArray(json.data) ? json.data : []);
  }

  useEffect(() => {
    fetchElectives();
  }, [filterSem, filterBranch]);

  async function remove(id: string) {
    if (!confirm("Delete this elective group? The subjects will NOT be deleted.")) return;

    const backup = electives;
    setElectives(electives.filter(e => e._id !== id));

    try {
      const res = await fetch(`${API_URL}/admin/ssb/electives/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || "Failed to delete elective group");
        setElectives(backup);
      }
    } catch {
      setElectives(backup);
    }
  }

  return (
    <SectionLayout title="Elective Subject Groups" onAdd={() => { setEdit(null); setOpen(true); }}>
      <div className="flex gap-4 mb-4">
        <Select value={filterSem} onChange={setFilterSem} options={semesters} />
        <Select value={filterBranch} onChange={setFilterBranch} options={branches} />
      </div>

      <Table headers={["Code", "Short Name", "Full Name", "Semester", "Branch", "Subjects", "Actions"]}>
        {electives.length === 0 ? (
          <tr>
            <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
              No elective subject groups found. Click &quot;Add&quot; to create one.
            </td>
          </tr>
        ) : (
          electives.map(eg => (
            <tr key={eg._id}>
              <Td>
                {eg.code ? (
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700 font-medium">
                    {eg.code}
                  </span>
                ) : (
                  <span className="text-slate-500 text-xs">—</span>
                )}
              </Td>
              <Td><span className="font-semibold text-white">{eg.short_name}</span></Td>
              <Td>{eg.full_name}</Td>
              <Td>{eg.semester_code}</Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  {Array.isArray(eg.branch_code)
                    ? eg.branch_code.map((b: string) => (
                        <span key={b} className="px-2 py-0.5 text-xs rounded bg-slate-200 text-slate-700 font-medium">
                          {b}
                        </span>
                      ))
                    : (
                      <span className="px-2 py-0.5 text-xs rounded bg-slate-200 text-slate-700 font-medium">
                        {eg.branch_code}
                      </span>
                    )}
                </div>
              </Td>
              <Td>
                <div className="flex flex-wrap gap-1 max-w-xs">
                  {eg.subjects && eg.subjects.length > 0 ? (
                    eg.subjects.map(s => (
                      <span
                        key={s.subject_id}
                        className="px-2 py-0.5 text-xs rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium"
                        title={s.full_name}
                      >
                        {s.short_name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">None</span>
                  )}
                </div>
              </Td>
              <Td>
                <ActionBtn onClick={() => { setEdit(eg); setOpen(true); }}>Edit</ActionBtn>
                <ActionBtn danger onClick={() => remove(eg._id)}>Delete</ActionBtn>
              </Td>
            </tr>
          ))
        )}
      </Table>

      {open && (
        <ElectiveModal
          data={edit}
          semesters={semesters}
          branches={branches}
          onClose={() => setOpen(false)}
          onSaved={fetchElectives}
        />
      )}
    </SectionLayout>
  );
}

function ElectiveModal({ data, semesters, branches, onClose, onSaved }: any) {
  const [semester, setSemester] = useState(data?.semester_code || "");
  const [branchCodes, setBranchCodes] = useState<string[]>(
    Array.isArray(data?.branch_code) ? data.branch_code : data?.branch_code ? [data.branch_code] : []
  );
  const [shortName, setShortName] = useState(data?.short_name || "");
  const [fullName, setFullName] = useState(data?.full_name || "");
  const [code, setCode] = useState(data?.code || "");
  const [subjects, setSubjects] = useState<ElectiveChild[]>(data?.subjects ? [...data.subjects] : []);

  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [saving, setSaving] = useState(false);

  const branchOptions = branches.map((b: any) => ({
    value: b.code,
    label: `${b.code} – ${b.short_name}`,
  }));

  // Dark-theme styles for ReactSelect
  const customSelectStyles = {
    control: (base: any, state: any) => ({
      ...base,
      backgroundColor: "#0B0F1A",
      borderColor: state.isFocused ? "#6366F1" : "rgba(255, 255, 255, 0.12)",
      boxShadow: state.isFocused ? "0 0 0 1px #6366F1" : "none",
      "&:hover": {
        borderColor: state.isFocused ? "#6366F1" : "rgba(255, 255, 255, 0.25)",
      },
      borderRadius: "0.5rem",
      minHeight: "40px",
      color: "#fff",
    }),
    menu: (base: any) => ({
      ...base,
      backgroundColor: "#0F1629",
      border: "1px solid rgba(255, 255, 255, 0.15)",
      borderRadius: "0.5rem",
      zIndex: 9999,
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isSelected
        ? "#4F46E5"
        : state.isFocused
        ? "#1E293B"
        : "transparent",
      color: "#fff",
      fontSize: "0.875rem",
      cursor: "pointer",
    }),
    multiValue: (base: any) => ({
      ...base,
      backgroundColor: "rgba(99, 102, 241, 0.2)",
      border: "1px solid rgba(99, 102, 241, 0.4)",
      borderRadius: "0.375rem",
    }),
    multiValueLabel: (base: any) => ({
      ...base,
      color: "#C7D2FE",
      fontSize: "0.75rem",
      fontWeight: 500,
    }),
    multiValueRemove: (base: any) => ({
      ...base,
      color: "#C7D2FE",
      ":hover": {
        backgroundColor: "rgba(239, 68, 68, 0.3)",
        color: "#FCA5A5",
      },
    }),
    input: (base: any) => ({
      ...base,
      color: "#fff",
    }),
    placeholder: (base: any) => ({
      ...base,
      color: "#64748B",
      fontSize: "0.875rem",
    }),
    singleValue: (base: any) => ({
      ...base,
      color: "#fff",
    }),
  };

  // Fetch subjects for this semester when semester changes
  useEffect(() => {
    if (!semester) {
      setAvailableSubjects([]);
      return;
    }
    async function loadSubjects() {
      setLoadingSubjects(true);
      try {
        const res = await fetch(`${API_URL}/admin/ssb/subject?semester=${semester}`, authHeader());
        const json = await res.json();
        setAvailableSubjects(Array.isArray(json.data) ? json.data : []);
      } catch {
        setAvailableSubjects([]);
      } finally {
        setLoadingSubjects(false);
      }
    }
    loadSubjects();
  }, [semester]);

  // Filter available subjects: exclude subjects already added to this group
  const selectableSubjects = availableSubjects.filter(
    as => !subjects.some(s => s.subject_id === as._id)
  );

  function handleAddSubject() {
    if (!selectedSubjectId) return;
    const subj = availableSubjects.find(s => s._id === selectedSubjectId);
    if (!subj || !subj._id) return;

    setSubjects(prev => [
      ...prev,
      {
        subject_id: subj._id as string,
        short_name: subj.short_name,
        full_name: subj.full_name
      }
    ]);
    setSelectedSubjectId("");
  }

  function handleRemoveSubject(subjectId: string) {
    setSubjects(prev => prev.filter(s => s.subject_id !== subjectId));
  }

  async function submit() {
    if (!shortName.trim()) {
      alert("Short Name is required (e.g. PE-I or OE-I)");
      return;
    }
    if (!fullName.trim()) {
      alert("Full Name is required (e.g. Program Elective-I)");
      return;
    }
    if (!semester) {
      alert("Please select a semester");
      return;
    }
    if (branchCodes.length === 0) {
      alert("Please select at least one branch");
      return;
    }
    if (subjects.length === 0) {
      alert("Please add at least one subject to this elective group");
      return;
    }

    setSaving(true);
    const method = data ? "PUT" : "POST";
    const url = data
      ? `${API_URL}/admin/ssb/electives/${data._id}`
      : `${API_URL}/admin/ssb/electives`;

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          semester_code: semester,
          branch_code: branchCodes,
          code: code.trim() || null,
          short_name: shortName.trim(),
          full_name: fullName.trim(),
          subjects: subjects.map(s => ({
            subject_id: s.subject_id,
            short_name: s.short_name,
            full_name: s.full_name
          }))
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || "Failed to save elective group");
        return;
      }

      onSaved();
      onClose();
    } catch (e: any) {
      alert(`Error saving elective group: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} width="w-[620px]" hideClose={true}>
      <div className="max-h-[85vh] overflow-y-auto pr-1">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">
                {data ? "Edit Elective Group" : "Add Elective Group"}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Group subjects into an elective choice (e.g. Program Elective)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* BASIC DETAILS */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Short Name <span className="text-red-400">*</span>
              </label>
              <input
                className="input w-full bg-[#0B0F1A] border-white/10 focus:border-indigo-500 text-sm"
                placeholder="e.g. PE-I or OE-I"
                value={shortName}
                onChange={e => setShortName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Code <span className="text-slate-400 font-normal">(Optional: e.g. 1056XX)</span>
              </label>
              <input
                className="input w-full bg-[#0B0F1A] border-white/10 focus:border-indigo-500 text-sm font-mono"
                placeholder="1056XX"
                value={code}
                onChange={e => setCode(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              className="input w-full bg-[#0B0F1A] border-white/10 focus:border-indigo-500 text-sm"
              placeholder="e.g. Program Elective-I"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Semester <span className="text-red-400">*</span>
              </label>
              <select
                className="input w-full bg-[#0B0F1A] border-white/10 focus:border-indigo-500 text-sm"
                value={semester}
                onChange={e => setSemester(e.target.value)}
              >
                <option value="">Select Semester</option>
                {semesters.map((s: any) => (
                  <option key={s.code} value={s.code}>
                    Semester {s.code}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Branch(es) <span className="text-red-400">*</span>
              </label>
              <ReactSelect
                isMulti
                styles={customSelectStyles}
                options={branchOptions}
                value={branchOptions.filter((opt: any) => branchCodes.includes(opt.value))}
                onChange={(selected: any) =>
                  setBranchCodes(selected ? selected.map((s: any) => s.value) : [])
                }
                placeholder="Select branch(es)..."
                classNamePrefix="react-select"
              />
            </div>
          </div>
        </div>

        {/* SUBJECTS MANAGEMENT */}
        <div className="mt-6 pt-5 border-t border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                <span>Subjects</span>
                <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {subjects.length} added
                </span>
              </label>
              <p className="text-xs text-slate-400 mt-0.5">
                Add the subjects that students can select from in this elective group.
              </p>
            </div>
          </div>

          {/* ADD SUBJECT CONTROLS */}
          <div className="flex gap-2 mb-3">
            <select
              className="input flex-1 bg-[#0B0F1A] border-white/10 focus:border-indigo-500 text-sm py-2 px-3 rounded-lg text-slate-200"
              value={selectedSubjectId}
              onChange={e => setSelectedSubjectId(e.target.value)}
              disabled={!semester || loadingSubjects}
            >
              <option value="">
                {!semester
                  ? "← Select a semester first to choose subjects"
                  : loadingSubjects
                  ? "Loading semester subjects..."
                  : selectableSubjects.length === 0
                  ? "All subjects for this semester already added"
                  : "-- Choose Subject to Add --"}
              </option>
              {selectableSubjects.map((s: any) => (
                <option key={s._id} value={s._id}>
                  {s.short_name} ({s.code}) – {s.full_name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleAddSubject}
              disabled={!selectedSubjectId}
              className="btn-primary text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-sm"
            >
              <span className="text-base leading-none font-bold">+</span> Add Subject
            </button>
          </div>

          {/* LIST OF CURRENT SUBJECTS */}
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {subjects.length === 0 ? (
              <div className="py-7 border-2 border-dashed border-white/10 rounded-lg text-center bg-[#0B0F1A]/40">
                <p className="text-xs text-slate-400 font-medium">No subjects added yet.</p>
                <p className="text-[11px] text-slate-500 mt-1">Select a subject from the dropdown above and click &quot;+ Add Subject&quot;.</p>
              </div>
            ) : (
              subjects.map((s, idx) => (
                <div
                  key={s.subject_id}
                  className="flex items-center justify-between bg-[#0B0F1A] hover:bg-[#131B31] px-3.5 py-2.5 rounded-lg border border-white/5 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono font-semibold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">
                          {s.short_name}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {s.full_name}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveSubject(s.subject_id)}
                    className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 px-2.5 py-1 rounded text-xs font-medium transition-colors shrink-0 ml-3"
                    title="Remove from elective group"
                  >
                    ✕ Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-end gap-3 pt-4 mt-6 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="btn-primary text-sm px-6 py-2 rounded-lg font-semibold shadow-lg shadow-indigo-500/20 disabled:opacity-50"
          >
            {saving ? "Saving..." : data ? "Update Elective Group" : "Create Elective Group"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* =====================================================
   HELPERS / UI
===================================================== */

const authHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

const Loader = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#0B0F1A]">
    Loading...
  </div>
);

const Header = () => (
  <header className="border-b border-white/10 bg-[#0F1629]">
    {/* <div className=" mx-auto px-6 py-4"> */}
    <div className="w-full px-8 py-4">

      <h1 className="text-xl font-bold text-white">Academic Structure</h1>
      <p className="text-xs text-slate-400">Semester • Branch • Subject</p>
    </div>
  </header>
);

function Tabs({ active, setActive }: any) {
  return (
    <div className="flex gap-3">
      {["semester", "branch", "subject", "elective"].map(t => (
        <button
          key={t}
          onClick={() => setActive(t)}
          className={`px-4 py-2 rounded-md text-sm ${
            active === t
              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
              : "border border-white/10 text-slate-400"
          }`}
        >
          {t === "elective" ? "ELECTIVES" : t.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

const SectionLayout = ({ title, onAdd, children }: any) => (
  <div className="space-y-6">
    <div className="flex justify-between">
      <h2 className="text-lg font-semibold">{title}</h2>
      <button onClick={onAdd} className="btn-primary">Add</button>
    </div>
    {children}
  </div>
);

const Table = ({ headers, children }: any) => (
  <div className="overflow-x-auto border border-white/10 rounded-lg">
    <table className="w-full text-sm">
      <thead className="bg-[#0F1629]">
        <tr>{headers.map((h: string) => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

const Td = ({ children }: any) => (
  <td className="px-4 py-3 border-t border-white/5">{children}</td>
);

const ActionBtn = ({ children, danger, ...p }: any) => (
  <button
    {...p}
    className={`mr-2 text-xs ${danger ? "text-red-400" : "text-indigo-400"}`}
  >
    {children}
  </button>
);

const Select = ({ options, value, onChange }: any) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    className="bg-[#0F1629] border border-white/10 px-4 py-2 rounded"
  >
    <option value="">All</option>
    {/* {options.map((o: any) => ( */}
      {Array.isArray(options) && options.map(o => (
      <option key={o.code} value={o.code}>{o.code}</option>
    ))}
  </select>
);

/* =====================================================
   MODALS (simple, clean)
===================================================== */

// SemesterModal, BranchModal, SubjectModal
// 👉 For brevity, they follow same pattern:

function Modal({ children, onClose, width = "w-[420px]", hideClose = false }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className={`bg-[#0F1629] ${width} max-w-full rounded-xl border border-white/10 p-6 shadow-2xl relative`}>
        {children}
        {!hideClose && (
          <div className="text-right mt-4">
            <button
              onClick={onClose}
              className="text-sm text-slate-400 hover:text-white"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


//SemesterModal
function SemesterModal({ data, onClose, onSaved }: any) {
  const [code, setCode] = useState(data?.code || "");
  const [name, setName] = useState(data?.name || "");

  async function submit() {
    const method = data ? "PUT" : "POST";
    const url = data
      ? `${API_URL}/admin/ssb/semester/${data.code}`
      : `${API_URL}/admin/ssb/semester`;

    await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ code, name }),
    });

    onSaved();
    onClose();
  }

  return (
    <Modal onClose={onClose}>
      <h3 className="text-lg font-semibold mb-4 text-white">
        {data ? "Edit Semester" : "Add Semester"}
      </h3>

      <input
        className="input mb-3"
        placeholder="Code"
        value={code}
        disabled={!!data}
        onChange={e => setCode(e.target.value)}
      />

      <input
        className="input"
        placeholder="Name"
        value={name}
        onChange={e => setName(e.target.value)}
      />

      <button  disabled={!code || !name}
          onClick={submit} className="btn-primary w-full mt-4 disabled:opacity-40">
        Save
      </button>
    </Modal>
  );
}



//🟣 BranchModal
function BranchModal({ data, onClose, onSaved }: any) {
  const [code, setCode] = useState(data?.code || "");
  const [shortName, setShortName] = useState(data?.short_name || "");
  const [fullName, setFullName] = useState(data?.full_name || "");

  async function submit() {
    const method = data ? "PUT" : "POST";
    const url = data
      ? `${API_URL}/admin/ssb/branch/${data.code}`
      : `${API_URL}/admin/ssb/branch`;

    await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        code,
        short_name: shortName,
        full_name: fullName,
      }),
    });

    onSaved();
    onClose();
  }

  return (
    <Modal onClose={onClose}>
      <h3 className="text-lg font-semibold mb-4 text-white">
        {data ? "Edit Branch" : "Add Branch"}
      </h3>

      <input
        className="input mb-3"
        placeholder="Code"
        value={code}
        disabled={!!data}
        onChange={e => setCode(e.target.value)}
      />

      <input
        className="input mb-3"
        placeholder="Short Name"
        value={shortName}
        onChange={e => setShortName(e.target.value)}
      />

      <input
        className="input"
        placeholder="Full Name"
        value={fullName}
        onChange={e => setFullName(e.target.value)}
      />

      <button  disabled={!code || !shortName || !fullName}
          onClick={submit} className="btn-primary w-full mt-4 disabled:opacity-40">
        Save
      </button>
    </Modal>
  );
}



// //🟣 SubjectModal

function SubjectModal({ data, semesters, branches, onClose, onSaved }: any) {
  const [code, setCode] = useState(data?.code || "");
  const [shortName, setShortName] = useState(data?.short_name || "");
  const [fullName, setFullName] = useState(data?.full_name || "");
  const [semester, setSemester] = useState(data?.semester_code || "");

  const [branchCodes, setBranchCodes] = useState<string[]>(
    Array.isArray(data?.branch_code) ? data.branch_code : data?.branch_code ? [data.branch_code] : []
  );

  const [subject_type, setsubject_type] = useState(data?.subject_type || "");
  const [subject_credit, setsubject_credit] = useState(data?.subject_credit || "");
  const [max_marks, setmax_marks] = useState(data?.max_marks || "");
  const [all_paper_pdf, setall_paper_pdf] = useState(data?.all_paper_pdf || "")


  const branchOptions = branches.map((b: any) => ({
    value: b.code,
    label: `${b.code} – ${b.short_name}`,
  }));
  

  async function submit() {
    if (
      !code ||
      !shortName ||
      !fullName ||
      !semester ||
      branchCodes.length === 0 ||
      !subject_type ||
      !max_marks
    ) {
      alert("All fields are required");
      return;
    }

    const method = data ? "PUT" : "POST";
    const url = data
      ? `${API_URL}/admin/ssb/subject/${data._id || data.code}`
      : `${API_URL}/admin/ssb/subject`;

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        code,
        short_name: shortName,
        full_name: fullName,
        semester_code: semester,
        branch_code: branchCodes, 
        subject_type,
        subject_credit,
        max_marks,
        all_paper_pdf,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.detail || "Failed to save subject");
      return;
    }

    onSaved();
    onClose();
  }

  return (
    <Modal onClose={onClose}>
      <div className="max-h-[85vh] overflow-y-auto pr-1">
      <h3 className="text-lg font-semibold mb-4 text-white">
        {data ? "Edit Subject" : "Add Subject"}
      </h3>

      <input className="input mb-3" placeholder="Code"
        value={code}
        onChange={e => setCode(e.target.value)}
      />

      <input className="input mb-3" placeholder="Short Name"
        value={shortName}
        onChange={e => setShortName(e.target.value)}
      />

      <input className="input mb-3" placeholder="Full Name"
        value={fullName}
        onChange={e => setFullName(e.target.value)}
      />

      
       {/* 🔥 MULTI BRANCH SELECT */}
       <div className="mb-3">
          <label className="block text-sm text-gray-300 mb-1">
            Branch(es)
          </label>

          <ReactSelect
            isMulti
            options={branchOptions}
            value={branchOptions.filter(opt =>
              branchCodes.includes(opt.value)
            )}
            onChange={(selected: any) =>
              setBranchCodes(selected.map((s: any) => s.value))
            }
            placeholder="Select or search one or more branches"
            className="text-black"
            classNamePrefix="react-select"
          />
        </div>

      <div className="grid grid-cols-2 gap-3">
        <select className="input" value={semester}
          onChange={e => setSemester(e.target.value)}>
          <option value="">Select Semester</option>
          {semesters.map((s: any) => (
            <option key={s.code} value={s.code}>{s.code}</option>
          ))}
        </select>

        <select className="input" value={subject_type}
          onChange={e => setsubject_type(e.target.value)}>
          <option value="">Subject type</option>
          <option>Theory</option>
          <option>Practical</option>
        </select>
      </div>



      <div className="grid grid-cols-2 gap-3">
        <select className="input" value={max_marks}
          onChange={e => setmax_marks(e.target.value)}>
          <option value="">Max Marks</option>
          <option>100</option>
          <option>50</option>
        </select>

        <input className="input" placeholder="Subject Credit"
        type="number"
        value={subject_credit}
        onChange={e => setsubject_credit(e.target.value)}
        />
      </div>

      <div>
        <input className="input" placeholder="All paper pdf link"
        type="string" value={all_paper_pdf}
        onChange={e => setall_paper_pdf(e.target.value)} />
      </div>

      <button
        onClick={submit}
        className="btn-primary w-full mt-4"
      >
        Save
      </button>
    </div>
  </Modal>
  );
}




function InlineSyllabusEditor({ subject, onSaved }: any) {

  const [units, setUnits] = useState<SyllabusUnit[]>(
    subject?.syllabus?.length
      ? subject.syllabus
      : [{ unit: "", topics: [""] }]
  );

  function addUnit() {
    setUnits([...units, { unit: "", topics: [""] }]);
  }

  function removeUnit(index: number) {
    setUnits(units.filter((_, i) => i !== index));
  }

  function updateUnit(index: number, value: string) {
    const updated = [...units];
    updated[index].unit = value;
    setUnits(updated);
  }

  function updateTopic(uIndex: number, tIndex: number, value: string) {
    const updated = [...units];
    updated[uIndex].topics[tIndex] = value;
    setUnits(updated);
  }

  function addTopic(uIndex: number) {
    const updated = [...units];
    updated[uIndex].topics.push("");
    setUnits(updated);
  }

  function removeTopic(uIndex: number, tIndex: number) {
    const updated = [...units];
    updated[uIndex].topics =
      updated[uIndex].topics.filter((_, i) => i !== tIndex);
    setUnits(updated);
  }

  async function submit() {
    await fetch(`${API_URL}/admin/ssb/subject/${subject.code}/syllabus`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ syllabus: units }),
    });

    onSaved();
    alert("Syllabus saved");
  }

  return (
    <div className="bg-[#0F1629] border border-indigo-500/20 rounded-lg p-4 space-y-4">

      <h4 className="text-indigo-300 font-semibold">
        Syllabus — {subject.short_name}
      </h4>

      {units.map((u, ui) => (
  <div
    key={ui}
    className="border border-white/10 p-4 rounded-lg bg-[#0B1225]"
  >

    {/* MODULE HEADER */}
    <div className="flex items-center gap-2 mb-3">

      <span className="text-xs text-indigo-400 font-semibold">
        MODULE {ui + 1}
      </span>

      <input
        className="flex-1 bg-transparent border-b border-indigo-500/40 
                   text-lg font-semibold text-white px-2 py-1 
                   focus:outline-none focus:border-indigo-400"
        placeholder="Module Name"
        value={u.unit}
        onChange={(e) => updateUnit(ui, e.target.value)}
      />

      <button
        onClick={() => removeUnit(ui)}
        className="text-red-400 text-sm hover:text-red-300"
      >
        ✕
      </button>

    </div>

    {/* TOPICS */}
    <div className="pl-6 space-y-2">

      {u.topics.map((t, ti) => (
        <div key={ti} className="flex gap-2 items-start">

          {/* bullet */}
          <span className="mt-2 text-gray-400">•</span>

          <textarea
            className="flex-1 bg-[#11172C] border border-white/10 rounded 
                       px-3 py-2 text-sm text-white 
                       focus:outline-none focus:border-indigo-400
                       resize-none"
            rows={2}
            placeholder="Topic"
            value={t}
            onChange={(e) =>
              updateTopic(ui, ti, e.target.value)
            }
          />

          <button
            onClick={() => removeTopic(ui, ti)}
            className="text-red-400 text-xs mt-2"
          >
            ✕
          </button>

        </div>
      ))}

      <button
        onClick={() => addTopic(ui)}
        className="text-indigo-400 text-xs hover:text-indigo-300"
      >
        + Add Topic
      </button>

    </div>

  </div>
))}

      <div className="flex justify-between">
        <button
          onClick={addUnit}
          className="text-indigo-400 text-sm"
        >
          + Add Module
        </button>

        <button
          onClick={submit}
          className="btn-primary"
        >
          Save
        </button>
      </div>

    </div>
  );
}