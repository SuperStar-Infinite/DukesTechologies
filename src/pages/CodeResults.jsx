import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { codeAPI, serverAPI } from '../services/api'
import '../styles/CodeResults.css'

function CodeResults() {
  const { code } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 })
  const [codeData, setCodeData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const billAmount = searchParams.get('bill')
  const isServer = searchParams.get('server') === 'true'

  useEffect(() => {
    const fetchCodeData = async () => {
      setLoading(true)
      setError('')
      
      try {
        let data
        
        // If coming from server validation, validate and log
        if (isServer && billAmount) {
          try {
            data = await serverAPI.validate(code, billAmount)
            // Server returns code data directly on success
          } catch (err) {
            setError(err.message || 'Invalid discount code')
            setLoading(false)
            return
          }
        } else {
          // Regular customer flow
          data = await codeAPI.getByCode(code)
        }
        
        // Check if expired
        if (new Date() > new Date(data.expiresAt)) {
          setError('This discount code has expired.')
          setLoading(false)
          return
        }

        setCodeData(data)
        console.log('Code data received:', data) // Debug log
      } catch (err) {
        console.error('Error fetching code:', err) // Debug log
        setError(err.message || 'Invalid discount code. Please check and try again.')
      } finally {
        setLoading(false)
      }
    }

    if (code) {
      fetchCodeData()
    }
  }, [code, isServer, billAmount])
  
  useEffect(() => {
    if (!codeData) return
    
    // Calculate initial time
    const updateTimer = () => {
      const now = new Date()
      const diff = new Date(codeData.expiresAt) - now
      
      if (diff <= 0) {
        setError('This discount code has expired.')
        setCodeData(null)
        return
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      
      setTimeLeft({ days, hours, minutes })
    }
    
    if (codeData) {
      updateTimer()
      const interval = setInterval(updateTimer, 60000) // Update every minute
      return () => clearInterval(interval)
    }
  }, [code, codeData, isServer, billAmount])

  if (error) {
    return (
      <div className="code-results-container">
        <div className="code-results-content">
          <h1 className="relay-logo">RELAY</h1>
          <p className="powered-by">POWERED BY DUKES TECHNOLOGIES</p>
          <div className="error-container">
            <p className="error-message-large">{error}</p>
            <button onClick={() => navigate('/')} className="back-button">
              Try Another Code
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading || !codeData) {
    return (
      <div className="code-results-container">
        <div className="code-results-content">
          <p className="loading">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="code-results-container">
      <div className="code-results-content">
        <h1 className="relay-logo">RELAY</h1>
        <p className="powered-by">POWERED BY DUKES TECHNOLOGIES</p>
        
        {isServer && billAmount && (
          <div className="bill-amount-section">
            <div className="bill-amount-box">
              ${parseFloat(billAmount).toFixed(2)}
            </div>
            <p className="bill-amount-label">BILL AMOUNT</p>
            <p className="bill-amount-subtext">(BEFORE DISCOUNT)</p>
          </div>
        )}

        {codeData.discountDescription && (
          <div className="discount-description">
            {codeData.discountDescription}
          </div>
        )}
        
        <div className="countdown-section">
          <p className="countdown-label">COUNTDOWN</p>
          <div className="countdown-timer">
            <div className="timer-box">
              <div className="timer-number">{String(timeLeft.days).padStart(2, '0')}</div>
              <div className="timer-label">DAYS</div>
            </div>
            <div className="timer-box">
              <div className="timer-number">{String(timeLeft.hours).padStart(2, '0')}</div>
              <div className="timer-label">HOURS</div>
            </div>
            <div className="timer-box">
              <div className="timer-number">{String(timeLeft.minutes).padStart(2, '0')}</div>
              <div className="timer-label">MINUTES</div>
            </div>
          </div>
        </div>

        <div className="restaurants-section">
          <p className="available-locations">AVAILABLE AT THESE LOCATIONS</p>
          
          {codeData.restaurants && codeData.restaurants.length > 0 ? (
            codeData.restaurants.map((restaurant, index) => (
              <div key={restaurant.id || restaurant._id || index} className="restaurant-item">
                <div className="restaurant-logo">
                  {restaurant.logoUrl ? (
                    <img 
                      src={restaurant.logoUrl} 
                      alt={restaurant.name}
                      className="restaurant-logo-img"
                    />
                  ) : (
                    // Fallback to text logo if no image
                    <div className="restaurant-text-logo">
                      <div className="restaurant-name-text">{restaurant.name}</div>
                    </div>
                  )}
                </div>
                <a 
                  href={restaurant.reservationLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="restaurant-link"
                >
                  {restaurant.displayName || restaurant.name}
                </a>
                <p style={{ 
                  fontSize: '0.85rem', 
                  color: 'rgba(255, 255, 255, 0.7)', 
                  marginTop: '0.5rem',
                  marginBottom: '0',
                  textAlign: 'center'
                }}>
                  Click link above to book reservation
                </p>
              </div>
            ))
          ) : (
            <p className="no-restaurants">No restaurants available for this code</p>
          )}
        </div>

        <button 
          onClick={() => isServer ? navigate('/server/validate') : navigate('/')} 
          className="back-button"
        >
          {isServer ? 'Validate Another Code' : 'Enter Another Code'}
        </button>
      </div>
    </div>
  )
}

export default CodeResults
