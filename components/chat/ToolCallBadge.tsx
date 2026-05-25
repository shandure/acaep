"use client";
import { useState } from "react";
import type { ToolCallSummary } from "./types";

const TOOL_COLORS: Record<string, string> = {
  searchCodebase: "bg-blue-100 text-blue-800 border-blue-200",
  readFile: "bg-purple-100 text-purple-800 border-purple-200",
  listFiles: "bg-gray-100 text-gray-700 border-gray-200",
  getFunctionDefinition: "bg-green-100 text-green-800 border-green-200",
  lookupGlossaryTerm: "bg-orange-100 text-orange-800 border-orange-200",
};

export function ToolCallBadge({ tool }: { tool: ToolCallSummary }) {
  const [expanded, setExpanded] = useState(false);
  const colorClass = TOOL_COLORS[tool.name] ?? "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <div className="text-xs">
      <button
        onClick={() => setExpanded(e => !e)}
        className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono font-medium transition-opacity hover:opacity-75 ${colorClass}`}
      >
        <span>{tool.name}()</span>
        <span className="text-[10px]">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="mt-1.5 rounded border border-gray-200 bg-gray-50 p-2.5">
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">args</p>
          <pre className="overflow-auto text-gray-700 text-[11px] leading-relaxed">
            {JSON.stringify(tool.args, null, 2)}
          </pre>
          {tool.resultSummary && (
            <>
              <p className="mb-0.5 mt-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">result</p>
              <p className="text-gray-700 text-[11px]">{tool.resultSummary}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
