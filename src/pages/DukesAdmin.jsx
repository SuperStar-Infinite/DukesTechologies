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
  const [editingPeopleOnList, setEditingPeopleOnList] = useState({})
  const [peopleOnListInput, setPeopleOnListInput] = useState({})

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
                      <div className="people-on-list-section" style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                        <h4 style={{ marginBottom: '0.5rem' }}>People on List</h4>
                        {editingPeopleOnList[restaurant._id] ? (
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                              type="number"
                              min="0"
                              value={peopleOnListInput[restaurant._id] ?? (restaurant.peopleOnList ?? '')}
                              onChange={(e) => setPeopleOnListInput(prev => ({
                                ...prev,
                                [restaurant._id]: e.target.value === '' ? '' : parseInt(e.target.value) || 0
                              }))}
                              placeholder="Enter number of people"
                              style={{
                                padding: '0.5rem',
                                borderRadius: '4px',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                background: 'rgba(255, 255, 255, 0.1)',
                                color: 'white',
                                width: '150px'
                              }}
                            />
                            <button
                              onClick={async () => {
                                try {
                                  const value = peopleOnListInput[restaurant._id]
                                  await dukesAPI.updatePeopleOnList(
                                    restaurant._id,
                                    value === '' || value === null ? null : value
                                  )
                                  await refreshData()
                                  setEditingPeopleOnList(prev => {
                                    const newState = { ...prev }
                                    delete newState[restaurant._id]
                                    return newState
                                  })
                                  setPeopleOnListInput(prev => {
                                    const newState = { ...prev }
                                    delete newState[restaurant._id]
                                    return newState
                                  })
                                } catch (error) {
                                  alert(error.message || 'Failed to update people on list')
                                }
                              }}
                              style={{
                                padding: '0.5rem 1rem',
                                background: '#4ade80',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingPeopleOnList(prev => {
                                  const newState = { ...prev }
                                  delete newState[restaurant._id]
                                  return newState
                                })
                                setPeopleOnListInput(prev => {
                                  const newState = { ...prev }
                                  delete newState[restaurant._id]
                                  return newState
                                })
                              }}
                              style={{
                                padding: '0.5rem 1rem',
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                              {restaurant.peopleOnList !== null && restaurant.peopleOnList !== undefined
                                ? `${restaurant.peopleOnList} ${restaurant.peopleOnList === 1 ? 'person' : 'people'}`
                                : 'Not set (unlimited)'}
                            </span>
                            <button
                              onClick={() => {
                                setEditingPeopleOnList(prev => ({ ...prev, [restaurant._id]: true }))
                                setPeopleOnListInput(prev => ({
                                  ...prev,
                                  [restaurant._id]: restaurant.peopleOnList ?? ''
                                }))
                              }}
                              style={{
                                padding: '0.5rem 1rem',
                                background: '#667eea',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.9rem'
                              }}
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </div>

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
