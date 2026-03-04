import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authAPI } from '../services/api'
import '../styles/Login.css'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await authAPI.login(email, password)
      
      // Route based on user type
      if (data.user.type === 'dukes') {
        navigate('/dukes/admin')
      } else if (data.user.type === 'restaurant') {
        if (data.user.onboarded) {
          navigate('/restaurant/admin')
        } else {
          navigate('/restaurant/onboarding')
        }
      }
    } catch (err) {
      // Display user-friendly error message
      const errorMessage = err.message || 'Invalid email or password'
      setError(errorMessage)
      console.error('Login error:', err)
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
              }}
              className="login-input"
              placeholder="Email"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              className="login-input"
              placeholder="Password"
              required
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'LOGGING IN...' : 'LOGIN'}
          </button>
        </form>

        <div className="login-footer">
          <p className="login-signup-link">
            Don't have an account? <Link to="/signup">Sign Up</Link>
          </p>
          <p className="login-signup-link" style={{ marginTop: '0.5rem' }}>
            <Link to="/forgot-password">Forgot Password?</Link>
          </p>
          <a href="/" className="back-link">← Back to Main Site</a>
        </div>
      </div>
    </div>
  )
}

export default Login
