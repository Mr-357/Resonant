import React from 'react'
import { useParams } from 'react-router-dom'
import ServerList from './ServerList'
import ChannelList from './ChannelList'
import MessageThread from './MessageThread'
import './Dashboard.css'

export default function Dashboard({ currentUser, onLogout }) {
  const { serverId, channelId } = useParams()
  
  return (
    <div className="dashboard">
      <div className="sidebar">
        <ServerList currentUser={currentUser} />
      </div>
      <div className="main-content">
        <div className="channels-panel">
          <ChannelList />
        </div>
        <div className="messages-panel">
          <MessageThread serverId={serverId} channelId={channelId} currentUser={currentUser} />
        </div>
      </div>
      <div className="user-panel">
        <div className="user-info">
          <span>{currentUser?.username}</span>
          <button onClick={onLogout} className="logout-btn">Logout</button>
        </div>
      </div>
    </div>
  )
}
