import React, { useState, useEffect, useRef } from 'react'
import EmojiPicker from 'emoji-picker-react'
import PropTypes from 'prop-types'
import { messageAPI, serverAPI } from '../api/client'
import Modal from './Modal'
import './MessageThread.css' // Assuming you have or will create this CSS

export default function MessageThread({ serverId, channel, currentUser }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState(null)
  const [serverOwnerId, setServerOwnerId] = useState(null)
  const [editContent, setEditContent] = useState('')
  const messagesEndRef = useRef(null)
  const [messageToDelete, setMessageToDelete] = useState(null)
  const socketRef = useRef(null)

  useEffect(() => {
    if (serverId && channel?.id) {
      fetchMessages()
      serverAPI.get(serverId)
        .then(res => setServerOwnerId(res.data.owner?.id || res.data.ownerId))
        .catch(err => console.error("Failed to load server info", err))
      setupWebSocket()
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.close()
      }
    }
  }, [serverId, channel?.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchMessages = async () => {
    try {
      const response = await messageAPI.list(channel.id)
      // Assuming API returns a list or page object. Adjust if needed.
      setMessages(Array.isArray(response.data) ? response.data : response.data.content || [])
    } catch (err) {
      console.error('Failed to fetch messages:', err)
    }
  }

  const updateMessageList = (message) => {
    setMessages(prev => {
      const index = prev.findIndex(m => m.id === message.id)
      if (index === -1) return [...prev, message]
      return prev.map((m, i) => (i === index ? message : m))
    })
  }

  const handleSocketMessage = (event) => {
    try {
      const message = JSON.parse(event.data)
      // For now, assume any message received is a new or updated chat message
      updateMessageList(message)
    } catch (e) {
      console.error('WS Error:', e)
    }
  }

  const setupWebSocket = () => {
    if (socketRef.current) {
      socketRef.current.close()
    }

    const baseUrl = window.__API_URL__ || window.location.origin.replace(/^http/, 'ws')
    const wsUrl = `${baseUrl.replace(/^http/, 'ws')}/chat/${channel.id}`
    
    try {
        const socket = new WebSocket(wsUrl)
        socket.onmessage = handleSocketMessage
        socketRef.current = socket
    } catch (e) {
        console.warn("WebSocket setup failed", e);
    }
  }
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim()) return

    try {
      const response = await messageAPI.create(channel.id, input)
      updateMessageList(response.data)
      setInput('')
      setShowEmojiPicker(false)
    } catch (err) {
      console.error('Failed to send message:', err)
    }
  }

  const confirmDelete = async () => {
    if (!messageToDelete) return
    try {
      await messageAPI.delete(channel.id, messageToDelete.id)
      setMessages(prev => prev.filter(m => m.id !== messageToDelete.id))
    } catch (err) {
      console.error('Failed to delete message:', err)
    } finally {
      setMessageToDelete(null)
    }
  }

  const startEdit = (message) => {
    setEditingMessageId(message.id)
    setEditContent(message.content)
    setShowEmojiPicker(false)
  }

  const cancelEdit = () => {
    setEditingMessageId(null)
    setEditContent('')
  }

  const saveEdit = async (messageId) => {
    if (!editContent.trim()) return
    try {
      const response = await messageAPI.update(channel.id, messageId, editContent)
      updateMessageList(response.data)
      setEditingMessageId(null)
      setEditContent('')
    } catch (err) {
      console.error('Failed to update message:', err)
      alert('Failed to update message')
    }
  }

  const onEmojiClick = (emojiData) => {
    setInput(prev => prev + emojiData.emoji)
    setShowEmojiPicker(false)
  }

  // Helper to check if current user is author
  const isAuthor = (message) => {
    if (!currentUser) return false
    return message.author?.id === currentUser.id || message.authorId === currentUser.id
  }

  // Helper to check if current user can delete (Author or Server Owner)
  const canDelete = (message) => {
    if (!currentUser) return false
    return isAuthor(message) || currentUser.id === serverOwnerId
  }

  // Helper to get display name
  const getAuthorName = (message) => {
    if (message.author) return message.author
    if (currentUser && message.authorId === currentUser.id) return currentUser.username
    return `User ${message.authorId || 'Unknown'}`
  }

  if (!channel?.id) {
    return <div className="message-thread empty">Select a channel</div>
  }

  return (
    <div className="message-thread">
      <div className="messages-list">
        {messages.map(message => (
          <div key={message.id} className="message-item">
            <div className="message-header">
              <span className="author-name">{getAuthorName(message)}</span>
              <span className="timestamp">{new Date(message.createdAt).toLocaleString()}</span>
              <div className="message-actions">
                {isAuthor(message) && <button onClick={() => startEdit(message)} title="Edit">✏️</button>}
                {canDelete(message) && <button onClick={() => setMessageToDelete(message)} title="Delete">🗑️</button>}
              </div>
            </div>
            
            {editingMessageId === message.id ? (
              <div className="edit-message-form">
                <input 
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  autoFocus
                />
                <button onClick={() => saveEdit(message.id)}>Save</button>
                <button onClick={cancelEdit} className="cancel">Cancel</button>
              </div>
            ) : (
              <div className="message-content">{message.content}</div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form className="message-input-area" onSubmit={handleSend}>
        <div className="input-wrapper">
          <button 
            type="button" 
            className="emoji-btn"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            😊
          </button>
          {showEmojiPicker && (
            <div className="emoji-picker-container">
              <EmojiPicker onEmojiClick={onEmojiClick} width={300} height={400} theme="dark" emojiStyle='native' lazyLoadEmojis	='true' />
            </div>
          )}
          <input
            type="text"
            placeholder={`Message # ${channel.name}`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            name='message-input'
            aria-label='message-input'
          />
        </div>
        <button type="submit" disabled={!input.trim()}>Send</button>
      </form>

      <Modal 
        isOpen={!!messageToDelete} 
        onClose={() => setMessageToDelete(null)} 
        title="Delete Message"
      >
        <p>Are you sure you want to delete this message?</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          <button onClick={() => setMessageToDelete(null)} style={{ padding: '8px 16px', borderRadius: '3px', border: 'none', cursor: 'pointer' }}>Cancel</button>
          <button onClick={confirmDelete} style={{ padding: '8px 16px', borderRadius: '3px', border: 'none', cursor: 'pointer', backgroundColor: 'var(--status-danger)', color: 'white' }}>Delete</button>
        </div>
      </Modal>
    </div>
  )
}

MessageThread.propTypes = {
  serverId: PropTypes.string,
  channel: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string
  }),
  currentUser: PropTypes.object
}
