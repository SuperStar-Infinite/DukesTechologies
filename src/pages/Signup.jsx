import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authAPI } from '../services/api'
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

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          type: 'restaurant'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed')
      }

      // Auto-login after signup
      if (data.token) {
        sessionStorage.setItem('token', data.token)
        sessionStorage.setItem('currentUser', JSON.stringify(data.user))
        
        // Redirect to onboarding
        navigate('/restaurant/onboarding')
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
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
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="form-input-modern"
              placeholder="At least 6 characters"
              required
              minLength={6}
            />
          </div>

          <div className="form-group-modern">
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="form-input-modern"
              placeholder="Re-enter your password"
              required
            />
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
