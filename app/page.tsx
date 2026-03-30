'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import styles from './page.module.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
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
      content: input
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: input }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      };
      setMessages(prev => [...prev, errorMessage]);
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
    setLoading(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 onClick={handleRefresh} style={{ cursor: 'pointer' }}>RAG</h1>
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
            <h2>Provide Knowledge Base</h2>
            <p>
              Upload a PDF document to initialize the AI's semantic knowledge base before starting the chat.
            </p>
            
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
                  <svg className={styles.dropzoneIcon} width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
                      <p style={{ margin: 0, fontWeight: 500, color: '#2d2d2d' }}>Click or drag PDF to upload</p>
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
                    Processing & Embedding...
                  </>
                ) : 'Initialize Context'}
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
                <h2>How can I help you today?</h2>
                <p>Knowledge base successfully initialized. Ask me anything about the uploaded document!</p>
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
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className={`${styles.message} ${styles.assistant}`}>
                <div className={styles.avatar}>AI</div>
                <div className={styles.messageContent}>
                  <p className={styles.typing}>Thinking</p>
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
                  placeholder="Message RAG Chatbot..."
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
