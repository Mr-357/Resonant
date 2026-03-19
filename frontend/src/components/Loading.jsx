import React from 'react'
import './Loading.css'

export default function Loading() {
  return (
    <div className="loading-container">
      <div className="loading-content">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
        <h1 className="loading-title">Resonant</h1>
        <p className="loading-text">Checking your session...</p>
      </div>
    </div>
  )
}
