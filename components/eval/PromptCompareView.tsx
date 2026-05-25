"use client";
import type { CompareResponse } from "./types";
import { pct, CATEGORY_COLORS } from "./types";

function DeltaBadge({ value, invert = false, unit = "" }: { value: number | null; invert?: boolean; unit?: string }) {
  if (value == null) return <span className="text-gray-400">—</span>;
  const improved = invert ? value < 0 : value > 0;
  const label = `${value > 0 ? "+" : ""}${unit === "%" ? (value * 100).toFixed(1) + "%" : value.toFixed(unit === "ms" ? 0 : 3) + unit}`;
  return (
    <span className={`text-xs font-medium ${improved ? "text-green-600" : value === 0 ? "text-gray-500" : "text-red-600"}`}>
      {label}
    </span>
  );
}

function MetricRow({ label, a, b, delta, invert = false, unit = "" }: {
  label: string;
  a: string;
  b: string;
  delta: number | null;
  invert?: boolean;
  unit?: string;
}) {
  return (
    <tr className="border-b border-gray-100">
      <td className="py-2 pr-4 text-sm text-gray-600">{label}</td>
      <td className="py-2 pr-4 text-sm font-medium text-gray-900">{a}</td>
      <td className="py-2 pr-4 text-sm font-medium text-gray-900">{b}</td>
      <td className="py-2">
        <DeltaBadge value={delta} invert={invert} unit={unit} />
      </td>
    </tr>
  );
}

export function PromptCompareView({ data }: { data: CompareResponse }) {
  const { runA, runB, deltas, perCase } = data;

  const regressions = perCase.filter(c => c.isRegression);
  const improvements = perCase.filter(c => c.isImprovement);

  return (
    <div className="space-y-8">
      {/* Run labels */}
      <div className="grid grid-cols-2 gap-4">
        {[runA, runB].map((run, i) => (
          <div key={run.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              {i === 0 ? "Baseline (A)" : "Comparison (B)"}
            </p>
            <p className="mt-1 text-base font-semibold text-gray-900">{run.prompt.name}</p>
            <p className="text-xs text-gray-500">{run.modelName} · {run.totalCases} cases</p>
          </div>
        ))}
      </div>

      {/* Metrics comparison table */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Metric comparison</h2>
        </div>
        <div className="overflow-x-auto px-5 pb-4">
          <table className="w-full">
            <thead>
              <tr className="text-left">
                <th className="py-2 pr-4 text-xs font-medium text-gray-400">Metric</th>
                <th className="py-2 pr-4 text-xs font-medium text-gray-400">Run A</th>
                <th className="py-2 pr-4 text-xs font-medium text-gray-400">Run B</th>
                <th className="py-2 text-xs font-medium text-gray-400">Delta</th>
              </tr>
            </thead>
            <tbody>
              <MetricRow
                label="Pass rate"
                a={pct(runA.passRate)}
                b={pct(runB.passRate)}
                delta={deltas.passRate}
                unit="%"
              />
              <MetricRow
                label="Avg answer score"
                a={pct(runA.results.length ? runA.results.reduce((s,r)=>s+r.answerScore,0)/runA.results.length : null)}
                b={pct(runB.results.length ? runB.results.reduce((s,r)=>s+r.answerScore,0)/runB.results.length : null)}
                delta={deltas.avgAnswerScore}
                unit="%"
              />
              <MetricRow
                label="Avg tool selection"
                a={pct(runA.results.length ? runA.results.reduce((s,r)=>s+r.toolSelectionScore,0)/runA.results.length : null)}
                b={pct(runB.results.length ? runB.results.reduce((s,r)=>s+r.toolSelectionScore,0)/runB.results.length : null)}
                delta={deltas.avgToolScore}
                unit="%"
              />
              <MetricRow
                label="Hallucinations"
                a={String(runA.results.filter(r => r.hallucinated).length)}
                b={String(runB.results.filter(r => r.hallucinated).length)}
                delta={deltas.hallucinationCount}
                invert
              />
              <MetricRow
                label="Avg latency"
                a={runA.avgLatencyMs ? `${Math.round(runA.avgLatencyMs)}ms` : "—"}
                b={runB.avgLatencyMs ? `${Math.round(runB.avgLatencyMs)}ms` : "—"}
                delta={deltas.avgLatencyMs}
                invert
                unit="ms"
              />
              <MetricRow
                label="Est. cost"
                a={runA.estimatedCostUsd ? `$${runA.estimatedCostUsd.toFixed(3)}` : "—"}
                b={runB.estimatedCostUsd ? `$${runB.estimatedCostUsd.toFixed(3)}` : "—"}
                delta={deltas.estimatedCostUsd}
                invert
              />
            </tbody>
          </table>
        </div>
      </div>

      {/* Regressions — most important */}
      {regressions.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50">
          <div className="border-b border-red-200 px-5 py-3">
            <h2 className="text-sm font-semibold text-red-800">
              Regressions ({regressions.length}) — passed in A, failed in B
            </h2>
          </div>
          <ul className="divide-y divide-red-100 px-5">
            {regressions.map(c => (
              <li key={c.testCaseId} className="py-2.5">
                <div className="flex items-start gap-2">
                  <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${CATEGORY_COLORS[c.category] ?? "bg-gray-100 text-gray-600"}`}>
                    {c.category}
                  </span>
                  <p className="text-sm text-gray-800">{c.query}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Improvements */}
      {improvements.length > 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50">
          <div className="border-b border-green-200 px-5 py-3">
            <h2 className="text-sm font-semibold text-green-800">
              Improvements ({improvements.length}) — failed in A, passed in B
            </h2>
          </div>
          <ul className="divide-y divide-green-100 px-5">
            {improvements.map(c => (
              <li key={c.testCaseId} className="py-2.5">
                <div className="flex items-start gap-2">
                  <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${CATEGORY_COLORS[c.category] ?? "bg-gray-100 text-gray-600"}`}>
                    {c.category}
                  </span>
                  <p className="text-sm text-gray-800">{c.query}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Full per-case table */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-900">All test cases</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-2 text-xs font-medium text-gray-400">Query</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-400">Run A</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-400">Run B</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-400">Change</th>
              </tr>
            </thead>
            <tbody>
              {perCase.map(c => (
                <tr
                  key={c.testCaseId}
                  className={`border-b border-gray-100 ${c.isRegression ? "bg-red-50" : c.isImprovement ? "bg-green-50" : ""}`}
                >
                  <td className="px-5 py-2">
                    <p className="text-sm text-gray-800 line-clamp-1">{c.query}</p>
                    <span className={`text-[10px] rounded px-1 py-0.5 ${CATEGORY_COLORS[c.category] ?? "bg-gray-100 text-gray-600"}`}>
                      {c.category}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${c.passedA ? "bg-green-100 text-green-700" : c.passedA === false ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}`}>
                      {c.passedA == null ? "—" : c.passedA ? "PASS" : "FAIL"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${c.passedB ? "bg-green-100 text-green-700" : c.passedB === false ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}`}>
                      {c.passedB == null ? "—" : c.passedB ? "PASS" : "FAIL"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs font-medium">
                    {c.isRegression && <span className="text-red-600">↓ regression</span>}
                    {c.isImprovement && <span className="text-green-600">↑ improved</span>}
                    {!c.isRegression && !c.isImprovement && <span className="text-gray-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
