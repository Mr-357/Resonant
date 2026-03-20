import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { serverAPI } from '../api/client'
import './ServerList.css'

export default function ServerList({ currentUser }) {
  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(false)
  const [showDiscovery, setShowDiscovery] = useState(false)
  const [allServers, setAllServers] = useState([])
  const [discoveryLoading, setDiscoveryLoading] = useState(false)
  const { serverId } = useParams()
  const navigate = useNavigate()

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

  const handleCreateServer = async () => {
    const name = prompt('Server name:')
    if (!name) return

    try {
      const response = await serverAPI.create(name)
      setServers([...servers, response.data])
      navigate(`/dashboard/${response.data.id}`)
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
      navigate(`/dashboard/${targetServerId}`)
    } catch (err) {
      alert('Failed to join server: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleLeaveServer = async (id) => {
    if (!window.confirm('Are you sure you want to leave this server?')) return
    try {
      await serverAPI.leave(id)
      setServers(prev => prev.filter(s => s.id !== id))
      navigate('/')
    } catch (err) {
      console.error('Failed to leave server:', err)
      alert('Failed to leave server: ' + (err.response?.data?.error || err.message))
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

  // Determine the active server object
  const activeServer = servers.find(s => String(s.id) === serverId)

  const handleSelectServer = (id) => {
    navigate(`/dashboard/${id}`)
  }

  return (
    <div className="server-list">
      <button className="server-button add-server" onClick={handleCreateServer} title="Add Server" disabled={loading}>
        +
      </button>
      <button className="server-button explore-server" onClick={handleOpenDiscovery} title="Explore Servers">
        🧭
      </button>
      {servers.map(server => (
        <button
          key={server.id}
          className={`server-button ${serverId === String(server.id) ? 'active' : ''}`}
          onClick={() => handleSelectServer(server.id)}
          title={server.name}
        >
          {server.name.charAt(0).toUpperCase()}
        </button>
      ))}

      {activeServer && (
        <div className="server-list-footer" style={{ marginTop: 'auto', padding: '15px 5px', textAlign: 'center', borderTop: '2px solid #202225', width: '100%' }}>
          <div className="active-server-name" style={{ color: 'white', fontWeight: 'bold', fontSize: '12px', marginBottom: '8px', wordBreak: 'break-word' }}>
            {activeServer.name}
          </div>
          {effectiveUser && activeServer.owner && String(activeServer.owner.id) !== String(effectiveUser.id) && (
            <button
              className="leave-server-btn"
              onClick={() => handleLeaveServer(activeServer.id)}
              style={{ backgroundColor: '#ed4245', color: 'white', border: 'none', borderRadius: '3px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}
              title="Leave Server"
            >
              Leave
            </button>
          )}
        </div>
      )}

      {showDiscovery && (
        <div className="modal-backdrop" onClick={() => setShowDiscovery(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', 
          alignItems: 'center', zIndex: 1000
        }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{
            backgroundColor: '#36393f', padding: '20px', borderRadius: '5px', 
            width: '400px', maxHeight: '80vh', overflowY: 'auto', color: 'white', border: '1px solid #202225'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid #2f3136' }}>
              <h3 style={{ margin: 0 }}>Discover Servers</h3>
              <button onClick={refreshDiscoveryList} disabled={discoveryLoading} style={{ padding: '5px 10px', cursor: 'pointer', backgroundColor: '#5865F2', color: 'white', border: 'none', borderRadius: '3px' }}>
                {discoveryLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            <div className="server-discovery-list" style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {allServers
                .filter(server => !servers.some(s => String(s.id) === String(server.id)))
                .map(server => (
                <div key={server.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#2f3136', borderRadius: '4px' }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <div style={{ fontWeight: 'bold' }}>{server.name}</div>
                    <div style={{ fontSize: '0.8em', color: '#b9bbbe' }}>{server.description || 'No description'}</div>
                  </div>
                  <button onClick={() => handleJoinServer(server.id)} style={{
                    backgroundColor: '#5865F2', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '3px', cursor: 'pointer', marginLeft: '10px'
                  }}>Join</button>
                </div>
              ))}
            </div>
            <button onClick={() => setShowDiscovery(false)} style={{ marginTop: '20px', width: '100%', padding: '10px', cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
