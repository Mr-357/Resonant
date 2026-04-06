import React, { useState } from 'react'
import { authAPI } from '../api/client'
import './AuthForm.css'

export default function AuthForm({ onLogin, onChangeServer, serverUrl }) {
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError('')
  }

  const handleSubmit = async (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (loading) return

    setLoading(true)
    setError('')

    try {
      let response
      if (isLogin) {
        response = await authAPI.login(formData.username, formData.password)
      } else {
        response = await authAPI.register(formData.username, formData.email, formData.password)
      }
      
      const data = response.data
      const id = data.userId || data.id

      if (onLogin) {
        onLogin(data.token, { id, username: data.username })
      }
    } catch (err) {
      const status = err.response?.status || err.status
      const responseData = err.response?.data || err.data

      if (!status) {
        setError('Unable to connect to server')
      } else if (status === 401) {
        setError('Invalid username or password')
      } else if (status >= 500) {
        setError('Server error. Please try again later.')
      } else {
        setError(responseData?.error || 'Authentication failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h1 className="auth-title">Resonant</h1>
        <p className="auth-subtitle">{isLogin ? 'Welcome back' : 'Join Resonant'}</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Loading...' : (isLogin ? 'Login' : 'Register')}
          </button>
        </form>

        <div className="auth-toggle">
          <p>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              className="toggle-button"
              onClick={() => {
                setIsLogin(!isLogin)
                setError('')
                setFormData({ username: '', email: '', password: '' })
              }}
            >
              {isLogin ? 'Register' : 'Login'}
            </button>
          </p>
          <div style={{ marginTop: '15px', borderTop: '1px solid #2f3136', paddingTop: '10px' }}>
            <button type="button" onClick={onChangeServer} style={{ background: 'none', border: 'none', color: '#72767d', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}>
              Change Server
            </button>
            {serverUrl && serverUrl !== '/' && (
              <div style={{ color: '#72767d', fontSize: '0.75rem', marginTop: '4px' }}>
                Connecting to: {serverUrl}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
