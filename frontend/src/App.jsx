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
  const [retryCount, setRetryCount] = useState(0)
  const [customBackendUrl, setCustomBackendUrl] = useState('')
  const [targetApiUrl, setTargetApiUrl] = useState(window.__API_URL__)

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
        if (targetApiUrl) {
          apiClient.defaults.baseURL = targetApiUrl
        }
        
        const response = await apiClient.get('/q/health/live')
        
        // Check if the response is actually JSON and contains Quarkus health info
        if (typeof response.data !== 'object' || response.data.status !== 'UP') {
          throw new Error('Invalid health check response')
        }

        if (isMounted) {
          setIsLoading(false)
          setBackendError(null)
        }
      } catch (err) {
        // If we get an explicit error response from the server (not a 503),
        // or if we hit the manual "Invalid response" throw, stop loading.
        // We only retry on 503 (server starting) or network errors (no response).
        const isInvalidResponse = err.message === 'Invalid health check response'
        
        if (isInvalidResponse || (err.response && err.response.status !== 503)) {
          if (isMounted) {
            setIsLoading(false)
            setBackendError(null)
          }
          return
        }

        if (isMounted) {
          setRetryCount(prev => prev + 1)
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
  }, [targetApiUrl])

  const handleCustomUrlSubmit = (e) => {
    e.preventDefault()
    if (customBackendUrl) {
      let url = customBackendUrl.replace(/\/$/, '')
      if (!/^https?:\/\//i.test(url)) {
        url = 'http://' + url
      }
      setTargetApiUrl(url)
      setRetryCount(0)
      setBackendError('Connecting to ' + url + '...')
      setIsLoading(true)
    }
  }

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

  const handleChangeServer = () => {
    setIsLoading(true)
    setBackendError('Configure Server Connection')
    setRetryCount(0)
  }

  if (isLoading) {
    return (
      <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Loading />
        {backendError && (
          <div style={{ position: 'absolute', bottom: '20%', width: '100%', textAlign: 'center', color: '#ff6b6b', fontWeight: 'bold' }}>
            {backendError}
            {(retryCount >= 1 || backendError === 'Configure Server Connection') && (
              <form onSubmit={handleCustomUrlSubmit} style={{ marginTop: '15px' }}>
                <p style={{ color: '#b9bbbe', fontSize: '0.9rem', marginBottom: '5px' }}>Is the server hosted elsewhere?</p>
                <input 
                  type="text" 
                  placeholder="http://localhost:8080" 
                  value={customBackendUrl}
                  onChange={(e) => setCustomBackendUrl(e.target.value)}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #202225', marginRight: '5px' }}
                />
                <button type="submit" style={{ padding: '8px 12px', borderRadius: '4px', border: 'none', backgroundColor: '#5865F2', color: 'white', cursor: 'pointer' }}>
                  Connect
                </button>
              </form>
            )}
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
            <Route path="/auth" element={<AuthForm onLogin={handleLogin} onChangeServer={handleChangeServer} serverUrl={apiClient.defaults.baseURL} />} />
            <Route path="*" element={<Navigate to="/auth" />} />
          </>
        )}
      </Routes>
    </Router>
  )
}

export default App
