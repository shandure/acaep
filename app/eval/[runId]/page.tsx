"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { RunDetail } from "@/components/eval/types";
import { pct, scoreColor } from "@/components/eval/types";
import { ResultRow } from "@/components/eval/ResultRow";

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function AvgScore({ label, scores }: { label: string; scores: number[] }) {
  const avg = scores.length ? scores.reduce((s, n) => s + n, 0) / scores.length : 0;
  return (
    <div className="text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-sm font-semibold ${scoreColor(avg)}`}>{pct(avg)}</p>
    </div>
  );
}

export default function RunDetailPage() {
  const { runId } = useParams<{ runId: string }>();
  const [run, setRun] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/eval/results/${runId}`)
      .then(r => r.json())
      .then(data => { setRun(data); setLoading(false); });
  }, [runId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-sm text-gray-400">
        Loading run…
      </div>
    );
  }

  if (!run || "error" in (run as object)) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8 text-sm text-red-600">
        Run not found.
      </div>
    );
  }

  const results = run.results ?? [];

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* Back link */}
      <Link href="/dashboard" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
        ← Back to runs
      </Link>

      {/* Header */}
      <div className="mt-3 mb-6">
        <h1 className="text-xl font-semibold text-gray-900">
          {run.prompt.name} — {run.modelName}
        </h1>
        <p className="mt-0.5 text-sm text-gray-500">
          {new Date(run.startedAt).toLocaleString()} ·{" "}
          <span className={`font-medium ${run.status === "completed" ? "text-green-600" : "text-yellow-600"}`}>
            {run.status}
          </span>
        </p>
      </div>

      {/* Summary stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Pass rate"
          value={pct(run.passRate)}
          sub={`${run.passCount} / ${run.totalCases} cases`}
        />
        <StatCard
          label="Avg latency"
          value={run.avgLatencyMs ? `${Math.round(run.avgLatencyMs)}ms` : "—"}
        />
        <StatCard
          label="Total tokens"
          value={run.totalTokens.toLocaleString()}
        />
        <StatCard
          label="Est. cost"
          value={run.estimatedCostUsd ? `$${run.estimatedCostUsd.toFixed(3)}` : "—"}
        />
      </div>

      {/* Avg metric scores */}
      <div className="mb-6 flex flex-wrap gap-6 rounded-lg border border-gray-200 bg-white px-6 py-4">
        <AvgScore label="Avg answer" scores={results.map(r => r.answerScore)} />
        <AvgScore label="Avg evidence" scores={results.map(r => r.evidenceScore)} />
        <AvgScore label="Avg precision" scores={results.map(r => r.retrievalPrecision)} />
        <AvgScore label="Avg recall" scores={results.map(r => r.retrievalRecall)} />
        <AvgScore label="Avg tool sel." scores={results.map(r => r.toolSelectionScore)} />
        <div className="text-center">
          <p className="text-xs text-gray-500">Hallucinations</p>
          <p className={`text-sm font-semibold ${results.some(r => r.hallucinated) ? "text-red-600" : "text-green-700"}`}>
            {results.filter(r => r.hallucinated).length}
          </p>
        </div>
      </div>

      {/* Results table */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">
            Test case results ({results.length})
          </h2>
          <p className="text-xs text-gray-400">Click any row to expand model vs expected answer</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="py-2 pl-4 pr-2 text-xs font-medium text-gray-400 w-16"></th>
                <th className="py-2 pr-4 text-xs font-medium text-gray-400">Query</th>
                <th className="py-2 pr-6 text-right text-xs font-medium text-gray-400">Scores</th>
                <th className="py-2 pr-4 text-right text-xs font-medium text-gray-400">Latency</th>
                <th className="py-2 pr-4 w-6"></th>
              </tr>
            </thead>
            <tbody>
              {results.map(result => (
                <ResultRow key={result.id} result={result} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
