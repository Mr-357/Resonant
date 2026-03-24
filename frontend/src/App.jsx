import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import AuthForm from './components/AuthForm'
import Dashboard from './components/Dashboard'
import Loading from './components/Loading'
import apiClient from './api/client'
import './App.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [backendError, setBackendError] = useState(null)

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('currentUser')
    if (token && user) {
      try {
        setIsAuthenticated(true)
        setCurrentUser(JSON.parse(user))
      } catch (err) {
        console.error('Failed to parse user from localStorage:', err)
        localStorage.removeItem('token')
        localStorage.removeItem('currentUser')
      }
    }
    
    let isMounted = true
    let retryTimeout
    let countdownInterval

    const checkBackend = async (delay = 1000) => {
      if (countdownInterval) clearInterval(countdownInterval)

      try {
        if (window.__API_URL__) {
          apiClient.defaults.baseURL = window.__API_URL__
        }
        await apiClient.get('/api/auth')

        if (isMounted) {
          setIsLoading(false)
          setBackendError(null)
        }
      } catch (err) {
        if (err.response && err.response.status !== 503) {
          if (isMounted) {
            setIsLoading(false)
            setBackendError(null)
          }
          return
        }

        if (isMounted) {
          let remaining = Math.ceil(delay / 1000)
          setBackendError(`Cannot connect to server. Retrying in ${remaining}s...`)

          countdownInterval = setInterval(() => {
            remaining -= 1
            if (remaining > 0) {
              if (isMounted) setBackendError(`Cannot connect to server. Retrying in ${remaining}s...`)
            } else {
              clearInterval(countdownInterval)
            }
          }, 1000)

          const nextDelay = Math.min(delay * 1.5, 30000)
          retryTimeout = setTimeout(() => checkBackend(nextDelay), delay)
        }
      }
    }

    checkBackend()
    
    return () => {
      isMounted = false
      if (retryTimeout) clearTimeout(retryTimeout)
      if (countdownInterval) clearInterval(countdownInterval)
    }
  }, [])

  const handleLogin = (token, user) => {
    localStorage.setItem('token', token)
    localStorage.setItem('currentUser', JSON.stringify(user))
    setCurrentUser(user)
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    setCurrentUser(null)
    setIsAuthenticated(false)
  }

  if (isLoading) {
    return (
      <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Loading />
        {backendError && (
          <div style={{ position: 'absolute', bottom: '20%', width: '100%', textAlign: 'center', color: '#ff6b6b', fontWeight: 'bold' }}>
            {backendError}
          </div>
        )}
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        {isAuthenticated ? (
          <>
            <Route path="/" element={<Dashboard currentUser={currentUser} onLogout={handleLogout} />} />
            <Route path="/dashboard/:serverId" element={<Dashboard currentUser={currentUser} onLogout={handleLogout} />} />
            <Route path="/dashboard/:serverId/:channelId" element={<Dashboard currentUser={currentUser} onLogout={handleLogout} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        ) : (
          <>
            <Route path="/auth" element={<AuthForm onLogin={handleLogin} />} />
            <Route path="*" element={<Navigate to="/auth" />} />
          </>
        )}
      </Routes>
    </Router>
  )
}

export default App
