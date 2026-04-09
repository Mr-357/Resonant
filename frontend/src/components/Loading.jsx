import React from 'react'
import './Loading.css'
import PropTypes from 'prop-types'

export default function Loading({ children }) {
  return (
    <div className="loading-container">
      <div className="loading-content">
        <span className="loader"></span>
        <h1 className="loading-title">Resonant</h1>
        <div className="loader-text"></div>
        {children && (
          <div className="loading-extra-content">{children}</div>
        )}
      </div>
    </div>
  )
}

Loading.propTypes = {
  children: PropTypes.node
}
