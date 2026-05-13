import { useEffect, useRef, useState } from 'react'

const API_BASE_URL = 'http://localhost:5000'
const SUGGESTIONS = [
  'What crop suits clay soil?',
  'How do I treat early blight?',
  'Best fertilizer for wheat?',
  'How to raise soil pH naturally?'
]

function mdToHtml(text) {
  if (!text) return ''
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>')
}

export default function ChatBot() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const containerRef = useRef(null)
  const textareaRef = useRef(null)
  const hasMessages = messages.length > 0

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages, loading])

  const clearChat = () => {
    setMessages([])
    setError(null)
  }

  const adjustTextareaHeight = () => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    const maxHeight = 4 * 24
    const newHeight = Math.min(ta.scrollHeight, maxHeight)
    ta.style.height = `${newHeight}px`
  }

  useEffect(() => adjustTextareaHeight(), [input])

  const sendMessage = async (evt, forcedText) => {
    if (evt) evt.preventDefault()
    const outgoingText = (forcedText ?? input).trim()
    if (!outgoingText) return

    setError(null)

    const userMsg = { role: 'user', content: outgoingText }
    setMessages(prev => [...prev, userMsg, { role: 'assistant', content: 'Thinking...', _thinking: true }])
    setInput('')
    setLoading(true)

    try {
      const current = [...messages, userMsg]
      const payload = {
        message: userMsg.content,
        history: current.map(m => ({ role: m.role, content: m.content })),
        context: {}
      }

      const res = await fetch(`${API_BASE_URL}/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`
        try {
          const errData = await res.json()
          if (errData?.detail) errMsg = errData.detail
        } catch {
          // Ignore JSON parse errors when backend doesn't return JSON body.
        }
        throw new Error(errMsg)
      }

      const data = await res.json()
      const assistantMsg = { role: 'assistant', content: data.reply }

      setMessages(prev => {
        // replace last thinking assistant message if present
        if (prev.length > 0 && prev[prev.length - 1]?._thinking) {
          return [...prev.slice(0, -1), assistantMsg]
        }
        return [...prev, assistantMsg]
      })
    } catch (err) {
      setError(err.message || 'Chat failed')
      setMessages(prev => prev.filter(m => !m._thinking))
    } finally {
      setLoading(false)
    }
  }

  const handleSuggestion = (text) => {
    setInput(text)
    sendMessage(null, text)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <style>{`@keyframes pulseDots { 0% { opacity: 0.25; } 50% { opacity: 1; } 100% { opacity: 0.25; } }`}</style>

      <header
        style={{
          height: hasMessages ? 56 : 0,
          opacity: hasMessages ? 1 : 0,
          transform: `translateY(${hasMessages ? '0' : '-8px'})`,
          transition: 'all 0.25s ease',
          overflow: 'hidden',
          background: 'var(--bg)',
          borderLeft: '3px solid var(--green)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: hasMessages ? '0 20px' : '0 20px',
          color: 'var(--text)'
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 14 }}>🌱 AI Agronomist</div>
        <button className="ghost-button-green" onClick={clearChat} style={{ padding: '6px 10px', fontSize: 12 }}>
          Clear Chat
        </button>
      </header>

      {hasMessages ? (
        <>
          <main style={{ flex: 1, overflow: 'hidden' }}>
            <div ref={containerRef} aria-live="polite" style={{ height: '100%', overflowY: 'auto' }}>
              <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px 140px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                {messages.map((m, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    {m.role === 'user' ? (
                      <div
                        style={{
                          maxWidth: '72%',
                          background: 'var(--green)',
                          color: '#fff',
                          borderRadius: '999px',
                          padding: '10px 14px',
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.45
                        }}
                      >
                        {m.content}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, maxWidth: '78%' }}>
                        <div
                          aria-hidden
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '999px',
                            background: 'var(--green)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14,
                            flexShrink: 0,
                            marginTop: 1
                          }}
                        >
                          🌱
                        </div>
                        {m._thinking ? (
                          <div style={{ color: 'var(--muted)', fontSize: 20, letterSpacing: 4, animation: 'pulseDots 1.1s ease-in-out infinite' }}>
                            ●●●
                          </div>
                        ) : (
                          <div
                            style={{ color: 'var(--text)', lineHeight: 1.6 }}
                            dangerouslySetInnerHTML={{ __html: mdToHtml(m.content) }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </main>

          <div
            style={{
              position: 'fixed',
              left: 258,
              right: 0,
              bottom: 0,
              padding: '14px 16px 18px',
              background: 'var(--bg)'
            }}
          >
            <div
              style={{
                maxWidth: 680,
                margin: '0 auto',
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                boxShadow: '0 10px 25px rgba(32,46,35,0.08)',
                padding: 8,
                display: 'flex',
                alignItems: 'flex-end',
                gap: 8
              }}
            >
              <textarea
                ref={textareaRef}
                placeholder="Ask about crops, soil health, diseases..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{
                  flex: 1,
                  resize: 'none',
                  border: 'none',
                  outline: 'none',
                  padding: '10px 12px',
                  background: 'transparent',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 15,
                  lineHeight: '24px',
                  minHeight: 24,
                  maxHeight: 96,
                  overflowY: 'auto'
                }}
              />
              <button
                onClick={sendMessage}
                disabled={loading}
                style={{
                  width: 36,
                  height: 36,
                  border: 'none',
                  borderRadius: 999,
                  background: 'var(--green)',
                  color: '#fff',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                aria-label="Send message"
              >
                →
              </button>
            </div>
            {error && (
              <div className="error-box" style={{ maxWidth: 680, margin: '8px auto 0' }}>
                <strong>Error:</strong> {error}
              </div>
            )}
          </div>
        </>
      ) : (
        <main style={{ flex: 1, display: 'grid', placeItems: 'center', padding: '24px' }}>
          <div style={{ width: '100%', maxWidth: 680, textAlign: 'center' }}>
            <h1 style={{ margin: 0, color: '#1e2d21', fontFamily: 'var(--font-display)', fontSize: 42 }}>🌱 AI Agronomist</h1>
            <p style={{ margin: '10px 0 24px', color: 'var(--muted)', fontSize: 16 }}>
              Ask anything about crops, soil, fertilizers, and plant health.
            </p>

            <div
              style={{
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                boxShadow: '0 10px 25px rgba(32,46,35,0.08)',
                padding: 8,
                display: 'flex',
                alignItems: 'flex-end',
                gap: 8
              }}
            >
              <textarea
                ref={textareaRef}
                placeholder="Ask about crops, soil health, diseases..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{
                  flex: 1,
                  resize: 'none',
                  border: 'none',
                  outline: 'none',
                  padding: '10px 12px',
                  background: 'transparent',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 15,
                  lineHeight: '24px',
                  minHeight: 24,
                  maxHeight: 96,
                  overflowY: 'auto'
                }}
              />
              <button
                onClick={sendMessage}
                disabled={loading}
                style={{
                  width: 36,
                  height: 36,
                  border: 'none',
                  borderRadius: 999,
                  background: 'var(--green)',
                  color: '#fff',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                aria-label="Send message"
              >
                →
              </button>
            </div>

            <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
              {SUGGESTIONS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleSuggestion(chip)}
                  style={{
                    border: '1px solid var(--border)',
                    background: 'var(--panel-alt)',
                    color: 'var(--text)',
                    borderRadius: 999,
                    padding: '8px 12px',
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>

            {error && (
              <div className="error-box" style={{ marginTop: 12 }}>
                <strong>Error:</strong> {error}
              </div>
            )}
          </div>
        </main>
      )}
    </div>
  )
}
