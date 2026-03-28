export type AppState = "setup" | "progress" | "chat";

export interface ProgressData {
  total: number;
  indexed: number;
  current_file?: string | null;
}

export interface StatusResponse {
  status: "indexing" | "ready" | "error" | "fetching_files";
  progress: ProgressData;
  error?: string | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SourceInfo {
  file_name: string;
  file_id: string;
  snippet: string;
}

export interface ChatResponse {
  answer: string;
  sources: SourceInfo[];
}
