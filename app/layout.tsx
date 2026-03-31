import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RAG Chatbot — Hybrid Search + Re-Ranking',
  description: 'Advanced PDF chatbot with hybrid search (dense + BM25), cross-encoder re-ranking, MMR diversity, and streaming responses',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
