import { useState, useRef, useEffect } from 'react'
import { Send, Image as ImageIcon, Loader2, CheckCircle, XCircle } from 'lucide-react'
import './App.css'

function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = { role: 'user', content: input, type: 'text' }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: input,
          session_id: sessionId,
        }),
      })

      const data = await response.json()
      
      if (!sessionId) {
        setSessionId(data.session_id)
      }

      const assistantMessage = {
        role: 'assistant',
        content: data.response,
        type: 'text',
        status: data.status
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage = {
        role: 'assistant',
        content: `Error: ${error.message}`,
        type: 'error'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    
    // Add user message showing image being uploaded
    const imageMessage = {
      role: 'user',
      content: file.name,
      type: 'image',
      imageUrl: URL.createObjectURL(file)
    }
    setMessages(prev => [...prev, imageMessage])

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/upload-photo', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      const resultMessage = {
        role: 'assistant',
        content: `Image uploaded successfully!\n\nClassification: ${data.classification}\nFilename: ${data.filename}\nSize: ${(data.size / 1024).toFixed(2)} KB\nType: ${data.content_type}`,
        type: 'upload-result',
        classification: data.classification,
        status: data.status
      }
      setMessages(prev => [...prev, resultMessage])
    } catch (error) {
      const errorMessage = {
        role: 'assistant',
        content: `Upload error: ${error.message}`,
        type: 'error'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setUploadingImage(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Agent Observability Platform</h1>
        <p>Driver's License Renewal Assistant</p>
      </header>

      <main className="chat-container">
        <div className="messages">
          {messages.length === 0 && (
            <div className="empty-state">
              <h2>Welcome! 👋</h2>
              <p>Ask me anything about driver's license renewal in Brazil, or upload a document photo.</p>
            </div>
          )}
          
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              <div className="message-content">
                {msg.type === 'image' ? (
                  <div className="image-preview">
                    <img src={msg.imageUrl} alt={msg.content} />
                    <span className="image-filename">{msg.content}</span>
                  </div>
                ) : (
                  <>
                    {msg.type === 'upload-result' && (
                      <div className="upload-badge">
                        {msg.status === 'success' ? (
                          <CheckCircle size={16} className="success-icon" />
                        ) : (
                          <XCircle size={16} className="error-icon" />
                        )}
                      </div>
                    )}
                    <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                  </>
                )}
              </div>
            </div>
          ))}
          
          {(loading || uploadingImage) && (
            <div className="message assistant">
              <div className="message-content loading">
                <Loader2 className="spinner" />
                <span>{uploadingImage ? 'Uploading image...' : 'Thinking...'}</span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <form className="input-form" onSubmit={sendMessage}>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
          
          <button
            type="button"
            className="icon-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage || loading}
            title="Upload image"
          >
            <ImageIcon size={20} />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={loading || uploadingImage}
            className="text-input"
          />

          <button
            type="submit"
            className="send-button"
            disabled={loading || uploadingImage || !input.trim()}
          >
            <Send size={20} />
          </button>
        </form>
      </main>
    </div>
  )
}

export default App
