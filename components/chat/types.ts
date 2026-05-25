export interface Evidence {
  content: string;
  source: string;
  similarity?: number;
}

export interface ToolCallSummary {
  name: string;
  args: Record<string, unknown>;
  resultSummary?: string;
}

export interface ResponseMeta {
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  steps: number;
}

export interface AssistantResponse {
  answer: string;
  evidence: Evidence[];
  confidence: "high" | "medium" | "low";
  files_used: string[];
  tools_called: ToolCallSummary[];
  risk_level: "none" | "low" | "medium" | "high";
  missing_information: string | null;
  suggested_next_step: string | null;
  _meta: ResponseMeta;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: AssistantResponse;
  error?: string;
}
