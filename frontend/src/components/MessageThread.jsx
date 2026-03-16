import React, { useState, useEffect, useRef } from 'react'
import './MessageThread.css'

export default function MessageThread({ serverId, channelId }) {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (channelId) {
      // TODO: Implement message polling
    }
  }, [channelId])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !channelId) return
    
    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch(`/api/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: inputValue })
      })
      
      if (response.ok) {
        const newMessage = await response.json()
        setMessages([...messages, newMessage])
        setInputValue('')
      } else {
        console.error('Failed to send message:', response.status)
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  if (!channelId) {
    return (
      <div className="message-thread">
        <div className="no-channel">
          <p>Select a channel to start messaging</p>
        </div>
      </div>
    )
  }

  return (
    <div className="message-thread">
      <div className="message-header">
        <h2># general</h2>
      </div>
      <div className="messages">
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet. Start a conversation!</p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className="message">
              <strong>{msg.author}</strong>
              <p>{msg.content}</p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="message-input">
        <input
          type="text"
          placeholder="Type a message..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <button onClick={handleSendMessage}>Send</button>
      </div>
    </div>
  )
}
