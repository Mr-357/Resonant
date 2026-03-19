import React, { useState, useEffect, useRef, useCallback } from 'react'
import { usePolling } from '../hooks/usePolling'
import { messageAPI, channelAPI, serverAPI } from '../api/client'
import './MessageThread.css'

export default function MessageThread({ serverId, channelId, currentUser }) {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [channelName, setChannelName] = useState('')
  const [serverName, setServerName] = useState('')
  const [isLoadingChannelInfo, setIsLoadingChannelInfo] = useState(false)
  const messagesEndRef = useRef(null)

  // Fetch channel and server names
  useEffect(() => {
    const fetchChannelAndServerInfo = async () => {
      if (!serverId || !channelId) {
        setChannelName('')
        setServerName('')
        setMessages([]) // Clear messages when no channel selected
        setIsLoadingChannelInfo(false)
        return
      }
      // Clear messages when switching channels
      setMessages([])
      setIsLoadingChannelInfo(true) // Show loading state
      
      try {
        // Fetch channel info
        const channelResponse = await channelAPI.get(serverId, channelId)
        const chName = channelResponse.data.name || 'Unknown'
        setChannelName(chName)
        console.log('Channel fetched:', chName)

        // Fetch server info
        const serverResponse = await serverAPI.get(serverId)
        const sName = serverResponse.data.name || 'Unknown'
        setServerName(sName)
        console.log('Server fetched:', sName)
        setIsLoadingChannelInfo(false)
      } catch (err) {
        console.error('Failed to fetch channel/server info:', err)
        setChannelName('Error')
        setServerName('Error')
        setIsLoadingChannelInfo(false)
      }
    }
    fetchChannelAndServerInfo()
  }, [serverId, channelId])

  // Callback for polling to update messages
  const handleMessagesUpdate = useCallback((newMessages) => {
    setMessages(prev => {
      // Merge new messages, avoiding duplicates
      const existingIds = new Set(prev.map(m => m.id))
      const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m.id))
      return [...prev, ...uniqueNewMessages].sort((a, b) => 
        new Date(a.createdAt) - new Date(b.createdAt)
      )
    })
  }, [])

  // Use polling hook for real-time messages
  usePolling(channelId, handleMessagesUpdate, 2000)

  // Auto scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const formatMessageTime = (createdAt) => {
    const date = new Date(createdAt)
    const today = new Date()
    const isToday = date.toDateString() === today.toDateString()
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleString([], { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !channelId) return
    
    setLoading(true)
    setError('')
    
    try {
      const response = await messageAPI.create(channelId, inputValue)
      // Add current user info to the message if not present
      const message = response.data
      if (!message.author && currentUser) {
        message.author = currentUser.username
      }
      setMessages([...messages, message])
      setInputValue('')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send message')
      console.error('Error sending message:', err)
    } finally {
      setLoading(false)
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
        <h2>
          {!serverId || !channelId ? (
            'Select a channel'
          ) : isLoadingChannelInfo ? (
            'Loading channel...'
          ) : serverName === 'Error' ? (
            'Error loading channel'
          ) : (
            `${serverName} > #${channelName}`
          )}
        </h2>
      </div>
      <div className="messages">
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet. Start a conversation!</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={`${msg.id}-${idx}`} className="message">
              <div className="message-header-info">
                <strong>{msg.author || 'Unknown'}</strong>
                <span className="message-time">
                  {formatMessageTime(msg.createdAt)}
                </span>
              </div>
              <p>{msg.content}</p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="message-input">
        {error && <div className="error-message">{error}</div>}
        <div className="input-wrapper">
          <input
            type="text"
            placeholder="Type a message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={loading}
          />
          <button onClick={handleSendMessage} disabled={loading || !inputValue.trim()}>
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
