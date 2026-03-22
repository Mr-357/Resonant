import React, { useState, useEffect } from 'react'
import { channelAPI } from '../api/client'
import './ChannelList.css'
import Modal from './Modal'

export default function ChannelList({ serverId, activeChannelId, onChannelSelect }) {
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')

  useEffect(() => {
    if (serverId) {
      fetchChannels()
    }
  }, [serverId])

  const fetchChannels = async () => {
    try {
      setLoading(true)
      const response = await channelAPI.list(serverId)
      setChannels(response.data)
    } catch (err) {
      console.error('Failed to fetch channels:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateChannelSubmit = async (e) => {
    e.preventDefault()
    if (!newChannelName.trim()) return

    try {
      const response = await channelAPI.create(serverId, newChannelName)
      setChannels([...channels, response.data])
      onChannelSelect(response.data)
      setShowCreateModal(false)
      setNewChannelName('')
    } catch (err) {
      console.error('Failed to create channel:', err)
      alert('Failed to create channel')
    }
  }

  const handleSelectChannel = (channel) => {
    onChannelSelect(channel)
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
        <button 
          className="add-channel-btn" 
          onClick={() => setShowCreateModal(true)} 
          title="Add Channel"
          disabled={loading}
        >
          +
        </button>
      </div>
      <div className="channels">
        {channels.length === 0 ? (
          <p className="no-channels">No channels yet</p>
        ) : (
          channels.map(channel => (
            <button
              key={channel.id}
              className={`channel-item ${activeChannelId === channel.id ? 'active' : ''}`}
              onClick={() => handleSelectChannel(channel)}
            >
              # {channel.name}
            </button>
          ))
        )}
      </div>

      <Modal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
        title="Create Channel"
      >
        <form onSubmit={handleCreateChannelSubmit}>
          <input 
            type="text" 
            placeholder="Channel name" 
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
            style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '3px', border: 'none', backgroundColor: '#202225', color: 'white' }}
            autoFocus
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: '8px 16px', borderRadius: '3px', border: 'none', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={!newChannelName.trim()} style={{ padding: '8px 16px', borderRadius: '3px', border: 'none', cursor: 'pointer', backgroundColor: '#5865F2', color: 'white' }}>Create</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
