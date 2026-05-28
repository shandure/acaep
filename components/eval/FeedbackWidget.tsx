"use client";
import { useState } from "react";
import type { HumanFeedback } from "./types";

interface Props {
  evalResultId: string;
  initial?: HumanFeedback | null;
}

export function FeedbackWidget({ evalResultId, initial }: Props) {
  const [feedback, setFeedback] = useState<HumanFeedback | null>(initial ?? null);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [showNotes, setShowNotes] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(rating: 0 | 1) {
    setSaving(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evalResultId, rating, notes: notes || undefined }),
      });
      if (res.ok) {
        const data = await res.json() as { rating: number; notes?: string };
        setFeedback({ rating: data.rating, notes: data.notes });
      }
    } finally {
      setSaving(false);
    }
  }

  const thumbClass = (active: boolean) =>
    `rounded px-2 py-1 text-sm transition-colors ${
      active
        ? "bg-gray-200 text-gray-900"
        : "text-gray-400 hover:text-gray-700"
    } disabled:opacity-40`;

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Feedback:</span>
        <button
          className={thumbClass(feedback?.rating === 1)}
          disabled={saving}
          onClick={() => { setShowNotes(true); submit(1); }}
          title="Thumbs up"
        >
          👍
        </button>
        <button
          className={thumbClass(feedback?.rating === 0)}
          disabled={saving}
          onClick={() => { setShowNotes(true); submit(0); }}
          title="Thumbs down"
        >
          👎
        </button>
        {feedback && (
          <span className="text-xs text-gray-400">
            {feedback.rating === 1 ? "Marked helpful" : "Marked unhelpful"}
          </span>
        )}
        {!showNotes && (
          <button
            className="text-xs text-gray-400 hover:text-gray-700 underline"
            onClick={() => setShowNotes(true)}
          >
            add note
          </button>
        )}
      </div>

      {showNotes && (
        <div className="flex gap-2">
          <input
            className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs text-gray-800 focus:border-blue-400 focus:outline-none"
            placeholder="Optional note…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && feedback !== null) submit(feedback.rating as 0 | 1);
            }}
          />
          {feedback !== null && (
            <button
              className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200 disabled:opacity-40"
              disabled={saving}
              onClick={() => submit(feedback.rating as 0 | 1)}
            >
              Save
            </button>
          )}
        </div>
      )}
    </div>
  );
}
