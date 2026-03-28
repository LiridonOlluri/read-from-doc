"use client";

import { useState, useEffect, useRef } from "react";
import type { AppState, StatusResponse } from "./types";
import { initSession, getStatus, deleteSession } from "./lib/api";
import SetupForm from "./components/SetupForm";
import ProgressView from "./components/ProgressView";
import ChatView from "./components/ChatView";

const SESSION_KEY = "drive_rag_session_id";

export default function Home() {
  const [appState, setAppState] = useState<AppState>("setup");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<StatusResponse | null>(null);
  const [indexedCount, setIndexedCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Resume session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      setSessionId(stored);
      setAppState("progress");
    }
  }, []);

  // Poll when we have a sessionId and are in progress state
  useEffect(() => {
    if (appState === "progress" && sessionId) {
      startPolling(sessionId);
    }
    return () => stopPolling();
  }, [appState, sessionId]);

  function startPolling(sid: string) {
    stopPolling();
    const check = async () => {
      try {
        const data = await getStatus(sid);
        setStatusData(data);

        if (data.status === "ready") {
          stopPolling();
          setIndexedCount(data.progress.indexed);
          setAppState("chat");
        } else if (data.status === "error") {
          stopPolling();
          // Stay on progress view to show error
        }
      } catch (err) {
        if (err instanceof Error && err.message === "SESSION_NOT_FOUND") {
          stopPolling();
          handleReset();
        }
      }
    };

    check(); // immediate
    pollRef.current = setInterval(check, 2000);
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function handleSetup(serviceAccountJson: string, cohereApiKey: string) {
    const result = await initSession(serviceAccountJson, cohereApiKey);
    const sid = result.session_id;
    setSessionId(sid);
    localStorage.setItem(SESSION_KEY, sid);
    setAppState("progress");
  }

  async function handleReset() {
    stopPolling();
    if (sessionId) {
      await deleteSession(sessionId);
      localStorage.removeItem(SESSION_KEY);
    }
    setSessionId(null);
    setStatusData(null);
    setIndexedCount(0);
    setAppState("setup");
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  if (appState === "setup") {
    return <SetupForm onSubmit={handleSetup} />;
  }

  if (appState === "progress") {
    return (
      <ProgressView
        status={statusData?.status ?? "fetching_files"}
        total={statusData?.progress.total ?? 0}
        indexed={statusData?.progress.indexed ?? 0}
        currentFile={statusData?.progress.current_file}
        error={statusData?.error}
        onReset={handleReset}
      />
    );
  }

  return (
    <ChatView
      sessionId={sessionId!}
      indexedCount={indexedCount}
      onReset={handleReset}
    />
  );
}
