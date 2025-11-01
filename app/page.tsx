'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import styles from './page.module.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ title: string; preview: string }>;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 onClick={handleRefresh} style={{ cursor: 'pointer' }}>RAG</h1>
        </div>
      </div>

      <div className={styles.chatbox}>
        <div className={styles.messages}>
          {messages.length === 0 && (
            <div className={styles.welcome}>
              <h2>How can I help you today?</h2>
              <p>Ask me anything about the knowledge base and I'll provide answers based on the available information.</p>
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
    </div>
  );
}
