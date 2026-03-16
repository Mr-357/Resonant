import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import './ServerList.css'

export default function ServerList({ currentUser }) {
  const [servers, setServers] = useState([])
  const { serverId } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    fetchServers()
  }, [])

  const fetchServers = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/servers', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setServers(response.data)
    } catch (err) {
      console.error('Failed to fetch servers:', err)
    }
  }

  const handleCreateServer = async () => {
    const name = prompt('Server name:')
    if (!name) return

    try {
      const token = localStorage.getItem('token')
      const response = await axios.post('/api/servers', { name }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setServers([...servers, response.data])
    } catch (err) {
      console.error('Failed to create server:', err)
    }
  }

  const handleSelectServer = (id) => {
    navigate(`/dashboard/${id}`)
  }

  return (
    <div className="server-list">
      <button className="server-button add-server" onClick={handleCreateServer} title="Add Server">
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
