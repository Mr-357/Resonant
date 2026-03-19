import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import AuthForm from './components/AuthForm'
import Dashboard from './components/Dashboard'
import Loading from './components/Loading'
import './App.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

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
    // Show loading screen for 1.5 seconds for better UX
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1500)
    
    return () => clearTimeout(timer)
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
    return <Loading />
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
