"use client";
import { useState } from "react";
import type { CaseResult } from "./types";
import { pct, scoreColor, CATEGORY_COLORS, DIFFICULTY_COLORS } from "./types";

function ScoreCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-[10px] text-gray-400">{label}</p>
      <p className={`text-xs font-medium ${scoreColor(value)}`}>{pct(value)}</p>
    </div>
  );
}

export function ResultRow({ result }: { result: CaseResult }) {
  const [expanded, setExpanded] = useState(false);
  const tc = result.testCase;

  return (
    <>
      <tr
        className={`cursor-pointer border-b border-gray-100 hover:bg-gray-50 transition-colors ${
          result.passed ? "" : "bg-red-50/40"
        }`}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Pass/fail */}
        <td className="py-2 pl-4 pr-2">
          <span
            className={`inline-flex h-5 w-12 items-center justify-center rounded text-[11px] font-semibold ${
              result.passed
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {result.passed ? "PASS" : "FAIL"}
          </span>
        </td>

        {/* Query */}
        <td className="py-2 pr-4">
          <p className="text-sm text-gray-900 line-clamp-1">{tc.query}</p>
          <div className="mt-0.5 flex gap-1">
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${CATEGORY_COLORS[tc.category] ?? "bg-gray-100 text-gray-600"}`}
            >
              {tc.category}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${DIFFICULTY_COLORS[tc.difficulty] ?? "bg-gray-100"}`}
            >
              {tc.difficulty}
            </span>
            {result.hallucinated && (
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                hallucination
              </span>
            )}
          </div>
        </td>

        {/* Scores */}
        <td className="py-2 pr-6 text-right">
          <div className="flex justify-end gap-4">
            <ScoreCell label="answer" value={result.answerScore} />
            <ScoreCell label="evidence" value={result.evidenceScore} />
            <ScoreCell label="precision" value={result.retrievalPrecision} />
            <ScoreCell label="tools" value={result.toolSelectionScore} />
          </div>
        </td>

        {/* Latency */}
        <td className="py-2 pr-4 text-right text-xs text-gray-500">
          {result.latencyMs}ms
        </td>

        {/* Expand indicator */}
        <td className="py-2 pr-4 text-gray-400">
          <span className="text-[10px]">{expanded ? "▲" : "▼"}</span>
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-gray-100 bg-gray-50">
          <td colSpan={5} className="px-6 py-3">
            <div className="grid gap-3 text-xs sm:grid-cols-2">
              {result.finalAnswer && (
                <div>
                  <p className="mb-1 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Model answer</p>
                  <p className="text-gray-700 leading-relaxed">{result.finalAnswer}</p>
                </div>
              )}
              {tc.expectedAnswer && (
                <div>
                  <p className="mb-1 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Expected answer</p>
                  <p className="text-gray-600 leading-relaxed">{tc.expectedAnswer}</p>
                </div>
              )}
              {result.failureReason && (
                <div className="sm:col-span-2">
                  <p className="mb-1 font-semibold text-red-500 uppercase tracking-wide text-[10px]">Failure reason</p>
                  <p className="text-red-700">{result.failureReason}</p>
                </div>
              )}
              {tc.expectedFiles && tc.expectedFiles.length > 0 && (
                <div>
                  <p className="mb-1 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Expected files</p>
                  <div className="flex flex-wrap gap-1">
                    {tc.expectedFiles.map(f => (
                      <span key={f} className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-gray-700">{f}</span>
                    ))}
                  </div>
                </div>
              )}
              {tc.expectedTools && tc.expectedTools.length > 0 && (
                <div>
                  <p className="mb-1 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Expected tools</p>
                  <div className="flex flex-wrap gap-1">
                    {tc.expectedTools.map(t => (
                      <span key={t} className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-blue-800">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
