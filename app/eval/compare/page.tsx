"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { RunSummary, CompareResponse } from "@/components/eval/types";
import { PromptCompareView } from "@/components/eval/PromptCompareView";

export default function ComparePage() {
  const searchParams = useSearchParams();
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [runAId, setRunAId] = useState(searchParams.get("runA") ?? "");
  const [runBId, setRunBId] = useState(searchParams.get("runB") ?? "");
  const [compareData, setCompareData] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available runs for the dropdowns
  useEffect(() => {
    fetch("/api/eval/results")
      .then(r => r.json())
      .then(data => setRuns(Array.isArray(data) ? data : []));
  }, []);

  // Auto-fetch when both IDs are set
  useEffect(() => {
    if (!runAId || !runBId || runAId === runBId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/eval/compare?runA=${runAId}&runB=${runBId}`)
      .then(r => r.json())
      .then(data => {
        if ("error" in data) setError(data.error);
        else setCompareData(data);
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [runAId, runBId]);

  function RunSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
    return (
      <div className="flex-1">
        <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Select a run…</option>
          {runs.map(r => (
            <option key={r.id} value={r.id}>
              {r.prompt.name} · {new Date(r.startedAt).toLocaleDateString()} · {r.passRate != null ? `${(r.passRate * 100).toFixed(0)}% pass` : r.status}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Link href="/dashboard" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
        ← Back to runs
      </Link>

      <h1 className="mt-3 mb-6 text-xl font-semibold text-gray-900">Prompt Comparison</h1>

      {/* Run selectors */}
      <div className="mb-8 flex gap-4">
        <RunSelect value={runAId} onChange={setRunAId} label="Baseline (Run A)" />
        <RunSelect value={runBId} onChange={setRunBId} label="Comparison (Run B)" />
      </div>

      {runAId === runBId && runAId && (
        <p className="mb-6 text-sm text-amber-600">Select two different runs to compare.</p>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20 text-sm text-gray-400">
          Loading comparison…
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {compareData && !loading && <PromptCompareView data={compareData} />}

      {!runAId && !runBId && (
        <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 py-20 text-sm text-gray-400">
          Select two runs above to compare their metrics side by side.
        </div>
      )}
    </div>
  );
}
