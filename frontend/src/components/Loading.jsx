import React from 'react'
import './Loading.css'

export default function Loading() {
  return (
    <div className="loading-container">
      <div className="loading-content">
        <span className="loader"></span>
        <h1 className="loading-title">Resonant</h1>
        <div className="loader-text"></div>
      </div>
    </div>
  )
}
