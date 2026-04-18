'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import styles from './page.module.css';

interface Source {
  index: number;
  docTitle: string;
  page: number;
  score: number;
  preview: string;
  expandedToParent?: boolean;
}

interface Groundedness {
  grounded: boolean;
  confidence: number;
  issues: string[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  groundedness?: Groundedness;
  pipelineStages?: string[];
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Upload States
  const [isReady, setIsReady] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadStats, setUploadStats] = useState<any>(null);

  // Source panel
  const [expandedSources, setExpandedSources] = useState<number | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setUploadError('File exceeds 50MB limit');
      return;
    }

    if (file.type !== 'application/pdf') {
      setUploadError('Only PDF files are allowed');
      return;
    }

    setUploading(true);
    setUploadError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload PDF');
      }

      const data = await response.json();
      setUploadStats(data);
      setIsReady(true);
    } catch (error: any) {
      console.error('Upload Error:', error);
      setUploadError(error.message || 'An error occurred during upload');
    } finally {
      setUploading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      // Send conversation history for multi-turn context
      const history = messages.slice(-6).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentInput, history }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      // Handle SSE streaming
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response stream');

      let assistantContent = '';
      let sources: Source[] = [];
      let buffer = '';

      // Add empty assistant message that we'll update
      setMessages(prev => [...prev, { role: 'assistant', content: '', sources: [] }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);

            if (parsed.type === 'sources') {
              sources = parsed.sources;
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === 'assistant') {
                  last.sources = sources;
                }
                return [...updated];
              });
            } else if (parsed.type === 'pipeline') {
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === 'assistant') {
                  last.pipelineStages = parsed.stages;
                }
                return [...updated];
              });
            } else if (parsed.type === 'content') {
              assistantContent += parsed.content;
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === 'assistant') {
                  last.content = assistantContent;
                  last.sources = sources;
                }
                return [...updated];
              });
            } else if (parsed.type === 'groundedness') {
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === 'assistant') {
                  last.groundedness = parsed;
                }
                return [...updated];
              });
            }
          } catch {}
        }
      }

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleNewDocument = () => {
    setIsReady(false);
    setMessages([]);
    setInput('');
    setFile(null);
    setUploadError('');
    setUploadStats(null);
    setLoading(false);
    setExpandedSources(null);
  };

  const toggleSources = (msgIndex: number) => {
    setExpandedSources(expandedSources === msgIndex ? null : msgIndex);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 onClick={handleRefresh} style={{ cursor: 'pointer' }}>
            <span className={styles.headerIcon}>⚡</span> RAG
          </h1>
          <span className={styles.headerBadge}>Hybrid Search · Re-Ranking · Streaming</span>
          <span className={styles.headerCredit}>Made by Rahul Singh</span>
        </div>
        {isReady && (
          <button
            onClick={handleNewDocument}
            className={styles.newDocButton}
            title="Upload a new PDF document"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
            New Document
          </button>
        )}
      </div>

      {!isReady ? (
        <div className={styles.uploadContainer}>
          <div className={styles.uploadCard}>
            <div className={styles.uploadIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                <polyline points="13 2 13 9 20 9"></polyline>
              </svg>
            </div>
            <h2>Advanced RAG Pipeline</h2>
            <p>
              Upload a PDF to initialize. Uses <strong>hybrid search</strong> (dense + BM25),
              <strong> cross-encoder re-ranking</strong>, and <strong>MMR diversity</strong> for
              state-of-the-art retrieval accuracy.
            </p>

            <div className={styles.featureGrid}>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>🧠</span>
                <span>BGE Embeddings</span>
              </div>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>🔀</span>
                <span>Hybrid Search</span>
              </div>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>🎯</span>
                <span>Cross-Encoder</span>
              </div>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>📄</span>
                <span>Citations</span>
              </div>
            </div>

            <form onSubmit={handleUpload}>
              <div className={`${styles.dropzone} ${file ? styles.active : ''} ${uploading ? styles.disabled : ''}`}>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  disabled={uploading}
                  className={styles.fileInput}
                  title=""
                />
                <div className={styles.dropzoneContent}>
                  <svg className={styles.dropzoneIcon} width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    {file ? (
                      <>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                      </>
                    ) : (
                      <>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </>
                    )}
                  </svg>

                  {file ? (
                    <>
                      <p className={styles.fileName}>{file.name}</p>
                      <p className={styles.fileSize}>{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </>
                  ) : (
                    <>
                      <p style={{ margin: 0, fontWeight: 500, color: '#e0e0e0' }}>Click or drag PDF to upload</p>
                      <p className={styles.fileInstruction}>Maximum file size 50MB</p>
                    </>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={!file || uploading}
                className={styles.uploadButton}
              >
                {uploading ? (
                  <>
                    <svg className={styles.spinner} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="2" x2="12" y2="6"></line>
                      <line x1="12" y1="18" x2="12" y2="22"></line>
                      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                      <line x1="2" y1="12" x2="6" y2="12"></line>
                      <line x1="18" y1="12" x2="22" y2="12"></line>
                      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                      <line x1="16.24" y1="4.93" x2="19.07" y2="7.76"></line>
                    </svg>
                    Chunking · Embedding · Indexing...
                  </>
                ) : 'Initialize RAG Pipeline'}
              </button>
            </form>

            {uploadError && (
              <p className={styles.errorText}>
                {uploadError}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className={styles.chatbox}>
          <div className={styles.messages}>
            {messages.length === 0 && (
              <div className={styles.welcome}>
                <div className={styles.welcomeIcon}>⚡</div>
                <h2>Ready to Answer</h2>
                <p>
                  Knowledge base initialized with <strong>{uploadStats?.totalChunks || uploadStats?.chunksProcessed || '?'} chunks</strong>
                  {uploadStats?.searchChunks && <span> ({uploadStats.searchChunks} search + {uploadStats.contextChunks} context)</span>}
                  {uploadStats?.usedOCR && <span className={styles.ocrBadge}>OCR</span>}
                </p>
                <div className={styles.pipelineInfo}>
                  {['HyDE', 'Multi-Query', 'Dense+BM25', 'RRF', 'Re-Rank', 'Self-RAG', 'MMR', 'Parent↑'].map((stage, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {i > 0 && <div className={styles.pipelineArrow}>→</div>}
                      <div className={styles.pipelineStep}>
                        <span className={styles.stepNumber}>{i + 1}</span>
                        <span>{stage}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className={styles.welcomeSubtext}>Ask anything about the uploaded document.</p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`${styles.message} ${styles[msg.role]}`}>
                <div className={styles.avatar}>
                  {msg.role === 'user' ? 'U' : 'AI'}
                </div>
                <div className={styles.messageContent}>
                  {msg.role === 'user' ? (
                    <p>{msg.content}</p>
                  ) : (
                    <>
                      <ReactMarkdown
                        components={{
                          code: ({ node, inline, className, children, ...props }: any) => {
                            return inline ? (
                              <code className={styles.inlineCode} {...props}>
                                {children}
                              </code>
                            ) : (
                              <pre className={styles.codeBlock}>
                                <code {...props}>{children}</code>
                              </pre>
                            );
                          },
                          p: ({ children }) => <p className={styles.paragraph}>{children}</p>,
                          ul: ({ children }) => <ul className={styles.list}>{children}</ul>,
                          ol: ({ children }) => <ol className={styles.orderedList}>{children}</ol>,
                          li: ({ children }) => <li className={styles.listItem}>{children}</li>,
                          h1: ({ children }) => <h1 className={styles.heading1}>{children}</h1>,
                          h2: ({ children }) => <h2 className={styles.heading2}>{children}</h2>,
                          h3: ({ children }) => <h3 className={styles.heading3}>{children}</h3>,
                          strong: ({ children }) => <strong className={styles.bold}>{children}</strong>,
                          em: ({ children }) => <em className={styles.italic}>{children}</em>,
                          a: ({ href, children }) => (
                            <a href={href} className={styles.link} target="_blank" rel="noopener noreferrer">
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>

                      {/* Source citations */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className={styles.sourcesContainer}>
                          {/* Groundedness badge */}
                          {msg.groundedness && (
                            <div className={`${styles.groundednessBadge} ${msg.groundedness.grounded ? styles.grounded : styles.ungrounded}`}>
                              <span>{msg.groundedness.grounded ? '✓' : '⚠'}</span>
                              <span>{msg.groundedness.grounded ? 'Grounded' : 'Partially grounded'}</span>
                              <span className={styles.confidenceScore}>
                                {(msg.groundedness.confidence * 100).toFixed(0)}%
                              </span>
                              {msg.groundedness.issues.length > 0 && (
                                <span className={styles.groundednessIssues}>
                                  {msg.groundedness.issues.length} issue{msg.groundedness.issues.length > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          )}

                          <button
                            className={styles.sourcesToggle}
                            onClick={() => toggleSources(idx)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                              <polyline points="14 2 14 8 20 8"></polyline>
                            </svg>
                            {msg.sources.length} sources
                            <svg
                              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                              style={{ transform: expandedSources === idx ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
                            >
                              <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                          </button>

                          {expandedSources === idx && (
                            <div className={styles.sourcesList}>
                              {msg.sources.map((source, si) => (
                                <div key={si} className={styles.sourceCard}>
                                  <div className={styles.sourceHeader}>
                                    <span className={styles.sourceIndex}>[{source.index}]</span>
                                    <span className={styles.sourceTitle}>{source.docTitle}</span>
                                    <span className={styles.sourcePage}>p.{source.page}</span>
                                    {source.expandedToParent && (
                                      <span className={styles.parentBadge}>↑ parent</span>
                                    )}
                                    <span className={styles.sourceScore}>
                                      {(source.score * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                  <p className={styles.sourcePreview}>{source.preview}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}

            {loading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className={`${styles.message} ${styles.assistant}`}>
                <div className={styles.avatar}>AI</div>
                <div className={styles.messageContent}>
                  <p className={styles.typing}>Searching & ranking</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className={styles.inputContainer}>
            <form onSubmit={sendMessage} className={styles.inputForm}>
              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about your document..."
                  className={styles.input}
                  disabled={loading}
                />
              </div>
              <button type="submit" className={styles.button} disabled={loading || !input.trim()}>
                ↑
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
