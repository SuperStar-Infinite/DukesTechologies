import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { authAPI } from '../services/api'
import PasswordStrength from '../components/PasswordStrength'
import { generateStrongPassword } from '../utils/passwordGenerator'
import '../styles/Login.css'

function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
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

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    // Check password strength
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      setError('Password must include uppercase, lowercase, number, and special character')
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
      // Handle password strength errors
      if (err.passwordStrength) {
        const suggestions = err.passwordStrength.suggestions || []
        setError(suggestions.length > 0 
          ? `Password requirements: ${suggestions.join(', ')}`
          : err.message || 'Password does not meet strength requirements')
      } else {
        setError(err.message || 'Failed to reset password')
      }
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
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                className="login-input"
                placeholder="New Password (min 8 characters with uppercase, lowercase, number, and special character)"
                required
                minLength={8}
                autoFocus
                style={{ paddingRight: '100px' }}
              />
              <div style={{ 
                position: 'absolute', 
                right: '8px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    const newPassword = generateStrongPassword(12)
                    setPassword(newPassword)
                    setError('')
                  }}
                  style={{
                    padding: '0.4rem',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px'
                  }}
                  title="Generate a strong password"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12c0 1.66-1 3-2 3H7c-1.66 0-3-1.34-3-3s1.34-3 3-3h12c1 0 2 1.34 2 3z"/>
                    <path d="M7 12c0-1.66 1-3 2-3h12c1.66 0 3 1.34 3 3s-1.34 3-3 3H9c-1 0-2-1.34-2-3z"/>
                    <path d="M7 12h10"/>
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    padding: '0.4rem',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px'
                  }}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            {password && <PasswordStrength password={password} />}
          </div>

          <div className="form-group">
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  setError('')
                }}
                className="login-input"
                placeholder="Confirm New Password"
                required
                minLength={8}
                style={{ paddingRight: '50px' }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  padding: '0.4rem',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px'
                }}
                title={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
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
