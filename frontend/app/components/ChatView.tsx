"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import styles from "./ChatView.module.css";
import ChatMessage from "./ChatMessage";
import type { ChatMessage as ChatMsg, SourceInfo } from "../types";
import { sendChat } from "../lib/api";

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceInfo[];
  isTyping?: boolean;
}

interface Props {
  sessionId: string;
  indexedCount: number;
  onReset: () => void;
}

export default function ChatView({ sessionId, indexedCount, onReset }: Props) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [history, setHistory] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function autoResize() {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function handleSend() {
    const msg = input.trim();
    if (!msg || loading) return;

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg: DisplayMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: msg,
    };

    const typingId = crypto.randomUUID();
    const typingMsg: DisplayMessage = {
      id: typingId,
      role: "assistant",
      content: "",
      isTyping: true,
    };

    setMessages((prev) => [...prev, userMsg, typingMsg]);
    setLoading(true);

    const updatedHistory: ChatMsg[] = [...history, { role: "user", content: msg }];

    try {
      const resp = await sendChat(sessionId, msg, updatedHistory.slice(-20));

      setMessages((prev) =>
        prev.map((m) =>
          m.id === typingId
            ? { ...m, content: resp.answer, sources: resp.sources, isTyping: false }
            : m
        )
      );

      setHistory([...updatedHistory, { role: "assistant", content: resp.answer }]);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === typingId
            ? { ...m, content: `⚠️ ${errMsg}`, isTyping: false }
            : m
        )
      );
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerTitle}>Drive RAG Chat</div>
          <div className={styles.headerSub}>Powered by Cohere · Google Drive</div>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.badge}>{indexedCount} files indexed</span>
          <button className="btn btn-outline btn-sm" onClick={onReset}>
            New Session
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {messages.length === 0 ? (
          <div className={styles.welcome}>
            <div className={styles.welcomeIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <h3 className={styles.welcomeTitle}>Your documents are ready!</h3>
            <p className={styles.welcomeSub}>
              {indexedCount} files have been indexed. Ask me anything about your Google Drive.
            </p>
            <div className={styles.suggestions}>
              {[
                "Summarize the key points from my documents",
                "What topics are covered in my files?",
                "Find information about a specific subject",
              ].map((s, i) => (
                <button
                  key={i}
                  className={styles.suggestion}
                  onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <ChatMessage
              key={m.id}
              role={m.role}
              content={m.content}
              sources={m.sources}
              isTyping={m.isTyping}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={styles.inputArea}>
        <div className={styles.inputRow}>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={input}
            onChange={(e) => { setInput(e.target.value); autoResize(); }}
            onKeyDown={handleKey}
            placeholder="Ask a question about your documents…"
            rows={1}
            disabled={loading}
          />
          <button
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={!input.trim() || loading}
            aria-label="Send"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M22 2L11 13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <p className={styles.hint}>Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
