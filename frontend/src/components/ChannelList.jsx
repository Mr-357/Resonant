import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { channelAPI, serverAPI } from '../api/client'
import './ChannelList.css'
import Modal from './Modal'

export default function ChannelList({ serverId, activeChannelId, onChannelSelect, currentUser }) {
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [serverOwnerId, setServerOwnerId] = useState(null)
  const [editChannel, setEditChannel] = useState(null)
  const [editChannelName, setEditChannelName] = useState('')

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
      // Check owner for permissions
      serverAPI.get(serverId)
        .then(res => setServerOwnerId(res.data.owner?.id || res.data.ownerId))
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

  const handleContextMenu = (e, channel) => {
    e.preventDefault()
    const user = currentUser || JSON.parse(localStorage.getItem('currentUser'))
    const currentUserId = user?.id || user?.userId
    if (currentUserId && serverOwnerId && String(currentUserId) === String(serverOwnerId)) {
      setEditChannel(channel)
      setEditChannelName(channel.name)
    }
  }

  const handleUpdateChannel = async (e) => {
    e.preventDefault()
    if (!editChannelName.trim() || !editChannel) return
    try {
      const res = await channelAPI.update(serverId, editChannel.id, editChannelName)
      setChannels(prev => prev.map(c => c.id === editChannel.id ? res.data : c))
      setEditChannel(null)
    } catch (err) {
      console.error("Update channel failed", err)
      alert("Failed to update channel")
    }
  }

  const handleDeleteChannel = async () => {
    if (!editChannel || !window.confirm(`Delete #${editChannel.name}?`)) return
    try {
      await channelAPI.delete(serverId, editChannel.id)
      setChannels(prev => prev.filter(c => c.id !== editChannel.id))
      if (activeChannelId === editChannel.id) onChannelSelect(null)
      setEditChannel(null)
    } catch (err) {
      console.error("Delete channel failed", err)
      alert("Failed to delete channel")
    }
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
              onContextMenu={(e) => handleContextMenu(e, channel)}
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
            style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '3px', border: 'none', backgroundColor: 'var(--border-tertiary)', color: 'white' }}
            autoFocus
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: '8px 16px', borderRadius: '3px', border: 'none', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={!newChannelName.trim()} style={{ padding: '8px 16px', borderRadius: '3px', border: 'none', cursor: 'pointer', backgroundColor: 'var(--accent-primary)', color: 'white' }}>Create</button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={!!editChannel} 
        onClose={() => setEditChannel(null)} 
        title="Channel Settings"
      >
        <form onSubmit={handleUpdateChannel}>
          <label htmlFor="channel-settings-name" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em', color: 'var(--text-muted)' }}>CHANNEL NAME</label>
          <input 
            id="channel-settings-name"
            type="text" 
            value={editChannelName}
            onChange={(e) => setEditChannelName(e.target.value)}
            style={{ width: '100%', padding: '10px', marginBottom: '20px', borderRadius: '3px', border: 'none', backgroundColor: 'var(--border-tertiary)', color: 'white' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
            <button type="button" onClick={handleDeleteChannel} style={{ padding: '8px 16px', borderRadius: '3px', border: 'none', cursor: 'pointer', backgroundColor: 'var(--status-danger)', color: 'white' }}>Delete Channel</button>
            <button type="submit" style={{ padding: '8px 16px', borderRadius: '3px', border: 'none', cursor: 'pointer', backgroundColor: 'var(--accent-primary)', color: 'white' }}>Save Changes</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

ChannelList.propTypes = {
  serverId: PropTypes.string,
  activeChannelId: PropTypes.string,
  onChannelSelect: PropTypes.func.isRequired,
  currentUser: PropTypes.object
}
