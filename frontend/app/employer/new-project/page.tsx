"use client";
import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useRouter } from "next/navigation";
import { formatPaise } from "@/lib/utils";
import { Sparkles, Bot, Plus, Trash2, PenLine, Languages, Code2 } from "lucide-react";

interface Milestone {
  sequence: number;
  title: string;
  description: string;
  ai_success_criteria: string;
  weight_percentage: number;
  suggested_deadline_days: number;
}

interface DecomposeResult {
  project_title: string;
  project_summary: string;
  milestones: Milestone[];
}

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [requirement, setRequirement] = useState("");
  const [totalDays, setTotalDays] = useState(14);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<DecomposeResult | null>(null);
  // Editable milestones — initialized from AI output, user can modify freely
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [category, setCategory] = useState("WRITING");
  const [sourceText, setSourceText] = useState("");
  const [budget, setBudget] = useState(10000);
  const [saving, setSaving] = useState(false);

  const categories = [
    { key: "WRITING", label: "Writing", icon: PenLine, desc: "Articles, blogs, copy, docs" },
    { key: "TRANSLATION", label: "Translation", icon: Languages, desc: "Translate text between languages" },
    { key: "CODE", label: "Code", icon: Code2, desc: "Functions, scripts, components" },
  ];

  const decompose = async () => {
    if (requirement.length < 50) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch<DecomposeResult>("/projects/decompose", {
        method: "POST",
        body: JSON.stringify({ raw_requirement: requirement, category, total_duration_days: totalDays, ...(category === "TRANSLATION" && sourceText ? { source_text: sourceText } : {}) }),
      });
      setResult(data);
      setMilestones(data.milestones.map(m => ({ ...m })));
      setStep(2);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "AI decomposition failed");
    } finally {
      setLoading(false);
    }
  };

  // Build the final output merging user edits
  const resultWithEdits = result ? {
    ...result,
    milestones: milestones.map((m, i) => ({ ...m, sequence: i + 1 })),
  } : null;

  const getCumulativeDeadlines = () => {
    const deadlines: string[] = [];
    let cum = 0;
    milestones.forEach(m => {
      cum += m.suggested_deadline_days;
      const date = new Date();
      date.setDate(date.getDate() + cum);
      deadlines.push(date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }));
    });
    return deadlines;
  };
  const deadlines = milestones.length ? getCumulativeDeadlines() : [];
  const totalDaysUsed = milestones.reduce((a, m) => a + m.suggested_deadline_days, 0);
  const totalWeight = milestones.reduce((a, m) => a + m.weight_percentage, 0);

  // Update a single field on a milestone
  const updateMilestone = (i: number, field: keyof Milestone, value: string | number) => {
    setMilestones(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };

  // Normalize weights to sum to 100
  const normalizeWeights = () => {
    setMilestones(prev => {
      const total = prev.reduce((a, m) => a + m.weight_percentage, 0);
      if (total === 0) return prev;
      return prev.map(m => ({ ...m, weight_percentage: Math.round(m.weight_percentage / total * 1000) / 10 }));
    });
  };

  // Add a new blank milestone
  const addMilestone = () => {
    setMilestones(prev => [
      ...prev,
      {
        sequence: prev.length + 1,
        title: "",
        description: "",
        ai_success_criteria: "",
        weight_percentage: 0,
        suggested_deadline_days: 3,
      },
    ]);
  };

  // Remove a milestone (minimum 1)
  const removeMilestone = (i: number) => {
    if (milestones.length <= 1) return;
    setMilestones(prev => prev.filter((_, idx) => idx !== i));
  };

  const createProject = async () => {
    if (!resultWithEdits || budget < 500) return;
    // Validate weights
    const wSum = milestones.reduce((a, m) => a + m.weight_percentage, 0);
    if (Math.abs(wSum - 100) > 1) {
      setError(`Weight percentages must sum to 100% (currently ${wSum.toFixed(1)}%). Click "Auto-fix" to normalize.`);
      return;
    }
    // Validate all milestones have titles
    if (milestones.some(m => !m.title.trim())) {
      setError("All milestones must have a title.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const proj = await apiFetch<{ id: string }>("/projects/create", {
        method: "POST",
        body: JSON.stringify({
          raw_requirement: requirement,
          category,
          total_budget: budget * 100,
          ai_output: resultWithEdits,
          ...(category === "TRANSLATION" && sourceText ? { source_text: sourceText } : {}),
        }),
      });
      router.push(`/employer/projects/${proj.id}?created=1`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Failed to create project");
      setSaving(false);
    }
  };

  const milestonePool = budget * 0.5;

  const inputClass = "w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 text-sm transition-colors";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div>
          <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">Employer</div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">New Project</h1>
        </div>
        {/* Step indicators */}
        <div className="flex items-center gap-2 ml-2">
          {[1, 2].map(s => (
            <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              step >= s ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
            }`}>{s}</div>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm">{error}</div>
      )}

      {/* Step 1 */}
      {step === 1 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">Describe Your Project</h2>
          </div>
          <textarea
            value={requirement}
            onChange={e => setRequirement(e.target.value)}
            rows={category === "TRANSLATION" ? 4 : 8}
            placeholder={
              category === "WRITING"
                ? `Describe your project in plain English. Don't worry about structure.\n\nExample: "I need a 1200-word blog post about the future of AI in healthcare. The audience is non-technical executives. It should be SEO-friendly with keywords like 'AI healthcare 2024'. Tone should be professional but accessible."`
                : category === "TRANSLATION"
                ? `Describe the translation requirements — source language, target language, tone, and any special instructions.\n\nExample: "Translate from English to Spanish (Latin American). Professional but friendly tone. Keep technical terms like 'API' in English."`
                : `Describe the code you need written.\n\nExample: "Write a Python utility that validates and parses CSV files. It should handle: missing columns, type mismatches, duplicate rows. Return a clean dataframe and a list of validation errors. Include proper error handling and type hints."`
            }
            className={`${inputClass} resize-none`}
          />
          {/* Source text — only for Translation */}
          {category === "TRANSLATION" && (
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Source Text to Translate</div>
              <textarea
                value={sourceText}
                onChange={e => setSourceText(e.target.value)}
                rows={8}
                placeholder="Paste the original text that needs to be translated here..."
                className={`${inputClass} resize-none`}
              />
              <div className="text-xs text-slate-400 mt-1">{sourceText.split(/\s+/).filter(Boolean).length} words</div>
            </div>
          )}
          {/* Duration row */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <span className="text-sm text-slate-500">Total project duration:</span>
            <input
              type="number" value={totalDays} min={3} max={365}
              onChange={e => setTotalDays(Math.max(3, parseInt(e.target.value) || 14))}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-900 w-20 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <span className="text-sm text-slate-500">days</span>
            <span className="text-xs text-slate-400 sm:ml-auto">AI will distribute these across milestones</span>
          </div>
          {/* Category selector */}
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Category</div>
            <div className="flex gap-2 flex-wrap">
              {categories.map(({ key, label, icon: Icon, desc }) => (
                <button key={key} onClick={() => setCategory(key)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                    category === key
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700"
                  }`}>
                  <Icon className="w-4 h-4" />
                  <div className="text-left">
                    <div>{label}</div>
                    <div className="text-xs opacity-60 font-normal">{desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span className="text-xs text-slate-400">{requirement.length} chars (min 50)</span>
            <button
              onClick={decompose}
              disabled={requirement.length < 50 || loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              {loading ? "AI analyzing..." : "Generate Roadmap"}
            </button>
          </div>
          {loading && (
            <div className="text-center py-8">
              <div className="animate-pulse text-slate-500 text-sm">AI is analyzing your requirements and creating milestones...</div>
            </div>
          )}
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && result && (
        <div className="space-y-4">
          {/* Project header card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{result.project_title}</h2>
                <p className="text-slate-500 mt-1 text-sm">{result.project_summary}</p>
              </div>
              <button onClick={() => setStep(1)} className="text-sm text-slate-400 hover:text-slate-700 transition-colors">
                ← Regenerate
              </button>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-700">
              50% goes into the Milestone Pool — paid as each milestone passes. 50% is a Success Fee — only released when ALL work is complete.
              <span className="block mt-1 text-xs text-blue-500">You can edit titles, descriptions, success criteria, and weight splits below.</span>
            </div>
          </div>

          {/* Timeline + weight summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`flex items-center gap-3 rounded-xl p-3.5 text-sm border ${
              totalDaysUsed === totalDays
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-amber-50 border-amber-200 text-amber-700"
            }`}>
              <span>Timeline: <strong>{totalDaysUsed}d</strong> / {totalDays}d</span>
            </div>
            <div className={`flex items-center gap-3 rounded-xl p-3.5 text-sm border ${
              Math.abs(totalWeight - 100) < 1
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-red-50 border-red-200 text-red-600"
            }`}>
              <span>Weights: <strong>{totalWeight.toFixed(1)}%</strong> / 100%</span>
              {Math.abs(totalWeight - 100) >= 1 && (
                <button onClick={normalizeWeights} className="ml-auto text-xs bg-white border border-red-200 text-red-600 px-2 py-0.5 rounded-lg hover:bg-red-50">
                  Auto-fix
                </button>
              )}
            </div>
          </div>

          {/* Milestone cards — fully editable */}
          {milestones.map((m, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              {/* Header row */}
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg shrink-0">M{i + 1}</div>
                <input
                  type="text"
                  value={m.title}
                  onChange={e => updateMilestone(i, "title", e.target.value)}
                  placeholder="Milestone title..."
                  className="flex-1 bg-transparent border-b border-slate-200 focus:border-blue-400 text-slate-900 font-semibold text-sm py-1 focus:outline-none transition-colors"
                />
                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="number" min={0} max={100} step={5}
                    value={m.weight_percentage}
                    onChange={e => updateMilestone(i, "weight_percentage", Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                    className="w-16 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 text-blue-700 text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <span className="text-xs text-blue-500 font-medium">%</span>
                </div>
                {milestones.length > 1 && (
                  <button onClick={() => removeMilestone(i)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Description */}
              <textarea
                value={m.description}
                onChange={e => updateMilestone(i, "description", e.target.value)}
                placeholder="What should the freelancer deliver for this milestone?"
                rows={2}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-200 resize-none transition-colors"
              />

              {/* Success criteria */}
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Success Criteria (AI will judge against these)</div>
                <textarea
                  value={m.ai_success_criteria}
                  onChange={e => updateMilestone(i, "ai_success_criteria", e.target.value)}
                  placeholder="- Criterion 1&#10;- Criterion 2&#10;- Criterion 3"
                  rows={3}
                  className="w-full bg-amber-50/50 border border-amber-100 rounded-xl px-4 py-2.5 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-100 focus:border-amber-200 resize-none font-mono transition-colors"
                />
              </div>

              {/* Deadline */}
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5">
                <span className="text-xs text-slate-500">Duration:</span>
                <input
                  type="number" min={1} max={90}
                  value={m.suggested_deadline_days}
                  onChange={e => updateMilestone(i, "suggested_deadline_days", Math.max(1, parseInt(e.target.value) || 1))}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-900 w-16 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <span className="text-xs text-slate-500">days</span>
                <span className="text-xs text-slate-400 ml-auto">Due: <span className="text-slate-600 font-medium">{deadlines[i]}</span></span>
              </div>
            </div>
          ))}

          {/* Add milestone button */}
          <button
            onClick={addMilestone}
            className="w-full flex items-center justify-center gap-2 bg-white border-2 border-dashed border-slate-200 hover:border-blue-300 text-slate-400 hover:text-blue-600 rounded-2xl py-4 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Milestone
          </button>

          {/* Budget */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-widest mb-5">Set Your Budget</h3>
            <div className="flex items-center gap-3 mb-5">
              <span className="text-slate-500 text-lg font-medium">₹</span>
              <input
                type="number" value={budget} min={500}
                onChange={e => setBudget(parseInt(e.target.value) || 0)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 w-40 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 font-mono text-lg"
              />
              <span className="text-xs text-slate-400">(min ₹500)</span>
            </div>
            {/* Budget breakdown */}
            <div className="mb-5 space-y-3">
              {/* 50/50 split bar */}
              <div className="flex rounded-xl overflow-hidden h-9 text-xs font-semibold">
                <div className="flex-1 bg-blue-600 flex items-center justify-center text-white gap-1">
                  Milestone Pool · 50%
                </div>
                <div className="flex-1 bg-slate-700 flex items-center justify-center text-white gap-1">
                  Success Fee · 50%
                </div>
              </div>

              {/* Amounts row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <div className="text-xs text-blue-500 font-medium mb-0.5">Milestone Pool</div>
                  <div className="text-blue-800 font-bold font-mono text-lg">{formatPaise(milestonePool * 100)}</div>
                  <div className="text-xs text-blue-400 mt-0.5">Paid per milestone</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="text-xs text-slate-500 font-medium mb-0.5">Success Fee</div>
                  <div className="text-slate-800 font-bold font-mono text-lg">{formatPaise(milestonePool * 100)}</div>
                  <div className="text-xs text-slate-400 mt-0.5">Released on full completion</div>
                </div>
              </div>

              {/* Per-milestone breakdown */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-200">
                  Milestone Payouts
                </div>
                {milestones.map((m, i) => {
                  const amount = milestonePool * m.weight_percentage / 100;
                  return (
                    <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i < milestones.length - 1 ? "border-b border-slate-100" : ""}`}>
                      <div className="bg-blue-600 text-white text-xs font-bold w-7 h-7 rounded-lg flex items-center justify-center shrink-0">
                        M{i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-slate-600 font-medium truncate">{m.title || "Untitled"}</div>
                        <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-400 rounded-full" style={{ width: `${m.weight_percentage}%` }} />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold font-mono text-slate-800">{formatPaise(amount * 100)}</div>
                        <div className="text-xs text-slate-400">{m.weight_percentage}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <button
              onClick={createProject}
              disabled={budget < 500 || saving}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm"
            >
              {saving ? "Creating project..." : `List Project — ${formatPaise(budget * 100)} max budget →`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
