"use client";

import React from "react";
import { Plus, Trash2, Layers, X } from "lucide-react";
import { BlogSubTopic } from "./BlogRenderer";

interface DynamicSubTopicEditorProps {
  subTopics: BlogSubTopic[];
  onChange: (subTopics: BlogSubTopic[]) => void;
}

export default function DynamicSubTopicEditor({
  subTopics,
  onChange,
}: DynamicSubTopicEditorProps) {
  function addSubTopic() {
    const newTopic: BlogSubTopic = {
      title: `Sub-topic ${subTopics.length + 1}`,
      description: "",
      points: [],
    };
    onChange([...subTopics, newTopic]);
  }

  function removeSubTopic(index: number) {
    const updated = subTopics.filter((_, idx) => idx !== index);
    onChange(updated);
  }

  function updateField(index: number, field: keyof BlogSubTopic, value: any) {
    const updated = [...subTopics];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  }

  function addPoint(index: number) {
    const updated = [...subTopics];
    const currentPoints = updated[index].points || [];
    updated[index] = { ...updated[index], points: [...currentPoints, ""] };
    onChange(updated);
  }

  function removePoint(subIdx: number, pointIdx: number) {
    const updated = [...subTopics];
    const currentPoints = updated[subIdx].points || [];
    const newPoints = currentPoints.filter((_, idx) => idx !== pointIdx);
    updated[subIdx] = { ...updated[subIdx], points: newPoints };
    onChange(updated);
  }

  function updatePoint(subIdx: number, pointIdx: number, text: string) {
    const updated = [...subTopics];
    const currentPoints = [...(updated[subIdx].points || [])];
    currentPoints[pointIdx] = text;
    updated[subIdx] = { ...updated[subIdx], points: currentPoints };
    onChange(updated);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            Dynamic Sub-Topics & Sections
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Break down complex news or syllabus changes into distinct sub-sections
          </p>
        </div>
        <button
          type="button"
          onClick={addSubTopic}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Sub-Topic
        </button>
      </div>

      {subTopics.length === 0 ? (
        <div className="border border-dashed border-white/10 rounded-xl p-6 text-center text-xs text-slate-400">
          No sub-topics added yet. Click &quot;Add Sub-Topic&quot; to structure your blog into sections with points.
        </div>
      ) : (
        subTopics.map((topic, sIdx) => (
          <div
            key={sIdx}
            className="bg-[#151D33] border border-white/10 rounded-xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between gap-3">
              <input
                type="text"
                value={topic.title}
                onChange={(e) => updateField(sIdx, "title", e.target.value)}
                placeholder="Sub-topic Heading (e.g. 1. Key Eligibility Changes)"
                className="bg-[#0B0F1A] border border-white/15 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500 flex-1"
              />
              <button
                type="button"
                onClick={() => removeSubTopic(sIdx)}
                className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/10 transition cursor-pointer"
                title="Delete Sub-Topic"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Description */}
            <div>
              <textarea
                value={topic.description || ""}
                onChange={(e) => updateField(sIdx, "description", e.target.value)}
                rows={2}
                placeholder="Brief description or explanation for this section..."
                className="w-full bg-[#0B0F1A] border border-white/10 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Bullet Points */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Bullet Points ({topic.points?.length || 0})
                </span>
                <button
                  type="button"
                  onClick={() => addPoint(sIdx)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Point
                </button>
              </div>

              {topic.points && topic.points.length > 0 && (
                <div className="space-y-1.5">
                  {topic.points.map((pt, pIdx) => (
                    <div key={pIdx} className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 w-4">•</span>
                      <input
                        type="text"
                        value={pt}
                        onChange={(e) => updatePoint(sIdx, pIdx, e.target.value)}
                        placeholder={`Point ${pIdx + 1}`}
                        className="flex-1 bg-[#0B0F1A] border border-white/10 rounded-md px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => removePoint(sIdx, pIdx)}
                        className="text-slate-500 hover:text-red-400 p-0.5 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
