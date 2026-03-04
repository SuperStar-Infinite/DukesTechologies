import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { authAPI } from '../services/api'
import '../styles/Login.css'

function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.')
    }
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!token) {
      setError('Invalid reset token')
      return
    }

    setLoading(true)

    try {
      await authAPI.resetPassword(token, password)
      setSuccess('Password reset successfully! Redirecting to login...')
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err) {
      setError(err.message || 'Failed to reset password')
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
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              className="login-input"
              placeholder="New Password (min 6 characters)"
              required
              minLength={6}
              autoFocus
            />
          </div>

          <div className="form-group">
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                setError('')
              }}
              className="login-input"
              placeholder="Confirm New Password"
              required
              minLength={6}
            />
          </div>

          {error && <p className="error-message">{error}</p>}
          {success && <p className="error-message" style={{ color: '#4ade80' }}>{success}</p>}

          <button type="submit" className="login-button" disabled={loading || !token}>
            {loading ? 'RESETTING...' : 'RESET PASSWORD'}
          </button>
        </form>

        <div className="login-footer">
          <p className="login-signup-link">
            <Link to="/login">Back to Login</Link>
          </p>
          <a href="/" className="back-link">← Back to Main Site</a>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword
