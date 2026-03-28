"use client";

import styles from "./ChatMessage.module.css";
import type { SourceInfo } from "../types";

interface Props {
  role: "user" | "assistant";
  content: string;
  sources?: SourceInfo[];
  isTyping?: boolean;
}

export default function ChatMessage({ role, content, sources = [], isTyping = false }: Props) {
  return (
    <div className={`${styles.message} ${role === "user" ? styles.user : styles.assistant}`}>
      <div className={`${styles.avatar} ${role === "user" ? styles.avatarUser : styles.avatarBot}`}>
        {role === "user" ? "U" : "AI"}
      </div>

      <div className={`${styles.bubble} ${role === "user" ? styles.bubbleUser : styles.bubbleBot}`}>
        {isTyping ? (
          <div className="typing-dots">
            <span /><span /><span />
          </div>
        ) : (
          <>
            <div
              className={styles.content}
              dangerouslySetInnerHTML={{ __html: formatContent(content) }}
            />
            {sources.length > 0 && (
              <div className={styles.sources}>
                <p className={styles.sourcesLabel}>Sources</p>
                <div className={styles.chips}>
                  {sources.map((s, i) => (
                    <span key={i} className={styles.chip}>
                      📄 {truncate(s.file_name, 28)}
                      <span className={styles.tooltip}>{s.snippet}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function truncate(str: string, n: number) {
  return str.length > n ? str.slice(0, n) + "…" : str;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatContent(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, "<code>$1</code>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br />");
}
