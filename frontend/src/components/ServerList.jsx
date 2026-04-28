import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { serverAPI } from '../axios/client'
import './ServerList.css'
import Modal from './Modal'

const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(String(uuid))
}

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
  const [settingsBannedMembers, setSettingsBannedMembers] = useState([])
  const [loadingBannedMembers, setLoadingBannedMembers] = useState(false)
  const [banDuration, setBanDuration] = useState(1) // Default 1 minute ban

  const [error, setError] = useState(null)
  // State for custom confirmation modals
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showKickBanConfirm, setShowKickBanConfirm] = useState(null) // { type: 'kick' | 'ban', memberId: UUID, duration?: number }

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
      const newServer = response.data
      setServers([...servers, newServer])
      onServerSelect(newServer)
      setShowCreateModal(false)
      setNewServerName('')
    } catch (err) {
      console.error('Failed to create server:', err)
      setError('Failed to create server')
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
    // Validate server ID is a valid UUID
    if (!isValidUUID(targetServerId)) {
      setError('Invalid server ID format. Please try again.')
      return
    }

    try {
      await serverAPI.join(targetServerId)
      const response = await serverAPI.list()
      setServers(response.data)
      const joinedServer = response.data.find(s => String(s.id) === String(targetServerId))
      onServerSelect(joinedServer || { id: targetServerId })
      setShowDiscovery(false)
    } catch (err) {
      setError('Failed to join server: ' + (err.response?.data?.error || err.message))
    }
  }

  const confirmLeaveServer = async () => {
    if (!serverToLeave) return
    // Validate server ID before API call
    if (!isValidUUID(serverToLeave.id)) {
      setError('Invalid server ID format')
      setServerToLeave(null)
      return
    }

    try {
      await serverAPI.leave(serverToLeave.id)
      setServers(prev => prev.filter(s => s.id !== serverToLeave.id))
      onServerSelect(null)
    } catch (err) {
      console.error('Failed to leave server:', err)
      setError('Failed to leave server: ' + (err.response?.data?.error || err.message))
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
    // Validate server ID before using it in API calls
    if (!isValidUUID(server.id)) {
      setError('Invalid server ID format')
      return
    }
    if (isOwner(server)) {
      setSettingsServer(server)
      setSettingsName(server.name)
      setSettingsMembers([])
      setLoadingMembers(true)
      setLoadingBannedMembers(true)
      setSettingsModalOpen(true)
      serverAPI.getMembers(server.id)
        .then(res => setSettingsMembers(res.data || []))
        .catch(console.error)
        .finally(() => setLoadingMembers(false))
      fetchBannedMembers(server.id)
        .then(res => setSettingsBannedMembers(res))
        .catch(console.error)
        .finally(() => setLoadingBannedMembers(false))
    
    }
  }
  
  const fetchBannedMembers = async (serverId) => { // Renamed from fetchBannedMembers to getBannedMembers for clarity
    // Validate server ID before API call
    if (!isValidUUID(serverId)) {
      console.error("Invalid server ID format")
      return []
    }
    return serverAPI.getBannedMembers(serverId).then(res => res.data || []).catch(err => { console.error("Failed to fetch banned members", err); return [] })
  }
  
  const handleUpdateServer = async (e) => {
    e.preventDefault()
    if (!settingsName.trim() || !settingsServer) return
    // Validate server ID before API call
    if (!isValidUUID(settingsServer.id)) {
      setError('Invalid server ID format')
      return
    }
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
      setError("Failed to update server")
    }
  }

  const handleDeleteServer = () => {
    setShowDeleteConfirm(true)
  }

  const confirmDeleteServer = async () => {
    if (!settingsServer) return
    // Validate server ID before API call
    if (!isValidUUID(settingsServer.id)) {
      setError('Invalid server ID format')
      setShowDeleteConfirm(false)
      return
    }
    try {
      await serverAPI.delete(settingsServer.id)
      setServers(prev => prev.filter(s => s.id !== settingsServer.id))
      if (activeServerId === settingsServer.id) onServerSelect(null)
      setSettingsModalOpen(false)
      setShowDeleteConfirm(false)
    } catch (err) {
      console.error("Delete failed", err)
      setError("Failed to delete server")
    }
  }

  const handleKickMember = (memberId) => {
    setShowKickBanConfirm({ type: 'kick', memberId: memberId })
  }

  const handleBanMember = (memberId, duration) => {
    setShowKickBanConfirm({ type: 'ban', memberId: memberId, duration: duration })
  }

  const confirmKickBan = async () => {
    if (!showKickBanConfirm) return
    const { type, memberId, duration } = showKickBanConfirm
    // Validate server and member IDs before API calls
    if (!isValidUUID(settingsServer.id) || !isValidUUID(memberId)) {
      setError('Invalid server or member ID format')
      setShowKickBanConfirm(null)
      return
    }

    try {
      if (type === 'kick') {
        await serverAPI.removeMember(settingsServer.id, memberId) // This now triggers a 1-minute ban on the backend
        setSettingsMembers(prev => prev.filter(m => m.id !== memberId))
      } else if (type === 'ban') {
        await serverAPI.banMember(settingsServer.id, memberId, duration)
        // Remove from active members list if they were there
        setSettingsMembers(prev => prev.filter(m => m.id !== memberId))
      }
      const updatedBans = await fetchBannedMembers(settingsServer.id)
      setSettingsBannedMembers(updatedBans)
      setShowKickBanConfirm(null)
    } catch (err) {
      console.error(`${type} member failed`, err)
      setError(`Failed to ${type} member: ` + (err.response?.data?.error || err.message))
    }
  }

  const handleUnbanMember = (memberId) => {
    setShowKickBanConfirm({ type: 'unban', memberId: memberId })
  }

  const confirmUnban = async () => {
    if (!showKickBanConfirm || showKickBanConfirm.type !== 'unban') return
    const { memberId } = showKickBanConfirm
    // Validate server and member IDs before API calls
    if (!isValidUUID(settingsServer.id) || !isValidUUID(memberId)) {
      setError('Invalid server or member ID format')
      setShowKickBanConfirm(null)
      return
    }

    try {
      await serverAPI.unbanMember(settingsServer.id, memberId) // This now triggers a 1-minute ban on the backend
      const updatedBans = await fetchBannedMembers(settingsServer.id)
      setSettingsBannedMembers(updatedBans)
      // No need to refresh settingsMembers as unbanning doesn't automatically add them back
      setShowKickBanConfirm(null)
    } catch (err) {
      console.error("Unban member failed", err)
      setError("Failed to unban member: " + (err.response?.data?.error || err.message))
    }
  }

  return (
    <div className="server-list" style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <div className="servers-scroller" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '12px', gap: '12px' }}>
        <button className="server-button add-server" onClick={() => setShowCreateModal(true)} title="Add Server" disabled={loading}>
          🪄
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
      </div>

      {activeServer && (
        <div 
          className="server-list-footer" 
          style={{ 
            marginTop: 'auto', 
            height: '52px', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center', 
            borderTop: '1px solid var(--border-tertiary)', 
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <div className="active-server-name" style={{ color: 'white', fontWeight: 'bold', fontSize: '11px', wordBreak: 'break-word', textAlign: 'center', padding: '0 4px' }}>
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
        }}
        role="button"
        tabIndex="0"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setShowDiscovery(false);
        }}
        aria-label="Close discovery"
        >
          <div 
            className="modal-content" 
            onClick={e => e.stopPropagation()} 
            onKeyDown={e => e.stopPropagation()}
            role="none"
            style={{
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
          <label htmlFor="new-server-name" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em', color: 'var(--text-muted)' }}>SERVER NAME</label>
          <input 
            id="new-server-name"
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
          <span style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em', color: 'var(--text-muted)', fontWeight: 'bold' }}>MEMBERS</span>
          <div aria-label="members" style={{ maxHeight: '200px', overflowY: 'auto', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', padding: '5px' }}>
            {loadingMembers ? <div style={{ padding: '10px', color: 'var(--text-subtle)' }}>Loading members...</div> : 
              settingsMembers.map(member => (
                <div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderBottom: '1px solid var(--border-tertiary)' }}>
                  <span style={{ flexGrow: 1 }}>{member.username}</span>
                  {String(member.id) !== String(effectiveUser?.id) && (
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <input
                        type="number"
                        min="0"
                        value={banDuration}
                        onChange={(e) => setBanDuration(parseInt(e.target.value))}
                        style={{ width: '50px', padding: '4px', borderRadius: '3px', border: 'none', backgroundColor: 'var(--bg-tertiary)', color: 'white', fontSize: '0.8em' }}
                        title="Ban duration in minutes (0 for permanent)"
                      />
                      <button onClick={() => handleBanMember(member.id, banDuration)} style={{ backgroundColor: 'var(--status-danger)', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '3px', cursor: 'pointer', fontSize: '0.8em' }}>Ban</button> {/* Changed to call handleBanMember */}
                      <button onClick={() => handleKickMember(member.id)} style={{ backgroundColor: 'var(--status-warning)', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '3px', cursor: 'pointer', fontSize: '0.8em' }}>Kick</button> {/* Changed to call handleKickMember */}
                    </div>
                  )}
                </div>
              ))
            }
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <span style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em', color: 'var(--text-muted)', fontWeight: 'bold' }}>BANNED USERS</span>
          <div aria-label="banned-users" style={{ maxHeight: '200px', overflowY: 'auto', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', padding: '5px' }}>
            {loadingBannedMembers ? <div style={{ padding: '10px', color: 'var(--text-subtle)' }}>Loading banned users...</div> :
              settingsBannedMembers.length === 0 ? (
                <div style={{ padding: '10px', color: 'var(--text-subtle)' }}>No users currently banned.</div>
              ) : (
                settingsBannedMembers.map(bannedUser => (
                  <div key={bannedUser.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderBottom: '1px solid var(--border-tertiary)' }}>
                    <span style={{ flexGrow: 1 }}>
                      {bannedUser.username}
                      <span style={{ fontSize: '0.8em', color: 'var(--text-subtle)', marginLeft: '10px' }}>
                        {bannedUser.bannedUntil?.startsWith('9999-12-31') ? ' (Permanent)' : ` (Until: ${new Date(bannedUser.bannedUntil).toLocaleString()})`}
                      </span>
                    </span>
                    <button onClick={() => handleUnbanMember(bannedUser.userId)} style={{ backgroundColor: 'var(--accent-primary)', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '3px', cursor: 'pointer', fontSize: '0.8em' }}>Unban</button> {/* Changed to call handleUnbanMember */}
                  </div>
                ))
              )
            }
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-secondary)', paddingTop: '15px' }}>
          <span style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em', color: 'var(--status-danger)', fontWeight: 'bold' }}>DANGER ZONE</span>
          <button type="button" onClick={handleDeleteServer} style={{ width: '100%', padding: '10px', borderRadius: '3px', border: 'none', cursor: 'pointer', backgroundColor: 'var(--status-danger)', color: 'white', fontWeight: 'bold' }}>Delete Server</button>
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

      {/* Confirmation Modal for Delete Server */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Confirm Server Deletion"
      >
        <p>Are you sure you want to delete <strong>{settingsServer?.name}</strong>? This action cannot be undone.</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          <button onClick={() => setShowDeleteConfirm(false)} style={{ padding: '8px 16px', borderRadius: '3px', border: 'none', cursor: 'pointer' }}>Cancel</button>
          <button onClick={confirmDeleteServer} style={{ padding: '8px 16px', borderRadius: '3px', border: 'none', cursor: 'pointer', backgroundColor: 'var(--status-danger)', color: 'white' }}>Delete Server</button>
        </div>
      </Modal>

      {/* Confirmation Modal for Kick/Ban/Unban */}
      <Modal
        isOpen={!!showKickBanConfirm}
        onClose={() => setShowKickBanConfirm(null)}
        title={
          showKickBanConfirm?.type === 'kick' ? 'Confirm Kick' :
          showKickBanConfirm?.type === 'ban' ? `Confirm Ban (${showKickBanConfirm.duration === 0 ? 'Permanent' : showKickBanConfirm.duration + ' min'})` :
          showKickBanConfirm?.type === 'unban' ? 'Confirm Unban' : ''
        }
      >
        <p>
          {showKickBanConfirm?.type === 'kick' && `Are you sure you want to kick this member? This will apply a 1-minute ban.`}
          {showKickBanConfirm?.type === 'ban' && `Are you sure you want to ban this member for ${showKickBanConfirm.duration === 0 ? 'permanently' : showKickBanConfirm.duration + ' minutes'}?`}
          {showKickBanConfirm?.type === 'unban' && `Are you sure you want to unban this member?`}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          <button onClick={() => setShowKickBanConfirm(null)} style={{ padding: '8px 16px', borderRadius: '3px', border: 'none', cursor: 'pointer' }}>Cancel</button>
          <button onClick={showKickBanConfirm?.type === 'unban' ? confirmUnban : confirmKickBan} style={{ padding: '8px 16px', borderRadius: '3px', border: 'none', cursor: 'pointer', backgroundColor: 'var(--status-danger)', color: 'white' }}>Confirm</button>
        </div>
      </Modal>

      <Modal isOpen={!!error} onClose={() => setError(null)} title="Error">
        <p>{error}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button onClick={() => setError(null)} style={{ padding: '8px 16px', borderRadius: '3px', border: 'none', cursor: 'pointer', backgroundColor: 'var(--accent-primary)', color: 'white' }}>
            OK
          </button>
        </div>
      </Modal>
    </div>
  )
}

ServerList.propTypes = {
  currentUser: PropTypes.object,
  activeServerId: PropTypes.string,
  onServerSelect: PropTypes.func.isRequired
}
