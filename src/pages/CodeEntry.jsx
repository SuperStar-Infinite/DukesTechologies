import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/CodeEntry.css'

function CodeEntry() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    
    if (!code.trim()) {
      setError('Please enter a discount code')
      return
    }

    // Navigate to results page with the code
    navigate(`/results/${code.trim().toUpperCase()}`)
  }

  return (
    <div className="code-entry-container">
      <div className="code-entry-content">
        <h1 className="relay-logo">RELAY</h1>
        <p className="powered-by">POWERED BY DUKES TECHNOLOGIES</p>
        
        <form onSubmit={handleSubmit} className="code-form">
          <p className="prompt-text">TYPE DISCOUNT CODE</p>
          
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              setError('')
            }}
            className="code-input"
            placeholder="Enter code"
            autoFocus
          />
          
          {error && <p className="error-message">{error}</p>}
          
          <button type="submit" className="submit-button">
            SUBMIT
          </button>
        </form>

        <div className="admin-links">
          <a href="/login" className="admin-link">RESTAURANT LOGIN</a>
        </div>
      </div>
    </div>
  )
}

export default CodeEntry
