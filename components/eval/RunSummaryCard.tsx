import Link from "next/link";
import type { RunSummary } from "./types";
import { pct, scoreBg } from "./types";

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function PassBar({ passRate }: { passRate: number | null }) {
  const rate = passRate ?? 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full ${scoreBg(rate)}`}
          style={{ width: `${Math.round(rate * 100)}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-gray-900">{pct(passRate)}</span>
    </div>
  );
}

export function RunSummaryCard({
  run,
  onCompareSelect,
  selectedForCompare,
}: {
  run: RunSummary;
  onCompareSelect?: (id: string) => void;
  selectedForCompare?: boolean;
}) {
  const date = new Date(run.startedAt).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`flex items-center gap-4 rounded-lg border bg-white px-4 py-3 shadow-sm transition-colors ${
        selectedForCompare ? "border-blue-400 ring-1 ring-blue-400" : "border-gray-200"
      }`}
    >
      {/* Select for compare */}
      {onCompareSelect && (
        <input
          type="checkbox"
          checked={selectedForCompare ?? false}
          onChange={() => onCompareSelect(run.id)}
          className="h-4 w-4 rounded border-gray-300 accent-blue-600"
          title="Select for comparison"
        />
      )}

      {/* Prompt + model */}
      <div className="w-32 shrink-0">
        <p className="truncate text-sm font-medium text-gray-900">{run.prompt.name}</p>
        <p className="truncate text-xs text-gray-400">{run.modelName}</p>
      </div>

      {/* Status badge */}
      <span
        className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
          run.status === "completed"
            ? "bg-green-100 text-green-700"
            : run.status === "running"
            ? "bg-blue-100 text-blue-700"
            : "bg-red-100 text-red-700"
        }`}
      >
        {run.status}
      </span>

      {/* Pass rate bar */}
      <div className="flex-1">
        <PassBar passRate={run.passRate} />
        <p className="mt-0.5 text-xs text-gray-400">
          {run.passCount} / {run.totalCases} passed
        </p>
      </div>

      {/* Stats */}
      <div className="hidden gap-6 sm:flex">
        <StatBox label="Avg latency" value={run.avgLatencyMs ? `${Math.round(run.avgLatencyMs)}ms` : "—"} />
        <StatBox label="Tokens" value={run.totalTokens.toLocaleString()} />
        <StatBox label="Cost" value={run.estimatedCostUsd ? `$${run.estimatedCostUsd.toFixed(3)}` : "—"} />
        <StatBox label="Date" value={date} />
      </div>

      {/* Actions */}
      <Link
        href={`/eval/${run.id}`}
        className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        View
      </Link>
    </div>
  );
}
