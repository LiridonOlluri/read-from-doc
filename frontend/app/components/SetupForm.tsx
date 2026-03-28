"use client";

import { useState, FormEvent } from "react";
import styles from "./SetupForm.module.css";

interface Props {
  onSubmit: (serviceAccountJson: string, cohereApiKey: string) => Promise<void>;
}

export default function SetupForm({ onSubmit }: Props) {
  const [json, setJson] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const trimmedJson = json.trim();
    const trimmedKey = apiKey.trim();

    if (!trimmedJson) { setError("Please paste your service account JSON."); return; }
    if (!trimmedKey)  { setError("Please enter your Cohere API key."); return; }

    try {
      JSON.parse(trimmedJson);
    } catch (err) {
      setError(`Invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

    setLoading(true);
    try {
      await onSubmit(trimmedJson, trimmedKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.icon}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        </div>
        <h1 className={styles.title}>Drive RAG Chat</h1>
        <p className={styles.subtitle}>
          Connect your Google Drive and ask questions about your documents using Cohere AI.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className="error-box">{error}</div>}

          <div className={styles.field}>
            <label className="field-label" htmlFor="svc-json">
              Google Service Account JSON
            </label>
            <textarea
              id="svc-json"
              className="textarea"
              value={json}
              onChange={(e) => setJson(e.target.value)}
              placeholder={'{\n  "type": "service_account",\n  "project_id": "...",\n  ...\n}'}
              rows={7}
            />
            <p className="field-hint">
              Paste the full JSON key file from Google Cloud Console.
              The service account must have read access to your Drive.
            </p>
          </div>

          <div className={styles.field}>
            <label className="field-label" htmlFor="cohere-key">
              Cohere API Key
            </label>
            <input
              id="cohere-key"
              type="password"
              className="input"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              autoComplete="off"
            />
            <p className="field-hint">
              Get your key from <strong>dashboard.cohere.com</strong>
            </p>
          </div>

          <button
            type="submit"
            className="btn btn-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className={styles.btnSpinner} />
                Connecting…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
                Connect &amp; Index Drive
              </>
            )}
          </button>
        </form>

        <div className={styles.howto}>
          <p className={styles.howtoTitle}>How it works</p>
          <ol className={styles.howtoList}>
            <li>Your Drive files are read and split into chunks</li>
            <li>Cohere embeds each chunk into a vector</li>
            <li>Your question is matched to relevant chunks</li>
            <li>Cohere reranks and generates a grounded answer</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
