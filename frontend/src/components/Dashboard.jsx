import React, { useState } from 'react'
import ServerList from './ServerList'
import ChannelList from './ChannelList'
import MessageThread from './MessageThread'
import './Dashboard.css'

export default function Dashboard({ currentUser, onLogout }) {
  const [selectedServerId, setSelectedServerId] = useState(null)
  const [selectedChannel, setSelectedChannel] = useState(null)

  const handleServerSelect = (serverId) => {
    setSelectedServerId(serverId)
    setSelectedChannel(null)
  }

  const handleChannelSelect = (channel) => {
    setSelectedChannel(channel)
  }
  
  return (
    <div className="dashboard">
      <button 
        onClick={onLogout} 
        className="logout-btn"
        style={{
          position: 'fixed',
          top: '15px',
          right: '20px',
          zIndex: 1000,
        }}
      >
        Logout
      </button>
      <div className="sidebar">
        <ServerList 
          currentUser={currentUser} 
          activeServerId={selectedServerId}
          onServerSelect={handleServerSelect}
        />
      </div>
      <div className="main-content">
        <div className="channels-panel">
          <ChannelList 
            serverId={selectedServerId}
            activeChannelId={selectedChannel?.id}
            onChannelSelect={handleChannelSelect}
          />
        </div>
        <div className="messages-panel">
          <MessageThread 
            serverId={selectedServerId} 
            channel={selectedChannel} 
            currentUser={currentUser} 
          />
        </div>
      </div>
      <div className="user-panel">
        <div className="user-info">
          <span>{currentUser?.username}</span>
          <span style={{ marginLeft: 'auto', fontWeight: 'bold', color: '#5865F2' }}>Resonant</span>
        </div>
      </div>
    </div>
  )
}
