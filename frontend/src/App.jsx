import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import AuthForm from './components/AuthForm'
import Dashboard from './components/Dashboard'
import Loading from './components/Loading'
import apiClient from './axios/client'
import './App.css'
import './theme.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [backendError, setBackendError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)
  const [retryTimer, setRetryTimer] = useState(0)
  const [customBackendUrl, setCustomBackendUrl] = useState('')
  const [targetApiUrl, setTargetApiUrl] = useState(window.__API_URL__)
  const [isSSLError, setIsSSLError] = useState(false)

  useEffect(() => {
    let isMounted = true
    let retryTimeout
    let countdownInterval

    const validateSession = async () => {
      const token = localStorage.getItem('token')
      const userStr = localStorage.getItem('currentUser')
      
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr)
          // Attempt to fetch a protected resource to verify the token is still valid
          await apiClient.get('/api/servers') 
          if (isMounted) {
            setIsAuthenticated(true)
            setCurrentUser(user)
          }
        } catch (authErr) {
          console.error('Session validation failed:', authErr)
          localStorage.removeItem('token')
          localStorage.removeItem('currentUser')
          if (isMounted) {
            setIsAuthenticated(false)
            setCurrentUser(null)
          }
        }
      }
    }

    const handleRetry = (err, delay) => {
      const isInvalidResponse = err.message === 'Invalid health check response'
      const isCriticalError = isInvalidResponse || (err.response && err.response.status !== 503)

      if (isCriticalError && isMounted) {
        setIsLoading(true)
        setBackendError("Server is unreachable or returned an error. Please check the server status or try a different URL.")
      }

      if (isMounted) {
        setRetryCount(prev => prev + 1)
        let remainingDelay = Math.ceil(delay / 1000)
        
        if (backendError == null) setBackendError(`Cannot connect to server.`)

        countdownInterval = setInterval(() => {
          remainingDelay -= 1
          setRetryTimer(remainingDelay)
          if (remainingDelay <= 0) {
            clearInterval(countdownInterval)
          } else if (isMounted && backendError == null) {
            setBackendError(`Cannot connect to server.`)
          }
        }, 1000)

        const nextDelay = Math.min(delay * 1.5, 30000)
        retryTimeout = setTimeout(() => {
          if (isMounted) checkBackend(nextDelay)
        }, delay)
      }
    }

    const checkBackend = async (delay = 1000) => {
      if (countdownInterval) clearInterval(countdownInterval)

      try {
        if (targetApiUrl && apiClient.defaults.baseURL !== targetApiUrl) {
          apiClient.defaults.baseURL = targetApiUrl
        }
        
        // Add a timestamp to bypass proxy/browser caching of error states
        const response = await apiClient.get(`/q/health/live?t=${Date.now()}`)
        
        // Check if the response is actually JSON and contains Quarkus health info
        if (typeof response.data !== 'object' || response.data.status !== 'UP') {
          throw new Error('Invalid health check response')
        }
        
        await validateSession()

        if (isMounted) {
          setIsLoading(false)
          setBackendError(null)
          setIsSSLError(false)
        }
      } catch (err) {
        const potentialSSL = !err.response && targetApiUrl?.startsWith('https')
        if (potentialSSL && isMounted) setIsSSLError(true)
        handleRetry(err, delay)
      }
    }

    setIsSSLError(false)
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
          url = 'https://' + url
      }
      setTargetApiUrl(url)
      setRetryCount(0)
      setRetryTimer(0)
      setIsSSLError(false)
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
    setRetryTimer(0)
    setIsSSLError(false)
  }


  if (isLoading) {
    return (
      <Loading>
        {backendError && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <p style={{ color: 'var(--status-error)', fontWeight: 'bold', marginBottom: '10px' }}>{backendError}</p>
            <p style={{ color: 'var(--text-primary)' }}>Retrying connection in .. {retryTimer} seconds</p>
            {(retryCount >= 1 || backendError === 'Configure Server Connection') && (
              <form onSubmit={handleCustomUrlSubmit} style={{ marginTop: '15px' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '5px' }}>Is the server hosted elsewhere?</p>
                  <input 
                    type="text" 
                    id='custom-backend'
                    placeholder="https://localhost:8443" 
                    value={customBackendUrl}
                    onChange={(e) => setCustomBackendUrl(e.target.value)}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-tertiary)', marginRight: '5px' }}
                  />
                  <button type="submit" style={{ padding: '8px 12px', borderRadius: '4px', border: 'none', backgroundColor: 'var(--accent-primary)', color: 'white', cursor: 'pointer' }}>
                    Connect
                  </button>
                </form>
            )}
            {isSSLError && (
              <div style={{ marginTop: '25px', padding: '15px', background: 'rgba(255, 71, 87, 0.1)', borderRadius: '8px', border: '1px solid var(--status-danger)', display: 'inline-block', maxWidth: '450px', color: 'var(--text-primary)' }}>
                <p style={{ fontSize: '0.85rem', marginBottom: '10px' }}>
                  🛡️ <strong>SSL/Certificate Issue Detected</strong>
                  <br />Your browser may be blocking the connection to a self-signed backend.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                 
                    <p style={{ display: 'block', padding: '8px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', borderRadius: '4px', fontSize: '0.8rem' }}>
                      Load the server's SSL certificate into your trust store to proceed if you are sure about the server's safety.
                    </p>
                
                </div>
              </div>
            )}
          </div>
        )}
      </Loading>
    )
  }

  return (
    <Router basename={import.meta.env.BASE_URL}>
      <Routes>
        {isAuthenticated ? (
          <>
            <Route path="/" element={<Dashboard currentUser={currentUser} onLogout={handleLogout} onChangeServer={handleChangeServer} />} />
            <Route path="/dashboard/:serverId" element={<Dashboard currentUser={currentUser} onLogout={handleLogout} onChangeServer={handleChangeServer} />} />
            <Route path="/dashboard/:serverId/:channelId" element={<Dashboard currentUser={currentUser} onLogout={handleLogout} onChangeServer={handleChangeServer} />} />
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
