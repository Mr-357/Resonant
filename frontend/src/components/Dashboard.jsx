import React, { useState } from 'react'
import ServerList from './ServerList'
import ChannelList from './ChannelList'
import MessageThread from './MessageThread'
import './Dashboard.css'

export default function Dashboard({ currentUser, onLogout }) {
  const [selectedServer, setSelectedServer] = useState(null)
  const [selectedChannel, setSelectedChannel] = useState(null)

  const handleServerSelect = (server) => {
    setSelectedServer(server)
    setSelectedChannel(null)
  }

  const handleChannelSelect = (channel) => {
    setSelectedChannel(channel)
  }
  
  return (
    <div className="dashboard">
      {/* Column 1: Server List */}
      <div className="sidebar">
        <ServerList 
          currentUser={currentUser} 
          activeServerId={selectedServer?.id}
          onServerSelect={handleServerSelect}
        />
      </div>
      
      {/* Column 2: Channels & User Panel */}
      <div className="sidebar-secondary">
        <div className="channels-panel">
          <ChannelList 
            serverId={selectedServer?.id}
            activeChannelId={selectedChannel?.id}
            onChannelSelect={handleChannelSelect}
            currentUser={currentUser}
          />
        </div>
        <div className="user-panel">
          <div className="user-info">
            <span>{currentUser?.username}</span>
            <span style={{ marginLeft: 'auto', fontWeight: 'bold', color: 'var(--accent-primary)' }}>Resonant</span>
          </div>
        </div>
      </div>
      
      {/* Column 3: Top Bar & Messages */}
      <div className="main-content">
        <div className="top-bar">
          <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
             {selectedServer ? (
                <>
                  {selectedServer.name}
                  {selectedChannel && (
                    <>
                      <span style={{ margin: '0 4px', color: 'var(--text-subtle)' }}>&gt;</span>
                      <span style={{ color: 'var(--text-subtle)' }}>#</span>
                      {selectedChannel.name}
                    </>
                  )}
                </>
             ) : 'Resonant'}
          </div>
          <button onClick={onLogout} style={{ background: 'var(--status-danger)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>Logout</button>
        </div>

        <div className="messages-panel">
            <MessageThread 
              serverId={selectedServer?.id} 
              channel={selectedChannel} 
              currentUser={currentUser} 
            />
        </div>
      </div>
    </div>
  )
}
