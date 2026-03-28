"use client";

import styles from "./ProgressView.module.css";

interface Props {
  status: "indexing" | "ready" | "error" | "fetching_files";
  total: number;
  indexed: number;
  currentFile?: string | null;
  error?: string | null;
  onReset: () => void;
}

export default function ProgressView({ status, total, indexed, currentFile, error, onReset }: Props) {
  if (status === "error") {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.errorIcon}>✕</div>
          <h2 className={styles.title}>Indexing Failed</h2>
          <p className={styles.subtitle}>Something went wrong while connecting to your Drive.</p>
          <div className="error-box" style={{ marginBottom: 24, textAlign: "left" }}>
            {error ?? "Unknown error"}
          </div>
          <button className="btn btn-full" onClick={onReset}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const pct = total > 0 ? Math.round((indexed / total) * 100) : 0;
  const isFetching = status === "fetching_files";

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.spinnerWrap}>
          <span className="spinner" />
        </div>

        <h2 className={styles.title}>
          {isFetching ? "Scanning Google Drive…" : "Indexing your documents…"}
        </h2>
        <p className={styles.subtitle}>
          {isFetching
            ? "Listing all files and folders. This may take a moment."
            : "Embedding content with Cohere and storing in vector database."}
        </p>

        <div className="progress-track" style={{ marginBottom: 10 }}>
          <div
            className="progress-fill"
            style={{ width: isFetching ? "8%" : `${Math.max(pct, 3)}%` }}
          />
        </div>

        <div className={styles.stats}>
          <span>
            {isFetching ? "Scanning…" : `${indexed} / ${total} files`}
          </span>
          <span>{isFetching ? "" : `${pct}%`}</span>
        </div>

        {currentFile && (
          <div className={styles.currentFile} title={currentFile}>
            📄 {currentFile}
          </div>
        )}

        <div className={styles.steps}>
          <StepItem done={!isFetching} active={isFetching} label="Listing Drive files" />
          <StepItem done={status === "ready"} active={status === "indexing"} label="Embedding & indexing chunks" />
          <StepItem done={false} active={false} label="Ready to chat" />
        </div>
      </div>
    </div>
  );
}

function StepItem({ done, active, label }: { done: boolean; active: boolean; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.83rem" }}>
      <span style={{
        width: 20, height: 20,
        borderRadius: "50%",
        background: done
          ? "var(--accent)"
          : active
          ? "rgba(124,106,247,0.2)"
          : "var(--surface2)",
        border: active ? "2px solid var(--accent)" : "2px solid transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "0.7rem", color: done ? "#fff" : "var(--accent)",
        flexShrink: 0,
        transition: "all 0.3s",
      }}>
        {done ? "✓" : active ? <span className="typing-dots" style={{ padding: 0, gap: 2 }}><span style={{ width: 4, height: 4 }}/><span style={{ width: 4, height: 4 }}/><span style={{ width: 4, height: 4 }}/></span> : ""}
      </span>
      <span style={{ color: done || active ? "var(--text)" : "var(--text-muted)" }}>{label}</span>
    </div>
  );
}
