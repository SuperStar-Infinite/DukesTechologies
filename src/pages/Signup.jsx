import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authAPI } from '../services/api'
import PasswordStrength from '../components/PasswordStrength'
import { generateStrongPassword } from '../utils/passwordGenerator'
import '../styles/Signup.css'

function Signup() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!formData.name.trim()) {
      setError('Please enter your name')
      return
    }

    if (!formData.email.trim()) {
      setError('Please enter your email')
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    // Check password strength
    const hasUpperCase = /[A-Z]/.test(formData.password)
    const hasLowerCase = /[a-z]/.test(formData.password)
    const hasNumber = /[0-9]/.test(formData.password)
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password)

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      setError('Password must include uppercase, lowercase, number, and special character')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const data = await authAPI.register(
        formData.email,
        formData.password,
        formData.name,
        'restaurant'
      )

      // Auto-login after signup (token is already set by authAPI.register)
      if (data.token) {
        // Redirect to onboarding
        navigate('/restaurant/onboarding')
      }
    } catch (err) {
      // Handle password strength errors
      if (err.passwordStrength) {
        const suggestions = err.passwordStrength.suggestions || []
        setError(suggestions.length > 0 
          ? `Password requirements: ${suggestions.join(', ')}`
          : err.message || 'Password does not meet strength requirements')
      } else {
        setError(err.message || 'Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="signup-container">
      <div className="signup-content">
        <div className="signup-header">
          <h1 className="signup-logo">RELAY</h1>
          <p className="signup-subtitle">Create Your Restaurant Account</p>
          <p className="powered-by">POWERED BY DUKES TECHNOLOGIES</p>
        </div>
        
        <form onSubmit={handleSubmit} className="signup-form">
          <div className="form-group-modern">
            <label className="form-label">Your Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="form-input-modern"
              placeholder="Enter your name"
              required
              autoFocus
            />
          </div>

          <div className="form-group-modern">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input-modern"
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="form-group-modern">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="form-input-modern"
                placeholder="At least 8 characters with uppercase, lowercase, number, and special character"
                required
                minLength={8}
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
                    setFormData(prev => ({ ...prev, password: newPassword }))
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
            {formData.password && <PasswordStrength password={formData.password} />}
          </div>

          <div className="form-group-modern">
            <label className="form-label">Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="form-input-modern"
                placeholder="Re-enter your password"
                required
                style={{ paddingRight: '50px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
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

          {error && (
            <div className="error-message-modern">
              <span className="error-icon">⚠</span>
              {error}
            </div>
          )}

          <button type="submit" className="signup-button" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner"></span>
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="signup-footer">
          <p className="signup-login-link">
            Already have an account? <Link to="/login">Sign In</Link>
          </p>
          <Link to="/" className="back-link-modern">← Back to Main Site</Link>
        </div>
      </div>
    </div>
  )
}

export default Signup
