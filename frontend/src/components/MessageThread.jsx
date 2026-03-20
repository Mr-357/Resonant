import React, { useState, useEffect, useRef, useCallback } from 'react'
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
  const socketRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)

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
      
      // Load initial history via REST
      try {
        const history = await messageAPI.list(channelId, { limit: 50 });
        setMessages(history.data.reverse()); // Assuming API returns newest first, or adjust sort below
      } catch (e) { setMessages([]) }
      
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
  
  // WebSocket Connection
  useEffect(() => {
    if (!channelId) return;

    // Dynamic WebSocket URL based on API configuration
    const getSocketUrl = () => {
      const apiUrl = window.__API_URL__ || import.meta.env.VITE_API_URL || 'http://localhost:8080';
      const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
      const host = apiUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
      return `${wsProtocol}://${host}/chat/${channelId}`;
    };

    const wsUrl = getSocketUrl();
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to chat socket');
      setIsConnected(true);
      setError('');
    };

    ws.onerror = (e) => {
      console.error('WebSocket error:', e);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.error) {
          setError(message.error);
          return;
        }
        setMessages(prev => {
          // Avoid duplicates if backend echoes back history or similar
          if (prev.find(m => m.id === message.id)) return prev;
          return [...prev, message].sort((a, b) => 
             new Date(a.createdAt) - new Date(b.createdAt)
          );
        });
      } catch (e) {
        console.error("Invalid WS message", e);
      }
    };

    ws.onclose = () => {
      console.log('Disconnected from chat socket');
      setIsConnected(false);
    };

    return () => {
      ws.close();
      setIsConnected(false);
    };
  }, [channelId]);

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
      // Send via WebSocket for real-time performance
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        const payload = {
          content: inputValue,
          token: localStorage.getItem('token') // Pass token for auth
        };
        socketRef.current.send(JSON.stringify(payload));
        setInputValue(''); // Clear input immediately
      } else {
        setError('Connection lost. Reconnecting...');
      }
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
          <button onClick={handleSendMessage} disabled={loading || !inputValue.trim() || !isConnected}>
            {loading ? 'Sending...' : isConnected ? 'Send' : 'Connecting...'}
          </button>
        </div>
      </div>
    </div>
  )
}
