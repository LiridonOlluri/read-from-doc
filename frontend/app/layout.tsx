import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Drive RAG Chat",
  description: "Chat with your Google Drive documents using Cohere RAG",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
