"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { RunSummary } from "@/components/eval/types";
import { RunSummaryCard } from "@/components/eval/RunSummaryCard";

export default function DashboardPage() {
  const router = useRouter();
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/eval/results");
    if (res.ok) setRuns(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function triggerRun() {
    setRunning(true);
    try {
      const res = await fetch("/api/eval/run", { method: "POST" });
      if (res.ok) await load();
    } finally {
      setRunning(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : prev.length < 2 ? [...prev, id] : [prev[1], id]
    );
  }

  function goCompare() {
    if (selected.length === 2) {
      router.push(`/eval/compare?runA=${selected[0]}&runB=${selected[1]}`);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Evaluation Runs</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Golden dataset · system-v1 vs system-v2
          </p>
        </div>
        <div className="flex gap-2">
          {selected.length === 2 && (
            <button
              onClick={goCompare}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
            >
              Compare selected
            </button>
          )}
          <button
            onClick={triggerRun}
            disabled={running}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {running ? "Running eval…" : "New eval run"}
          </button>
        </div>
      </div>

      {/* Selection hint */}
      {runs.length >= 2 && selected.length < 2 && (
        <p className="mb-3 text-xs text-gray-400">
          Check two runs to compare them side by side.
        </p>
      )}

      {/* Run list */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-gray-400">
          Loading runs…
        </div>
      ) : runs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm font-medium text-gray-500">No evaluation runs yet</p>
          <p className="mt-1 text-xs text-gray-400">
            Click "New eval run" or run <code className="font-mono">npm run eval:run</code>
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {runs.map(run => (
            <RunSummaryCard
              key={run.id}
              run={run}
              onCompareSelect={toggleSelect}
              selectedForCompare={selected.includes(run.id)}
            />
          ))}
        </div>
      )}

      {running && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Running evaluation against all 20 test cases — this typically takes 1–3 minutes.
          The page will refresh automatically when done.
        </div>
      )}
    </div>
  );
}
