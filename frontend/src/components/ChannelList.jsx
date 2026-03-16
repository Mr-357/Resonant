import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import './ChannelList.css'

export default function ChannelList() {
  const [channels, setChannels] = useState([])
  const { serverId, channelId } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    if (serverId) {
      fetchChannels()
    }
  }, [serverId])

  const fetchChannels = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`/api/servers/${serverId}/channels`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setChannels(response.data)
    } catch (err) {
      console.error('Failed to fetch channels:', err)
    }
  }

  const handleCreateChannel = async () => {
    const name = prompt('Channel name:')
    if (!name) return

    try {
      const token = localStorage.getItem('token')
      const response = await axios.post(`/api/servers/${serverId}/channels`, { name }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setChannels([...channels, response.data])
    } catch (err) {
      console.error('Failed to create channel:', err)
      alert('Failed to create channel')
    }
  }

  const handleSelectChannel = (id) => {
    navigate(`/dashboard/${serverId}/${id}`)
  }

  if (!serverId) {
    return (
      <div className="channel-list">
        <div className="channels-header">
          <h3>Channels</h3>
        </div>
        <div className="channels">
          <p className="no-channels">Select a server first</p>
        </div>
      </div>
    )
  }

  return (
    <div className="channel-list">
      <div className="channels-header">
        <h3>Channels</h3>
        <button className="add-channel-btn" onClick={handleCreateChannel} title="Add Channel">+</button>
      </div>
      <div className="channels">
        {channels.length === 0 ? (
          <p className="no-channels">No channels yet</p>
        ) : (
          channels.map(channel => (
            <button
              key={channel.id}
              className={`channel-item ${channelId === String(channel.id) ? 'active' : ''}`}
              onClick={() => handleSelectChannel(channel.id)}
            >
              # {channel.name}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
