import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { serverAPI } from '../api/client'
import './ServerList.css'

export default function ServerList({ currentUser }) {
  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(false)
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

  const handleSelectServer = (id) => {
    navigate(`/dashboard/${id}`)
  }

  return (
    <div className="server-list">
      <button className="server-button add-server" onClick={handleCreateServer} title="Add Server" disabled={loading}>
        +
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
    </div>
  )
}
