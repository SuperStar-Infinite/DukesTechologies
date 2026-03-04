import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authAPI } from '../services/api'
import '../styles/Login.css'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const data = await authAPI.forgotPassword(email)
      setSuccess(data.message || 'If an account exists with that email, a password reset link has been sent.')
      
      // In development, show the reset code/token
      if (data.resetCode && data.resetToken) {
        setSuccess(`${data.message}\n\nDevelopment Mode:\nReset Code: ${data.resetCode}\nOr use this link: ${window.location.origin}/reset-password?token=${data.resetToken}`)
      }
    } catch (err) {
      setError(err.message || 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-content">
        <h1 className="relay-logo">RELAY</h1>
        <p className="powered-by">POWERED BY DUKES TECHNOLOGIES</p>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError('')
                setSuccess('')
              }}
              className="login-input"
              placeholder="Enter your email"
              required
              autoFocus
            />
          </div>

          {error && <p className="error-message">{error}</p>}
          {success && <p className="error-message" style={{ color: '#4ade80', whiteSpace: 'pre-line' }}>{success}</p>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'SENDING...' : 'SEND RESET LINK'}
          </button>
        </form>

        <div className="login-footer">
          <p className="login-signup-link">
            Remember your password? <Link to="/login">Login</Link>
          </p>
          <a href="/" className="back-link">← Back to Main Site</a>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
