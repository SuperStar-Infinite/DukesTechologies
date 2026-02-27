import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { dukesAPI } from '../services/api'
import '../styles/DukesAdmin.css'

function DukesAdmin() {
  const navigate = useNavigate()
  const [restaurants, setRestaurants] = useState([])
  const [selectedRestaurant, setSelectedRestaurant] = useState(null)
  const [restaurantCodes, setRestaurantCodes] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      // Check if user is Dukes admin
      const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}')
      if (!user.email || user.type !== 'dukes') {
        navigate('/login')
        return
      }

      try {
        const { restaurants: restaurantsData } = await dukesAPI.getAllRestaurants()
        setRestaurants(restaurantsData || [])
      } catch (error) {
        console.error('Error fetching restaurants:', error)
        if (error.message?.includes('401') || error.message?.includes('token')) {
          navigate('/login')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [navigate])

  const handleRestaurantClick = async (restaurant) => {
    if (selectedRestaurant?._id === restaurant._id) {
      setSelectedRestaurant(null)
      return
    }

    setSelectedRestaurant(restaurant)

    // Fetch codes for this restaurant if not already loaded
    if (!restaurantCodes[restaurant._id]) {
      try {
        const { codes } = await dukesAPI.getRestaurantCodes(restaurant._id)
        setRestaurantCodes(prev => ({
          ...prev,
          [restaurant._id]: codes || []
        }))
      } catch (error) {
        console.error('Error fetching restaurant codes:', error)
      }
    }
  }

  const getRestaurantCodes = (restaurantId) => {
    return restaurantCodes[restaurantId] || []
  }

  const refreshData = async () => {
    try {
      const { restaurants: restaurantsData } = await dukesAPI.getAllRestaurants()
      setRestaurants(restaurantsData || [])
      if (selectedRestaurant) {
        const { codes } = await dukesAPI.getRestaurantCodes(selectedRestaurant._id)
        setRestaurantCodes(prev => ({
          ...prev,
          [selectedRestaurant._id]: codes || []
        }))
      }
    } catch (error) {
      console.error('Error refreshing data:', error)
    }
  }

  return (
    <div className="dukes-admin-container">
      <div className="dukes-admin-content">
        <div className="dukes-header">
          <h1 className="dukes-title">DUKES ADMIN DASHBOARD</h1>
          <p className="powered-by">POWERED BY DUKES TECHNOLOGIES</p>
        </div>

        <div className="restaurants-section">
          <div className="restaurants-section-header">
            <h2>All Restaurants</h2>
            <button
              type="button"
              className="refresh-btn-modern"
              onClick={(e) => {
                const btn = e.currentTarget
                btn.classList.add('rotating')
                refreshData().finally(() => {
                  setTimeout(() => {
                    btn.classList.remove('rotating')
                  }, 600)
                })
              }}
              title="Refresh data"
            >
              <svg className="refresh-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
              <span>Refresh</span>
            </button>
          </div>
          <div className="restaurants-list">
            {loading ? (
              <p className="loading">Loading restaurants...</p>
            ) : restaurants.length === 0 ? (
              <p className="no-data">No restaurants found</p>
            ) : (
              restaurants.map((restaurant, index) => {
                const codes = getRestaurantCodes(restaurant._id)
                const activeCodes = codes.filter(c => new Date() < new Date(c.expiresAt)).length
                const totalRevenue = restaurant.stats?.totalRevenue || codes.reduce((sum, c) => sum + (c.totalRevenue || 0), 0)
                const totalSubmissions = restaurant.stats?.totalSubmissions || codes.reduce((sum, c) => sum + (c.submissions || 0), 0)

              return (
                <div key={index} className="restaurant-card">
                  <div 
                    className="restaurant-card-header"
                    onClick={() => handleRestaurantClick(restaurant)}
                  >
                    <div className="restaurant-info">
                      <h3>{restaurant.restaurantName}</h3>
                      <p className="restaurant-email">{restaurant.email}</p>
                    </div>
                    <div className="restaurant-stats">
                      <div className="stat">
                        <span className="stat-label">Active Codes</span>
                        <span className="stat-value">{restaurant.stats?.activeCodes || activeCodes}</span>
                      </div>
                      <div className="stat">
                        <span className="stat-label">Total Revenue</span>
                        <span className="stat-value">${totalRevenue.toFixed(2)}</span>
                      </div>
                      <div className="stat">
                        <span className="stat-label">Submissions</span>
                        <span className="stat-value">{totalSubmissions}</span>
                      </div>
                    </div>
                    <div className="expand-icon">
                      {selectedRestaurant?._id === restaurant._id ? '▼' : '▶'}
                    </div>
                  </div>

                  {selectedRestaurant?._id === restaurant._id && (
                    <div className="restaurant-details">
                      <div className="locations-section">
                        <h4>Locations</h4>
                        <div className="locations-list">
                          {restaurant.locations.map((location, locIndex) => (
                            <div key={locIndex} className="location-item">
                              <strong>{location.name}</strong>
                              <a href={location.reservationLink} target="_blank" rel="noopener noreferrer">
                                {location.reservationLink}
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="codes-section">
                        <h4>Codes</h4>
                        <div className="codes-list">
                          {codes.length === 0 ? (
                            <p className="no-data">No codes created yet</p>
                          ) : (
                            codes.map((code, codeIndex) => {
                              const isExpired = new Date() > new Date(code.expiresAt)
                              return (
                                <div key={codeIndex} className="code-item">
                                  <div className="code-header">
                                    <strong>{code.code}</strong>
                                    <span className={`status-badge ${isExpired ? 'expired' : 'active'}`}>
                                      {isExpired ? 'Expired' : 'Active'}
                                    </span>
                                  </div>
                                  <p className="code-description">{code.discountDescription}</p>
                                  <div className="code-stats">
                                    <span>People to Call: {code.peopleToCall || 0}</span>
                                    <span>Submissions: {code.submissions || 0}</span>
                                    <span>Revenue: ${(code.totalRevenue || 0).toFixed(2)}</span>
                                    <span>Expires: {new Date(code.expiresAt).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
            )}
          </div>
        </div>

        <div className="dukes-footer">
          <a href="/" className="back-link">← Back to Main Site</a>
        </div>
      </div>
    </div>
  )
}

export default DukesAdmin
