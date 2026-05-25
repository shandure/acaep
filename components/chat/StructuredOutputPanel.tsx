"use client";
import { useState } from "react";
import type { AssistantResponse } from "./types";
import { ToolCallBadge } from "./ToolCallBadge";

const CONFIDENCE_STYLES: Record<AssistantResponse["confidence"], string> = {
  high: "bg-green-100 text-green-800 border-green-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-red-100 text-red-800 border-red-200",
};

const RISK_STYLES: Record<AssistantResponse["risk_level"], string> = {
  none: "bg-gray-100 text-gray-600 border-gray-200",
  low: "bg-blue-100 text-blue-700 border-blue-200",
  medium: "bg-orange-100 text-orange-700 border-orange-200",
  high: "bg-red-100 text-red-800 border-red-200",
};

function SectionToggle({
  label,
  open,
  onToggle,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors"
    >
      <span className="text-[10px]">{open ? "▼" : "▶"}</span>
      <span>{label}</span>
    </button>
  );
}

export function StructuredOutputPanel({ response }: { response: AssistantResponse }) {
  const [showEvidence, setShowEvidence] = useState(false);
  const [showTools, setShowTools] = useState(false);

  return (
    <div className="space-y-3 text-sm">
      {/* Answer */}
      <p className="leading-relaxed text-gray-900">{response.answer}</p>

      {/* Badge row */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${CONFIDENCE_STYLES[response.confidence]}`}
        >
          confidence: {response.confidence}
        </span>
        <span
          className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${RISK_STYLES[response.risk_level]}`}
        >
          risk: {response.risk_level}
        </span>
        {response._meta && (
          <span className="inline-flex items-center rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-500">
            {response._meta.latencyMs.toLocaleString()}ms · {response._meta.totalTokens.toLocaleString()} tokens
          </span>
        )}
      </div>

      {/* Tool calls */}
      {response.tools_called.length > 0 && (
        <div>
          <SectionToggle
            label={`${response.tools_called.length} tool call${response.tools_called.length !== 1 ? "s" : ""}`}
            open={showTools}
            onToggle={() => setShowTools(t => !t)}
          />
          {showTools && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {response.tools_called.map((tool, i) => (
                <ToolCallBadge key={i} tool={tool} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Evidence */}
      {response.evidence.length > 0 && (
        <div>
          <SectionToggle
            label={`${response.evidence.length} evidence item${response.evidence.length !== 1 ? "s" : ""}`}
            open={showEvidence}
            onToggle={() => setShowEvidence(e => !e)}
          />
          {showEvidence && (
            <div className="mt-2 space-y-2">
              {response.evidence.map((item, i) => (
                <div key={i} className="rounded border border-gray-200 bg-gray-50 p-2.5 text-xs">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-gray-500">{item.source}</span>
                    {item.similarity !== undefined && (
                      <span className="shrink-0 text-gray-400">
                        {(item.similarity * 100).toFixed(0)}% match
                      </span>
                    )}
                  </div>
                  <p className="line-clamp-4 text-gray-700">{item.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Files used */}
      {response.files_used.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {response.files_used.map((file, i) => (
            <span
              key={i}
              className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-600"
            >
              {file}
            </span>
          ))}
        </div>
      )}

      {/* Missing information */}
      {response.missing_information && (
        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <span className="font-semibold">Missing: </span>
          {response.missing_information}
        </div>
      )}

      {/* Suggested next step */}
      {response.suggested_next_step && (
        <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
          <span className="font-semibold">Next: </span>
          {response.suggested_next_step}
        </div>
      )}
    </div>
  );
}
