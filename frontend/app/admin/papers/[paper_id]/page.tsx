"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { API_URL } from "@/lib/api";

export default function AdminPaperQuestionsPage() {
  const { paper_id } = useParams<{ paper_id: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();

  const [paper, setPaper] = useState<any>({
    name: "",
    subject_code: "",
    year: "",
    questions: [],
  });

  const [editor, setEditor] = useState<any | null>(null);

  /* ADMIN GUARD */
  useEffect(() => {
    if (!loading && (!user || (user.role !== "admin" && user.role !== "superalpha"))) {
      router.replace("/");
    }
  }, [user, loading, router]);

  /* LOAD PAPER */
  useEffect(() => {
    if (paper_id) fetchPaper();
  }, [paper_id]);

  async function fetchPaper() {
    const res = await fetch(`${API_URL}/admin/paper/${paper_id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    const json = await res.json();

    setPaper({
      ...json.data,
      questions: Array.isArray(json.data?.questions)
        ? json.data.questions
        : [],
    });
  }

  function nextQno() {
    if (!paper.questions.length) return 1;
    return Math.max(...paper.questions.map((q: any) => q.q_no)) + 1;
  }

  async function removeMain(q_no: number) {
    if (!window.confirm(`Delete Question Q${q_no}?`)) return;

    // ✅ Optimistic UI
    setPaper((prev: any) => ({
      ...prev,
      questions: prev.questions.filter((q: any) => q.q_no !== q_no),
    }));

    await fetch(`${API_URL}/admin/papers/${paper_id}/questions/${q_no}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Loading...
      </div>
    );
  }

  
  if (!user || (user.role !== "admin" && user.role !== "superalpha")) return null;

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-slate-200">
      <header className="border-b border-white/10 bg-[#0F1629]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-xl font-bold">{paper.name}</h1>
          <p className="text-xs text-slate-400">
            {paper.subject_code} • {paper.year}
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* <button
          onClick={() => setEditor({ q_no: nextQno() })}
          className="btn-primary"
        >
          + Add Question
        </button> */}

        {paper.questions.length === 0 && (
          <div className="p-8 text-center text-slate-500 bg-[#11172C] rounded-xl">
            No questions added yet
          </div>
        )}

        {paper.questions.map((q: any, idx: number) => (
          <div
            key={`${q.q_no}-${idx}`}
            className="bg-[#11172C] border border-white/10 rounded-xl p-6"
          >
            <div className="flex justify-between">
              <h3 className="font-semibold">
                Q{q.q_no} • {q.marks} • {q.structure}/{q.nature}
              </h3>
              
              <div className="flex gap-6 text-sm">

                  <h4 className="text-xs text-slate-500">
                    by{" "}
                    {q.admin_userids?.map((id: string) => (
                      <span
                        key={id}
                        className="inline-block mr-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium"
                      >
                        {id}
                      </span>
                    ))}
                  </h4>

                <button
                  onClick={() =>
                    setEditor(JSON.parse(JSON.stringify(q)))
                  }
                  className="text-indigo-400"
                >
                  Edit
                </button>
                <button
                  onClick={() => removeMain(q.q_no)}
                  className="text-red-400"
                >
                  Delete
                </button>
              </div>
            </div>

            {q.heading && (
              <p className="mt-2 font-medium">{q.heading}</p>
            )}

            {/* {q.structure === "single" && (
              <>
                <p className="mt-3 whitespace-pre-wrap">
                  {q.question_md}
                </p>
                <p className="mt-3 text-green-400 whitespace-pre-wrap">
                  {q.solution_md}
                </p>
              </>
            )} */}

{/* For render solution block including img */}
{/* SINGLE QUESTION */}
{q.structure === "single" && (

<>

  {/* QUESTION */}
  <p className="mt-3 whitespace-pre-wrap">
    {q.question_md}
  </p>


  {/* NEW BLOCK SYSTEM */}
  {q.solution_blocks?.length > 0 ? (

    <div className="space-y-4 mt-4">

      {q.solution_blocks.map((block: any) => (

        <div key={block.id}>

          {/* TEXT */}
          {block.type === "text" && (
            <p className="text-green-400 whitespace-pre-wrap">
              {block.content}
            </p>
          )}


          {/* IMAGE */}
          {block.type === "image" && (

            <div className="space-y-2">

              <img
                src={block.image_url}
                alt="solution"
                className="rounded-2xl border max-h-[500px]"
              />

              {block.caption && (
                <p className="text-sm text-slate-400">
                  {block.caption}
                </p>
              )}

            </div>
          )}

        </div>
      ))}

    </div>

  ) : q.solution_md ? (

    /* OLD FALLBACK */
    <p className="mt-3 text-green-400 whitespace-pre-wrap">
      {q.solution_md}
    </p>

  ) : null}

</>
)}

            {Array.isArray(q.sub_questions) && (
              <div className="mt-4 space-y-4">
                {q.sub_questions.map((sq: any) => (
                  <div key={sq.sq_no} className="ml-4">
                    <p>
                      <strong>({sq.sq_no})</strong>{" "}
                      {sq.question_md} [{sq.marks}]
                    </p>

                    {Array.isArray(sq.options) && (
                      <ul className="ml-4 mt-1">
                        {sq.options.map((op: string, i: number) => (
                          <li
                            key={i}
                            className={
                              i === sq.correct_index
                                ? "text-green-400"
                                : ""
                            }
                          >
                            {String.fromCharCode(65 + i)}. {op}
                          </li>
                          
                        ))}
                      </ul>
                    )} 
                    
                    Correct Answer is :- {sq?.correct_index +1}

                      <br/>
                    Solution
                    {sq.solution_md && (
                      <p className="mt-2 text-green-400 whitespace-pre-wrap">
                        {sq.solution_md}
                      </p>
                    )}


{sq.solution_blocks?.length > 0 ? (

<div className="space-y-4 mt-3">

  {sq.solution_blocks.map((block: any) => (

    <div key={block.id}>

      {block.type === "text" && (
        <p className="text-green-400 whitespace-pre-wrap">
          {block.content}
        </p>
      )}

      {block.type === "image" && (

        <div className="space-y-2">

          <img
            src={block.image_url}
            alt="solution"
            className="rounded-2xl border max-h-[500px]"
          />

          {block.caption && (
            <p className="text-sm text-slate-400">
              {block.caption}
            </p>
          )}

        </div>
      )}

    </div>
  ))}

</div>

) : sq.solution_md ? (

<p className="mt-2 text-green-400 whitespace-pre-wrap">
  {sq.solution_md}
</p>

) : null}

                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {editor && (
          <QuestionEditor
            paper={paper}
            paperId={paper_id}
            data={editor}
            onClose={() => setEditor(null)}
            onSaved={fetchPaper}
          />
        )}

<button
          onClick={() => setEditor({ q_no: nextQno() })}
          className="btn-primary"
        >
          + Add Question
        </button>


      </main>
    </div>
  );
}

/* =====================================================
   QUESTION EDITOR
===================================================== */

async function uploadSolutionImage(
  file: File,
  public_id: string
) {

  const formData = new FormData();

  formData.append("file", file);
  formData.append("public_id", public_id);

  const res = await fetch(
    `${API_URL}/admin/upload-solution-image`,
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },

      body: formData,
    }
  );

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.detail || "Upload failed");
  }

  return json;
}

function QuestionEditor({ paper, paperId, data, onClose, onSaved }: any) {
  const isEdit = !!data.structure;

  const [qNo] = useState(data.q_no);
  const [marks, setMarks] = useState(data.marks || "");
  const [structure, setStructure] = useState(data.structure || "");
  const [nature, setNature] = useState(data.nature || "");
  const [heading, setHeading] = useState(data.heading || "");
  const [question, setQuestion] = useState(data.question_md || "");
  const [solution, setSolution] = useState(data.solution_md || "");
  const [subs, setSubs] = useState<any[]>(data.sub_questions || []);

  const [solutionBlocks, setSolutionBlocks] = useState<any[]>(
    data.solution_blocks || []
  );


  useEffect(() => {
    if (structure === "single") setNature("subjective");
  }, [structure]);

  function canSave() {
    if (!marks || !structure) return false;
    if (structure === "single") return !!question;
    if (!heading || !nature || subs.length === 0) return false;
    // if (!solution || !nature || subs.length === 0) return false;
    return subs.every(
      s =>
        s.marks &&
        s.question_md &&
        (nature !== "objective" ||
          (s.options?.every((o: string) => o)))
    );
  }

  
  function reIndex(list: any[]) {
    return list.map((s, i) => ({
      ...s,
      sq_no: String.fromCharCode(97 + i),
    }));
  }

  function addSub(type: "objective" | "subjective") {
    setSubs(prev =>
      reIndex([
        ...prev,
        {
          sq_no: "",
          marks: "",
          question_md: "",
          ...(type === "objective"
            ? {
                options: ["", "", "", ""],
                correct_index: 0,
                solution_md: "",
              }
            // : { solution_md: "" }),
            : {
              solution_md: "",
              solution_blocks: [
                {
                  id: crypto.randomUUID(),
                  type: "text",
                  content: "",
                },
              ],
            }),
        },
      ])
    );
  }

  function updateSub(i: number, patch: any) {
    setSubs(prev =>
      prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s))
    );
  }

  function removeSub(i: number) {
    setSubs(prev => reIndex(prev.filter((_, idx) => idx !== i)));
  }

  // New for solution_block for single type
  function addTextBlock() {

    setSolutionBlocks(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "text",
        content: "",
      },
    ]);
  }
  
  async function addImageBlock(file: File) {
  
    try {
  
      const imageIndex =
        solutionBlocks.filter(
          b => b.type === "image"
        ).length + 1;
  
  
      const public_id =
        `solutions/${paper.subject_code}` +
        `/q_${qNo}` +
        `/img_${imageIndex}`;
  
  
      toast.loading("Uploading image...", {
        id: "solution-upload"
      });
  
      const res = await uploadSolutionImage(
        file,
        public_id
      );

      setSolutionBlocks(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
  
          type: "image",
  
          image_url: res.image_url,
  
          public_id: res.public_id,
  
          caption: "",
        },
      ]);
  
  
      toast.success("Image uploaded", {
        id: "solution-upload"
      });
  
    } catch (err: any) {
  
      toast.error(
        err.message || "Upload failed"
      );
    }
  }
  
  
  function updateBlock(
    id: string,
    patch: any
  ) {
  
    setSolutionBlocks(prev =>
      prev.map(block =>
        block.id === id
          ? { ...block, ...patch }
          : block
      )
    );
  }
  
  
  function removeBlock(id: string) {
  
    setSolutionBlocks(prev =>
      prev.filter(block => block.id !== id)
    );
  }






  // New for solution_block for multi type*sub-quetion)
  function addSubTextBlock(subIndex: number) {

    setSubs(prev =>
      prev.map((sub, i) => {
  
        if (i !== subIndex) return sub;
  
        return {
          ...sub,
  
          solution_blocks: [
            ...(sub.solution_blocks || []),
  
            {
              id: crypto.randomUUID(),
  
              type: "text",
  
              content: "",
            },
          ],
        };
      })
    );
  }
  
  
  
  async function addSubImageBlock(
    subIndex: number,
    sq_no: string,
    file: File
  ) {
  
    try {
  
      const sub = subs[subIndex];
  
      const imageIndex =
        (sub.solution_blocks || []).filter(
          (b: any) => b.type === "image"
        ).length + 1;
  
  
      const public_id =
        `solutions/${paper.subject_code}` +
        `/q_${qNo}` +
        `/sub_${sq_no}` +
        `/img_${imageIndex}`;
  
  
      toast.loading("Uploading image...", {
        id: "sub-upload"
      });
  
  
      const res = await uploadSolutionImage(
        file,
        public_id
      );
  
  
      setSubs(prev =>
        prev.map((sub, i) => {
  
          if (i !== subIndex) return sub;
  
          return {
            ...sub,
  
            solution_blocks: [
              ...(sub.solution_blocks || []),
  
              {
                id: crypto.randomUUID(),
  
                type: "image",
  
                image_url: res.image_url,
  
                public_id: res.public_id,
  
                caption: "",
              },
            ],
          };
        })
      );
  
  
      toast.success("Image uploaded", {
        id: "sub-upload"
      });
  
    } catch (err: any) {
  
      toast.error(
        err.message || "Upload failed"
      );
    }
  }
  
  
  
  function updateSubBlock(
    subIndex: number,
    blockId: string,
    patch: any
  ) {
  
    setSubs(prev =>
      prev.map((sub, i) => {
  
        if (i !== subIndex) return sub;
  
        return {
  
          ...sub,
  
          solution_blocks:
            sub.solution_blocks.map((block: any) =>
  
              block.id === blockId
                ? { ...block, ...patch }
                : block
            ),
        };
      })
    );
  }
  
  
  
  function removeSubBlock(
    subIndex: number,
    blockId: string
  ) {
  
    setSubs(prev =>
      prev.map((sub, i) => {
  
        if (i !== subIndex) return sub;
  
        return {
  
          ...sub,
  
          solution_blocks:
            sub.solution_blocks.filter(
              (block: any) =>
                block.id !== blockId
            ),
        };
      })
    );
  }



  async function save() {
    if (!canSave()) {
      alert("Fill all mandatory fields");
      return;
    }

    const payload: any = {
      q_no: qNo,
      marks: Number(marks),
      structure,
      nature,
    };

    if (structure === "single") {
      payload.question_md = question;
      // payload.solution_md = solution;
      // payload.solution_md = solution;
    if (solutionBlocks.length > 0) {
      payload.solution_blocks = solutionBlocks;
    }

    } else {
      payload.heading = heading;
      payload.sub_questions = subs;
    }

    const url = isEdit
      ? `${API_URL}/admin/papers/${paperId}/questions/${qNo}`
      : `${API_URL}/admin/papers/${paperId}/questions`;

    await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(payload),
    });

    onSaved();
    onClose();
  }


  useEffect(() => {

    if (
      structure === "single" &&
      nature === "subjective" &&
      solutionBlocks.length === 0
    ) {
  
      setSolutionBlocks([
        {
          id: crypto.randomUUID(),
  
          type: "text",
  
          content: "",
        },
      ]);
    }
  
  }, [structure, nature]);

  /* UI unchanged below */
  
  return (
    <div className="bg-[#0F1629] border border-white/10 rounded-xl p-6 mt-6 space-y-4">
      <h3 className="font-semibold">
        {isEdit ? `Edit Question Q${qNo}` : `Add Question (Q${qNo})`}
      </h3>

      <input
        className="input"
        placeholder="Marks (14)"
        value={marks}
        onChange={e => setMarks(e.target.value)}
      />

      <select
        className="input"
        value={structure}
        onChange={e => setStructure(e.target.value)}
      >
        <option value="">Select Structure</option>
        <option value="single">Single</option>
        <option value="multi">With Sub-questions</option>
      </select>

      {/* {structure === "single" && (
        <>
          <textarea
            className="input h-32"
            placeholder="Question (Markdown + LaTeX)"
            value={question}
            onChange={e => setQuestion(e.target.value)}
          />
          <textarea
            className="input h-48"
            placeholder="Solution (Markdown + LaTeX)"
            value={solution}
            onChange={e => setSolution(e.target.value)}
          />
        </>
      )} */}

{/* New for single typw quest., exteende for image */}
{structure === "single" && (

<>

  <textarea
    className="input h-32"
    placeholder="Question Text"
    value={question}
    onChange={e => setQuestion(e.target.value)}
  />


  {/* OLD MARKDOWN SOLUTION */}
  {/* <textarea
    className="input h-40"
    placeholder="Legacy solution_md (optional)"
    value={solution}
    onChange={e => setSolution(e.target.value)}
  /> */}


  {/* txt/img preview edit BLOCKS */}
  <div className="space-y-4 mt-4">

    {solutionBlocks.map((block, index) => (

      <div
        key={block.id}
        className="border border-white/10 rounded-2xl p-4 bg-[#11172C]"
      >

        <div className="flex justify-between items-center mb-3">

          <p className="text-sm text-slate-400 font-medium">
            Block {index + 1} • {block.type}
          </p>

          <button
            onClick={() => removeBlock(block.id)}
            className="text-red-400 text-sm"
          >
            Remove
          </button>

        </div>


        {/* TEXT BLOCK */}
        {block.type === "text" && (

          <textarea
            className="input h-40"
            placeholder="Write Solution..."
            value={block.content}
            onChange={e =>
              updateBlock(block.id, {
                content: e.target.value,
              })
            }
          />
        )}


        {/* IMAGE BLOCK */}
        {block.type === "image" && (

          <div className="space-y-3">

            <img
              src={block.image_url}
              alt="solution"
              className="rounded-2xl border max-h-[400px] object-contain bg-black/20"
            />

            <input
              className="input"
              placeholder="Image caption (optional)"
              value={block.caption || ""}
              onChange={e =>
                updateBlock(block.id, {
                  caption: e.target.value,
                })
              }
            />

          </div>
        )}

      </div>
    ))}

  </div>


  {/* ADDition txt/img BLOCK ACTIONS */}
  <div className="flex flex-wrap gap-3">

    <button
      type="button"
      onClick={addTextBlock}
      className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm"
    >
      + Add Text Solution
    </button>


    <label className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm cursor-pointer">
      + Add Image Solution

      <input
        type="file"
        accept="image/*"
        hidden
        onChange={async e => {

          const file = e.target.files?.[0];

          if (!file) return;

          await addImageBlock(file);
        }}
      />
    </label>

  </div>



</>
)}




{/* For sub-questions */}

      {structure === "multi" && (
        <>
          <input
            className="input"
            placeholder="Main Question Heading"
            value={heading}
            onChange={e => setHeading(e.target.value)}
          />

          <select
            className="input"
            value={nature}
            onChange={e => setNature(e.target.value)}
          >
            <option value="">Select Nature</option>
            <option value="objective">Objective</option>
            <option value="subjective">Subjective</option>
          </select>

          {/* <button
            onClick={() => addSub(nature)}
            className="text-indigo-400 text-sm"
            disabled={!nature}
          >
            + Add Sub-question
          </button> */}

          {subs.map((s, i) => (
            <div key={s.sq_no} className="border border-white/10 p-4 rounded">
              <div className="flex justify-between">
                <strong>({s.sq_no})</strong>
                <button
                  onClick={() => removeSub(i)}
                  className="text-red-400 text-xs"
                >
                  Remove
                </button>
              </div>

              <input
                className="input mt-2"
                placeholder="Sub-question Marks (2 or 7)"
                value={s.marks}
                onChange={e => updateSub(i, { marks: e.target.value })}
              />

              <textarea
                className="input mt-2"
                placeholder="Question Text"
                value={s.question_md}
                onChange={e =>
                  updateSub(i, { question_md: e.target.value })
                }
              />

              {nature === "objective" && (
                <>
                  {s.options.map((op: string, idx: number) => (
                    <div key={idx} className="flex gap-2 mt-2">
                      <input
                        type="radio"
                        checked={s.correct_index === idx}
                        onChange={() =>
                          updateSub(i, { correct_index: idx })
                        }
                      />
                      <input
                        className="input"
                        value={op}
                        onChange={e => {
                          const opts = [...s.options];
                          opts[idx] = e.target.value;
                          updateSub(i, { options: opts });
                        }}
                      />
                    </div>
                  ))}

                  <textarea
                    className="input h-32 mt-2"
                    placeholder="Solution (optional)"
                    value={s.solution_md}
                    onChange={e =>
                      updateSub(i, { solution_md: e.target.value })
                    }
                  />
                </>
              )}

              {/* {nature === "subjective" && (
                <textarea
                  className="input h-32 mt-2"
                  placeholder="Solution (Markdown + LaTeX)"
                  value={s.solution_md}
                  onChange={e =>
                    updateSub(i, { solution_md: e.target.value })
                  }
                />
              )} */}
        
{/* UI for add and edit for subjective multi sub-question */}
{nature === "subjective" && (

<>


  {/* BLOCKS */}
  <div className="space-y-4 mt-4">

    {(s.solution_blocks || []).map(
      (block: any, blockIndex: number) => (

        <div
          key={block.id}
          className="border border-white/10 rounded-2xl p-4 bg-[#11172C]"
        >

          <div className="flex justify-between items-center mb-3">

            <p className="text-sm text-slate-400">
              Block {blockIndex + 1}
            </p>

            <button
              onClick={() =>
                removeSubBlock(i, block.id)
              }
              className="text-red-400 text-sm"
            >
              Remove
            </button>

          </div>


          {/* TEXT */}
          {block.type === "text" && (

            <textarea
              className="input h-36"
              placeholder="Write Solution..."
              value={block.content}
              onChange={e =>
                updateSubBlock(
                  i,
                  block.id,
                  {
                    content: e.target.value,
                  }
                )
              }
            />
          )}


          {/* IMAGE */}
          {block.type === "image" && (

            <div className="space-y-3">

              <img
                src={block.image_url}
                alt="solution"
                className="rounded-2xl border max-h-[400px]"
              />

              <input
                className="input"
                placeholder="Caption (Optional)"
                value={block.caption || ""}
                onChange={e =>
                  updateSubBlock(
                    i,
                    block.id,
                    {
                      caption: e.target.value,
                    }
                  )
                }
              />

            </div>
          )}

        </div>
      )
    )}

  </div>

  {/* ADDition txt/img BLOCK ACTIONS */}
  <div className="flex flex-wrap gap-3 mt-4">

    <button
      type="button"
      onClick={() => addSubTextBlock(i)}
      className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm"
    >
      + Add Text Solution
    </button>

    <label className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm cursor-pointer">

    + Add Image Solution

      <input
        type="file"
        accept="image/*"
        hidden
        onChange={async e => {

          const file = e.target.files?.[0];

          if (!file) return;

          await addSubImageBlock(
            i,
            s.sq_no,
            file
          );
        }}
      />
    </label>

  </div>


</>

)}


  
            </div>
          ))}

        <button
            onClick={() => addSub(nature)}
            className="text-indigo-400 text-sm"
            disabled={!nature}
          >
            + Add Sub-question
        </button>

        </>

      
        
      )}

      <div className="flex gap-4 pt-4">
        <button onClick={save} className="btn-primary">
          Save
        </button>
        <button onClick={onClose} className="text-slate-400">
          Cancel
        </button>
      </div>
    </div>
    
  );


  
}
