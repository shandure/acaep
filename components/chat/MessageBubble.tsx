import type { Message } from "./types";
import { StructuredOutputPanel } from "./StructuredOutputPanel";

export function MessageBubble({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl bg-blue-600 px-4 py-2.5 text-sm text-white">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        {message.error ? (
          <p className="text-sm text-red-600">{message.error}</p>
        ) : message.response ? (
          <StructuredOutputPanel response={message.response} />
        ) : (
          <p className="text-sm text-gray-400">No response received.</p>
        )}
      </div>
    </div>
  );
}
