import React, { useState, useEffect } from 'react'
import { serverAPI } from '../api/client'
import './ServerList.css'
import Modal from './Modal'

export default function ServerList({ currentUser, activeServerId, onServerSelect }) {
  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(false)
  const [showDiscovery, setShowDiscovery] = useState(false)
  const [allServers, setAllServers] = useState([])
  const [discoveryLoading, setDiscoveryLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newServerName, setNewServerName] = useState('')
  const [serverToLeave, setServerToLeave] = useState(null)
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [settingsServer, setSettingsServer] = useState(null)
  const [settingsName, setSettingsName] = useState('')
  const [settingsMembers, setSettingsMembers] = useState([])
  const [loadingMembers, setLoadingMembers] = useState(false)

  useEffect(() => {
    fetchServers()
  }, [])

  const fetchServers = async () => {
    try {
      setLoading(true)
      const response = await serverAPI.list()
      setServers(response.data)
    } catch (err) {
      console.error('Failed to fetch servers:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateServerSubmit = async (e) => {
    e.preventDefault()
    if (!newServerName.trim()) return

    try {
      const response = await serverAPI.create(newServerName)
      setServers([...servers, response.data])
      onServerSelect(response.data.id)
      setShowCreateModal(false)
      setNewServerName('')
    } catch (err) {
      console.error('Failed to create server:', err)
      alert('Failed to create server')
    }
  }

  const refreshDiscoveryList = async () => {
    setDiscoveryLoading(true)
    try {
      const response = await serverAPI.listAll()
      setAllServers(response.data)
    } catch (err) {
      console.error('Failed to fetch all servers:', err)
    } finally {
      setDiscoveryLoading(false)
    }
  }

  const handleOpenDiscovery = () => {
    refreshDiscoveryList()
    setShowDiscovery(true)
  }

  const handleJoinServer = async (targetServerId) => {
    try {
      await serverAPI.join(targetServerId)
      setShowDiscovery(false)
      await fetchServers() // Refresh the user's list
      onServerSelect(targetServerId)
    } catch (err) {
      alert('Failed to join server: ' + (err.response?.data?.error || err.message))
    }
  }

  const confirmLeaveServer = async () => {
    if (!serverToLeave) return

    try {
      await serverAPI.leave(serverToLeave.id)
      setServers(prev => prev.filter(s => s.id !== serverToLeave.id))
      onServerSelect(null)
    } catch (err) {
      console.error('Failed to leave server:', err)
      alert('Failed to leave server: ' + (err.response?.data?.error || err.message))
    } finally {
      setServerToLeave(null)
    }
  }

  // Helper to get current user safely, falling back to localStorage if prop is missing
  const getEffectiveUser = () => {
    if (currentUser) return currentUser
    try {
      const stored = localStorage.getItem('currentUser')
      return stored ? JSON.parse(stored) : null
    } catch (err) {
      return null
    }
  }
  const effectiveUser = getEffectiveUser()

  // Helper to check ownership robustly
  const isOwner = (server) => {
    const ownerId = server?.owner?.id || server?.ownerId
    const currentUserId = effectiveUser?.id || effectiveUser?.userId
    return currentUserId && ownerId && String(ownerId) === String(currentUserId)
  }

  // Determine the active server object
  const activeServer = servers.find(s => s.id === activeServerId)

  const handleSelectServer = (server) => {
    onServerSelect(server)
  }

  const handleServerContextMenu = (e, server) => {
    e.preventDefault()
    if (isOwner(server)) {
      setSettingsServer(server)
      setSettingsName(server.name)
      setSettingsMembers([])
      setLoadingMembers(true)
      setSettingsModalOpen(true)
      serverAPI.getMembers(server.id)
        .then(res => setSettingsMembers(res.data || []))
        .catch(console.error)
        .finally(() => setLoadingMembers(false))
    }
  }

  const handleUpdateServer = async (e) => {
    e.preventDefault()
    if (!settingsName.trim() || !settingsServer) return
    try {
      const res = await serverAPI.update(settingsServer.id, settingsName)
      setServers(prev => prev.map(s => s.id === settingsServer.id ? { ...s, name: res.data.name } : s))
      // Update parent state if the updated server is currently active
      if (activeServerId === settingsServer.id) {
        onServerSelect({ ...settingsServer, name: res.data.name })
      }
      setSettingsModalOpen(false)
    } catch (err) {
      console.error("Update failed", err)
      alert("Failed to update server")
    }
  }

  const handleDeleteServer = async () => {
    if (!settingsServer || !window.confirm(`Delete ${settingsServer.name}? This cannot be undone.`)) return
    try {
      await serverAPI.delete(settingsServer.id)
      setServers(prev => prev.filter(s => s.id !== settingsServer.id))
      if (activeServerId === settingsServer.id) onServerSelect(null)
      setSettingsModalOpen(false)
    } catch (err) {
      console.error("Delete failed", err)
      alert("Failed to delete server")
    }
  }

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm("Remove this member?")) return
    try {
      await serverAPI.removeMember(settingsServer.id, memberId)
      setSettingsMembers(prev => prev.filter(m => m.id !== memberId))
    } catch (err) {
      console.error("Remove member failed", err)
      alert("Failed to remove member")
    }
  }

  return (
    <div className="server-list" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
      <button className="server-button add-server" onClick={() => setShowCreateModal(true)} title="Add Server" disabled={loading}>
        ➕
      </button>
      <button className="server-button explore-server" onClick={handleOpenDiscovery} title="Explore Servers">
        🧭
      </button>
      {servers.map(server => (
        <button
          key={server.id}
          className={`server-button ${activeServerId === server.id ? 'active' : ''}`}
          onClick={() => handleSelectServer(server)}
          onContextMenu={(e) => handleServerContextMenu(e, server)}
          title={server.name}
        >
          {server.name.charAt(0).toUpperCase()}
        </button>
      ))}

      {activeServer && (
        <div className="server-list-footer" style={{ marginTop: 'auto', padding: '15px 5px', textAlign: 'center', borderTop: '2px solid var(--border-tertiary)', width: '100%' }}>
          <div className="active-server-name" style={{ color: 'white', fontWeight: 'bold', fontSize: '12px', marginBottom: '8px', wordBreak: 'break-word' }}>
            {activeServer.name}
          </div>
          {effectiveUser && !isOwner(activeServer) && (
            <button
              className="leave-server-btn"
              onClick={() => setServerToLeave(activeServer)}
              style={{  color: 'none', backgroundColor: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer' }}
              title="Leave Server"
            >
              ⏏️
            </button>
          )}
        </div>
      )}

      {showDiscovery && (
        <div className="modal-backdrop" onClick={() => setShowDiscovery(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'var(--bg-overlay)', display: 'flex', justifyContent: 'center', 
          alignItems: 'center', zIndex: 1000
        }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{
            backgroundColor: 'var(--bg-primary)', padding: '20px', borderRadius: '5px', 
            width: '400px', maxHeight: '80vh', overflowY: 'auto', color: 'white', border: '1px solid var(--border-tertiary)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid var(--border-secondary)' }}>
              <h3 style={{ margin: 0 }}>Discover Servers</h3>
              <button onClick={refreshDiscoveryList} disabled={discoveryLoading} style={{ padding: '5px 10px', cursor: 'pointer', backgroundColor: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '3px' }}>
                {discoveryLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            <div className="server-discovery-list" style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {allServers
                .filter(server => !servers.some(s => String(s.id) === String(server.id)))
                .map(server => (
                <div key={server.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <div style={{ fontWeight: 'bold' }}>{server.name}</div>
                    <div style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>{server.description || 'No description'}</div>
                  </div>
                  <button onClick={() => handleJoinServer(server.id)} style={{
                    backgroundColor: 'var(--accent-primary)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '3px', cursor: 'pointer', marginLeft: '10px'
                  }}>Join</button>
                </div>
              ))}
            </div>
            <button onClick={() => setShowDiscovery(false)} style={{ marginTop: '20px', width: '100%', padding: '10px', cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      )}

      <Modal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
        title="Create a Server"
      >
        <form onSubmit={handleCreateServerSubmit}>
          <input 
            type="text" 
            placeholder="Server name" 
            value={newServerName}
            onChange={(e) => setNewServerName(e.target.value)}
            style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '3px', border: 'none', backgroundColor: 'var(--bg-tertiary)', color: 'white' }}
            autoFocus
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: '8px 16px', borderRadius: '3px', border: 'none', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={!newServerName.trim()} style={{ padding: '8px 16px', borderRadius: '3px', border: 'none', cursor: 'pointer', backgroundColor: 'var(--accent-primary)', color: 'white' }}>Create</button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        title="Server Settings"
      >
        <form onSubmit={handleUpdateServer} style={{ marginBottom: '20px' }}>
          <label htmlFor="server-settings-name" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em', color: 'var(--text-muted)' }}>SERVER NAME</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              id="server-settings-name"
              type="text"
              value={settingsName}
              onChange={(e) => setSettingsName(e.target.value)}
              style={{ flex: 1, padding: '10px', borderRadius: '3px', border: 'none', backgroundColor: 'var(--bg-tertiary)', color: 'white' }}
            />
            <button type="submit" style={{ padding: '8px 16px', borderRadius: '3px', border: 'none', cursor: 'pointer', backgroundColor: 'var(--bg-tertiary)', color: 'white' }}>Update</button>
          </div>
        </form>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em', color: 'var(--text-muted)' }}>MEMBERS</label>
          <div style={{ maxHeight: '200px', overflowY: 'auto', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', padding: '5px' }}>
            {loadingMembers ? <div style={{ padding: '10px', color: 'var(--text-subtle)' }}>Loading members...</div> : 
              settingsMembers.map(member => (
                <div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderBottom: '1px solid var(--border-tertiary)' }}>
                  <span>{member.username}</span>
                  {String(member.id) !== String(effectiveUser?.id) && (
                    <button onClick={() => handleRemoveMember(member.id)} style={{ backgroundColor: 'var(--status-danger)', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '3px', cursor: 'pointer', fontSize: '0.8em' }}>Kick</button>
                  )}
                </div>
              ))
            }
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-secondary)', paddingTop: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em', color: 'var(--status-danger)' }}>DANGER ZONE</label>
          <button onClick={handleDeleteServer} style={{ width: '100%', padding: '10px', borderRadius: '3px', border: 'none', cursor: 'pointer', backgroundColor: 'var(--status-danger)', color: 'white', fontWeight: 'bold' }}>Delete Server</button>
        </div>
      </Modal>

      <Modal 
        isOpen={!!serverToLeave} 
        onClose={() => setServerToLeave(null)} 
        title="Leave Server"
      >
        <p>Are you sure you want to leave <strong>{serverToLeave?.name}</strong>?</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          <button onClick={() => setServerToLeave(null)} style={{ padding: '8px 16px', borderRadius: '3px', border: 'none', cursor: 'pointer' }}>Cancel</button>
          <button onClick={confirmLeaveServer} style={{ padding: '8px 16px', borderRadius: '3px', border: 'none', cursor: 'pointer', backgroundColor: 'var(--status-danger)', color: 'white' }}>Leave Server</button>
        </div>
      </Modal>
    </div>
  )
}
