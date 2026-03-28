import type { StatusResponse, ChatMessage, ChatResponse } from "../types";

const BASE = "/api";

export async function initSession(
  serviceAccountJson: string,
  cohereApiKey: string
): Promise<{ session_id: string; status: string }> {
  const resp = await fetch(`${BASE}/session/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_account_json: serviceAccountJson,
      cohere_api_key: cohereApiKey,
    }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? `HTTP ${resp.status}`);
  }
  return resp.json();
}

export async function getStatus(sessionId: string): Promise<StatusResponse> {
  const resp = await fetch(`${BASE}/session/${sessionId}/status`);
  if (!resp.ok) {
    if (resp.status === 404) throw new Error("SESSION_NOT_FOUND");
    throw new Error(`HTTP ${resp.status}`);
  }
  return resp.json();
}

export async function sendChat(
  sessionId: string,
  message: string,
  history: ChatMessage[]
): Promise<ChatResponse> {
  const resp = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, message, history }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? `HTTP ${resp.status}`);
  }
  return resp.json();
}

export async function deleteSession(sessionId: string): Promise<void> {
  await fetch(`${BASE}/session/${sessionId}`, { method: "DELETE" }).catch(() => {});
}
