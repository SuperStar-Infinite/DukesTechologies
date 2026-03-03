import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { restaurantAPI, codeAPI, uploadAPI, stripeAPI } from '../services/api'
import { loadStripe } from '@stripe/stripe-js'
import '../styles/RestaurantAdmin.css'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51T5ursCFQaWcDS8Sq1JyDrT8IE9vPDXtcsBF9xLLUdJFpcWU8UK3R2CUj3FOzMEigoyhBzrxBtVvW6x62ntmaL400g4QxZv6W')

function RestaurantAdmin() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('create')
  const [currentUser, setCurrentUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [callers, setCallers] = useState([])
  const [formData, setFormData] = useState({
    discountDescription: '',
    peopleToCall: '',
    duration: '',
    durationUnit: 'days',
    selectedLocations: []
  })
  const [pastCodes, setPastCodes] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingLocation, setEditingLocation] = useState(null)
  const [newLocation, setNewLocation] = useState({
    name: '',
    displayName: '',
    reservationLink: '',
    logo: null,
    logoPreview: null
  })
  const [editingRestaurantName, setEditingRestaurantName] = useState(false)
  const [restaurantNameInput, setRestaurantNameInput] = useState('')
  const [subscriptionData, setSubscriptionData] = useState(null)
  const [showCallCreditsModal, setShowCallCreditsModal] = useState(false)
  const [callCreditsAmount, setCallCreditsAmount] = useState('')
  const [processingPayment, setProcessingPayment] = useState(false)

  // Fetch user data
  const fetchUserData = async () => {
    try {
      const { user } = await restaurantAPI.getProfile()
      
      if (!user.onboarded) {
        navigate('/restaurant/onboarding')
        return
      }

      setUserData(user)
      setCallers(user.callers || [])
      setRestaurantNameInput(user.restaurantName || '')
    } catch (error) {
      console.error('Error fetching user data:', error)
      if (error.message?.includes('401') || error.message?.includes('token')) {
        navigate('/login')
      }
    } finally {
      setLoading(false)
    }
  }

  // Fetch subscription data
  const fetchSubscriptionData = async () => {
    try {
      const data = await stripeAPI.getSubscription()
      setSubscriptionData(data)
    } catch (error) {
      console.error('Error fetching subscription data:', error)
    }
  }

  // Fetch codes
  const fetchCodes = async () => {
    try {
      const { codes } = await codeAPI.getAll()
      setPastCodes(codes || [])
    } catch (error) {
      console.error('Error fetching codes:', error)
    }
  }

  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}')
    if (!user.email) {
      navigate('/login')
      return
    }

    setCurrentUser(user)
    fetchUserData()
    fetchCodes()
    fetchSubscriptionData()

    // Handle Stripe checkout success
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const sessionId = urlParams.get('session_id')
    const creditsSuccess = urlParams.get('credits_success')
    const creditsCanceled = urlParams.get('credits_canceled')

    if (success === 'true' && sessionId) {
      // Show success message
      setMessage('Payment successful! Your subscription is being activated...')
      
      // Wait for webhook to process, then fetch updated data with retries
      const fetchWithRetry = async (retries = 5, delay = 3000) => {
        for (let i = 0; i < retries; i++) {
          await new Promise(resolve => setTimeout(resolve, delay))
          await fetchSubscriptionData()
          await fetchUserData()
          
          // Check if subscription was updated
          const updatedData = await stripeAPI.getSubscription()
          if (updatedData.subscriptionPlan !== 'trial' && updatedData.subscriptionStatus !== 'trial') {
            setMessage('Subscription activated successfully!')
            window.history.replaceState({}, document.title, '/restaurant/admin')
            setTimeout(() => setMessage(''), 5000)
            return
          }
        }
        // If still not updated after retries, show message with refresh option
        setMessage('Subscription is processing. If it doesn\'t update, please refresh the page.')
        window.history.replaceState({}, document.title, '/restaurant/admin')
        setTimeout(() => setMessage(''), 10000)
      }
      
      fetchWithRetry()
    }

    if (creditsSuccess === 'true') {
      setMessage('Call credits purchased successfully!')
      setShowCallCreditsModal(false)
      setCallCreditsAmount('')
      
      // Wait for webhook to process, then fetch with retries
      const fetchWithRetry = async (retries = 5, delay = 3000) => {
        for (let i = 0; i < retries; i++) {
          await new Promise(resolve => setTimeout(resolve, delay))
          await fetchSubscriptionData()
          
          // Check if credits were updated
          const updatedData = await stripeAPI.getSubscription()
          if (updatedData.callCredits > 0 || i === retries - 1) {
            window.history.replaceState({}, document.title, '/restaurant/admin')
            setTimeout(() => setMessage(''), 5000)
            return
          }
        }
      }
      
      fetchWithRetry()
    }

    if (creditsCanceled === 'true') {
      setMessage('Call credits purchase was canceled.')
      setShowCallCreditsModal(false)
      window.history.replaceState({}, document.title, '/restaurant/admin')
      setTimeout(() => setMessage(''), 3000)
    }
  }, [navigate])


  // Purchase call credits
  const handlePurchaseCallCredits = async (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    const amount = parseFloat(callCreditsAmount)
    
    if (!callCreditsAmount || isNaN(amount) || amount <= 0) {
      setMessage('Please enter a valid amount')
      return
    }

    setProcessingPayment(true)
    setMessage('')

    try {
      // Create a checkout session for call credits
      const response = await stripeAPI.createCheckoutSession('call_credits', amount)
      
      if (response && response.url) {
        // Redirect to Stripe Checkout
        window.location.href = response.url
      } else {
        setMessage('Failed to create checkout session. Please try again.')
        setProcessingPayment(false)
      }
    } catch (error) {
      console.error('Call credits purchase error:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to process payment'
      setMessage(errorMessage)
      setProcessingPayment(false)
    }
  }

  // Calculate caller status
  // 48 hour cooldown period
  const COOLING_PERIOD_MS = 48 * 60 * 60 * 1000 // 48 hours
  const getCallerStatus = (caller) => {
    // Never show 'active' status - callers are either available or in cooldown
    if (caller.status === 'cooling' || caller.status === 'active') {
      if (!caller.lastCampaignEnd) {
        // If status is active/cooling but no lastCampaignEnd, treat as available
        return { status: 'available', label: 'Available', color: '#00ff00' }
      }
      const lastEnd = new Date(caller.lastCampaignEnd)
      const now = new Date()
      const msSince = now - lastEnd
      if (msSince >= COOLING_PERIOD_MS) {
        return { status: 'available', label: 'Available', color: '#00ff00' }
      }
      const hoursLeft = Math.ceil((COOLING_PERIOD_MS - msSince) / (1000 * 60 * 60))
      return { status: 'cooling', label: `Cooling Down (${hoursLeft}h left)`, color: '#ffff00' }
    }
    return { status: 'available', label: 'Available', color: '#00ff00' }
  }

  const handleLocationToggle = (locationId) => {
    setFormData(prev => {
      const selected = prev.selectedLocations.includes(locationId)
        ? prev.selectedLocations.filter(id => id !== locationId)
        : [...prev.selectedLocations, locationId]
      return { ...prev, selectedLocations: selected }
    })
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setMessage('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')

    // Validation
    if (!formData.discountDescription.trim()) {
      setMessage('Please enter the discount description')
      return
    }

    if (!formData.peopleToCall || parseInt(formData.peopleToCall) <= 0) {
      setMessage('Please enter how many people to call')
      return
    }

    if (formData.selectedLocations.length === 0) {
      setMessage('Please select at least one restaurant location')
      return
    }

    if (!formData.duration || parseInt(formData.duration) <= 0) {
      setMessage('Please enter a valid duration')
      return
    }

    try {
      // Create code via API
      const response = await codeAPI.create({
        discountDescription: formData.discountDescription,
        peopleToCall: parseInt(formData.peopleToCall),
        duration: parseInt(formData.duration),
        durationUnit: formData.durationUnit,
        selectedLocations: formData.selectedLocations
      })

      setMessage(`Code "${response.code.code}" created successfully!`)
      
      // Refresh user data, subscription data (for call credits), and codes immediately
      await fetchUserData()
      await fetchSubscriptionData()
      await fetchCodes()
      
      // Reset form
      setFormData({
        discountDescription: '',
        peopleToCall: '',
        duration: '',
        durationUnit: 'days',
        selectedLocations: []
      })
    } catch (error) {
      setMessage(error.message || 'Failed to create code')
    }
  }

  if (loading || !userData) {
    return (
      <div className="restaurant-admin-container">
        <div className="restaurant-admin-content" style={{ textAlign: 'center', paddingTop: '50px' }}>
          <div className="loading" style={{ color: '#fff', fontSize: '18px' }}>Loading...</div>
        </div>
      </div>
    )
  }

  // Check if in 67-day offer window (from account creation)
  // Only show notification if user is still on trial (hasn't purchased a plan yet)
  const isInOfferWindow = subscriptionData?.isInOfferWindow
  const hasPaidPlan = subscriptionData?.subscriptionPlan && 
    subscriptionData.subscriptionPlan !== 'trial' && 
    subscriptionData.subscriptionStatus !== 'trial'
  // Calculate days left - updates dynamically each time component renders
  const daysLeftInOffer = subscriptionData?.offerEndDate 
    ? Math.max(0, Math.floor((new Date(subscriptionData.offerEndDate) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0

  return (
    <>
    <div className="restaurant-admin-container">
      <div className="restaurant-admin-content">
        {/* Success Message Banner */}
        {message && (
          <div style={{
            background: message.includes('success') || message.includes('Success') 
              ? 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)' 
              : 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
            color: 'white',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            textAlign: 'center',
            fontSize: '1rem',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            animation: 'slideDown 0.3s ease-out'
          }}>
            {message}
          </div>
        )}

        {/* 67-Day Offer Notification - Only show if user hasn't purchased a plan yet */}
        {isInOfferWindow && daysLeftInOffer > 0 && !hasPaidPlan && (
          <div className="offer-notification" style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>
              🎉 Limited Time Offer: 20% Off Annual Plans!
            </h3>
            <p style={{ margin: '0 0 1rem 0' }}>
              Only {daysLeftInOffer} {daysLeftInOffer === 1 ? 'day' : 'days'} left to get 20% off your annual subscription!
            </p>
            <button
              onClick={() => navigate('/pricing')}
              style={{
                background: 'white',
                color: '#667eea',
                border: 'none',
                padding: '0.75rem 2rem',
                borderRadius: '6px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
              onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
            >
              View Plans & Save 20%
            </button>
          </div>
        )}

        {/* Subscription & Call Credits Status */}
        {subscriptionData && (
          <div className="subscription-status" style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '1.25rem',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ color: '#ffffff', fontSize: '0.95rem' }}>
              <strong style={{ color: '#ff6b6b', marginRight: '0.5rem' }}>Plan:</strong> 
              <span style={{ color: '#ffffff' }}>
                {subscriptionData.subscriptionPlan === 'trial' ? 'Free Trial' : subscriptionData.subscriptionPlan.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
              {subscriptionData.isInTrial && (
                <span style={{ marginLeft: '0.5rem', color: '#ffd700' }}>
                  (Trial ends: {new Date(subscriptionData.trialEndDate).toLocaleDateString()})
                </span>
              )}
            </div>
            <div style={{ color: '#ffffff', fontSize: '0.95rem' }}>
              <strong style={{ color: '#ff6b6b', marginRight: '0.5rem' }}>Call Credits:</strong> 
              <span style={{ color: '#ffffff' }}>
                ${(subscriptionData.callCredits / 100).toFixed(2)} ({Math.floor(subscriptionData.callCredits / 50)} calls)
              </span>
            </div>
            <div style={{ color: '#ffffff', fontSize: '0.95rem' }}>
              <strong style={{ color: '#ff6b6b', marginRight: '0.5rem' }}>Campaigns This Month:</strong> 
              <span style={{ color: '#ffffff' }}>
                {subscriptionData.campaignsThisMonth} / {subscriptionData.limits?.isUnlimited ? 'Unlimited' : subscriptionData.limits?.campaignsPerMonth || 'N/A'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/pricing')}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)'
                  e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)'
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)'
                }}
              >
                View Plans
              </button>
              <button
                onClick={() => {
                  setShowCallCreditsModal(true)
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)'
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)'
                }}
              >
                Purchase Credits
              </button>
            </div>
          </div>
        )}

        <div className="admin-header">
          <h1 className="welcome-text">welcome {currentUser?.name || 'User'}!</h1>
          <div className="header-buttons">
            <button
              className={`header-btn ${activeTab === 'past' ? 'active' : ''}`}
              onClick={() => setActiveTab('past')}
            >
              view past codes performance
            </button>
            <button
              className={`header-btn ${activeTab === 'create' ? 'active' : ''}`}
              onClick={() => setActiveTab('create')}
            >
              create new
            </button>
            <button
              className={`header-btn ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              my profile
            </button>
          </div>
        </div>

        {activeTab === 'create' && (
          <form onSubmit={handleSubmit} className="create-form">
            {/* Caller Dashboard */}
            <div className="caller-dashboard">
              <div className="caller-dashboard-header">
                <h3>Caller Status</h3>
                <div className="caller-header-actions">
                  <button
                    type="button"
                    className="refresh-btn-modern"
                    onClick={async (e) => {
                      const btn = e.currentTarget
                      btn.classList.add('rotating')
                      await fetchUserData()
                      setMessage('Caller status refreshed!')
                      setTimeout(() => {
                        btn.classList.remove('rotating')
                        setMessage('')
                      }, 2000)
                    }}
                    title="Refresh caller status"
                  >
                    <svg className="refresh-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div className="callers-grid">
                {callers.map((caller, index) => {
                  const status = getCallerStatus(caller)
                  return (
                    <div key={caller._id || caller.id || index} className="caller-card" style={{ borderColor: status.color }}>
                      <div className="caller-status-indicator" style={{ backgroundColor: status.color }}></div>
                      <div className="caller-info">
                        <strong>Caller {index + 1}</strong>
                        <span className="caller-status-label">{status.label}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="caller-info-text">
                Each caller can handle one campaign at a time. 48-hour cooldown required between campaigns.
              </p>
            </div>

            <div className="form-group">
              <label>select which restaurants code will be active at</label>
              <div className="locations-checkboxes">
                {userData.locations.map(location => (
                  <label key={location._id || location.id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.selectedLocations.includes(location._id || location.id)}
                      onChange={() => handleLocationToggle(location._id || location.id)}
                    />
                    <span>{location.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>type the discount to show to customers</label>
              <input
                type="text"
                name="discountDescription"
                value={formData.discountDescription}
                onChange={handleInputChange}
                className="form-input"
                placeholder="e.g., 2 FREE GLASSES OF WINE EACH GLASS MUST BE UNDER $20"
                required
              />
            </div>

            <div className="form-group">
              <label>how many people do you wish to call?</label>
              <input
                type="number"
                name="peopleToCall"
                value={formData.peopleToCall}
                onChange={handleInputChange}
                className="form-input"
                placeholder="e.g., 500"
                min="1"
                required
              />
              <p className="form-note">Please note: relay needs 48 hours notice before we make calls</p>
            </div>

            <div className="form-group">
              <label>how long will the code be active</label>
              <div className="duration-input-group">
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  className="form-input duration-input"
                  placeholder="3"
                  min="1"
                  required
                />
                <select
                  name="durationUnit"
                  value={formData.durationUnit}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
            </div>

            {message && (
              <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
                {message}
              </div>
            )}

            <button type="submit" className="submit-button-oval">
              SUBMIT
            </button>
          </form>
        )}

        {activeTab === 'past' && (
          <div className="past-codes-section">
            <div className="past-codes-header">
              <h2>Past Codes Performance</h2>
              <button
                type="button"
                className="refresh-btn-modern"
                onClick={async (e) => {
                  const btn = e.currentTarget
                  btn.classList.add('rotating')
                  await fetchCodes()
                  await fetchUserData()
                  setMessage('Data refreshed!')
                  setTimeout(() => {
                    btn.classList.remove('rotating')
                    setMessage('')
                  }, 2000)
                }}
                title="Refresh data"
              >
                <svg className="refresh-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                </svg>
                <span>Refresh</span>
              </button>
            </div>
            <div className="codes-table">
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Discount</th>
                    <th>People to Call</th>
                    <th>Submissions</th>
                    <th>Revenue</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pastCodes.map((code, index) => {
                    const isExpired = new Date() > new Date(code.expiresAt)
                    return (
                      <tr key={code._id || index}>
                        <td><strong>{code.code}</strong></td>
                        <td>{code.discountDescription}</td>
                        <td>{code.peopleToCall || 0}</td>
                        <td>{code.submissions || 0}</td>
                        <td>${(code.totalRevenue || 0).toFixed(2)}</td>
                        <td>
                          <span className={`status-badge ${isExpired ? 'expired' : 'active'}`}>
                            {isExpired ? 'Expired' : 'Active'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {pastCodes.length === 0 && (
                <p className="no-codes">No codes created yet</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="profile-section">
            <div className="profile-header-modern">
              <h2>My Profile</h2>
              <p className="profile-subtitle">Manage your restaurant information and locations</p>
            </div>

            {/* Restaurant Name */}
            <div className="profile-card-modern">
              <div className="profile-card-header">
                <h3>Restaurant Name</h3>
                {!editingRestaurantName ? (
                  <button
                    className="edit-btn-modern"
                    onClick={() => {
                      setEditingRestaurantName(true)
                      setRestaurantNameInput(userData.restaurantName)
                    }}
                  >
                    Edit
                  </button>
                ) : (
                  <div className="edit-actions">
                    <button
                      className="save-btn-modern"
                      onClick={async () => {
                        try {
                          await restaurantAPI.updateProfile({
                            restaurantName: restaurantNameInput
                          })
                          await fetchUserData()
                          setEditingRestaurantName(false)
                          setMessage('Restaurant name updated successfully!')
                        } catch (error) {
                          setMessage(error.message || 'Failed to update restaurant name')
                        }
                      }}
                    >
                      Save
                    </button>
                    <button
                      className="cancel-btn-modern"
                      onClick={() => {
                        setEditingRestaurantName(false)
                        setRestaurantNameInput(userData.restaurantName)
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              {editingRestaurantName ? (
                <input
                  type="text"
                  value={restaurantNameInput}
                  onChange={(e) => setRestaurantNameInput(e.target.value)}
                  className="form-input-modern-profile"
                  autoFocus
                />
              ) : (
                <p className="profile-value">{userData.restaurantName}</p>
              )}
            </div>

            {/* Locations */}
            <div className="profile-card-modern">
              <div className="profile-card-header">
                <h3>Locations ({userData.locations?.length || 0})</h3>
                <button
                  className="add-btn-modern"
                  onClick={() => {
                    setNewLocation({
                      name: '',
                      displayName: '',
                      reservationLink: '',
                      logo: null,
                      logoPreview: null
                    })
                    setEditingLocation('new')
                  }}
                >
                  + Add Location
                </button>
              </div>

              {/* Add New Location Form */}
              {editingLocation === 'new' && (
                <div className="location-form-modern">
                  <div className="form-row-modern">
                    <div className="form-group-modern-profile">
                      <label>Location Name *</label>
                      <input
                        type="text"
                        value={newLocation.name}
                        onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value, displayName: e.target.value })}
                        className="form-input-modern-profile"
                        placeholder="e.g., Downtown Location"
                      />
                    </div>
                    <div className="form-group-modern-profile">
                      <label>Reservation Link *</label>
                      <input
                        type="url"
                        value={newLocation.reservationLink}
                        onChange={(e) => setNewLocation({ ...newLocation, reservationLink: e.target.value })}
                        className="form-input-modern-profile"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                  <div className="form-group-modern-profile">
                    <label>Logo</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onloadend = () => {
                            setNewLocation({
                              ...newLocation,
                              logo: file,
                              logoPreview: reader.result
                            })
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                      className="file-input-modern"
                    />
                    {newLocation.logoPreview && (
                      <div className="logo-preview-modern">
                        <img src={newLocation.logoPreview} alt="Preview" />
                      </div>
                    )}
                  </div>
                  <div className="form-actions-modern">
                    <button
                      className="save-btn-modern"
                      onClick={async () => {
                        try {
                          let logoUrl = null
                          let logoKey = null

                          if (newLocation.logo) {
                            const uploadResult = await uploadAPI.uploadLogo(newLocation.logo)
                            logoUrl = uploadResult.logoUrl
                            logoKey = uploadResult.logoKey
                          }

                          await restaurantAPI.addLocation({
                            name: newLocation.name.trim(),
                            displayName: newLocation.displayName || newLocation.name.trim(),
                            reservationLink: newLocation.reservationLink.trim(),
                            logoUrl,
                            logoKey
                          })

                          await fetchUserData()
                          setEditingLocation(null)
                          setNewLocation({
                            name: '',
                            displayName: '',
                            reservationLink: '',
                            logo: null,
                            logoPreview: null
                          })
                          setMessage('Location added successfully!')
                        } catch (error) {
                          console.error('Add location error:', error)
                          const errorMessage = error.message || error.response?.data?.message || 'Failed to add location'
                          const validationErrors = error.response?.data?.errors
                          if (validationErrors && Array.isArray(validationErrors)) {
                            setMessage(validationErrors.map(e => e.msg || e.message).join(', '))
                          } else {
                            setMessage(errorMessage)
                          }
                        }
                      }}
                    >
                      Add Location
                    </button>
                    <button
                      className="cancel-btn-modern"
                      onClick={() => {
                        setEditingLocation(null)
                        setNewLocation({
                          name: '',
                          displayName: '',
                          reservationLink: '',
                          logo: null,
                          logoPreview: null
                        })
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Existing Locations */}
              <div className="locations-list-modern">
                {userData.locations?.map((location, index) => (
                  <div key={location._id || location.id || index} className="location-card-modern">
                    {editingLocation === location._id || editingLocation === location.id ? (
                      <LocationEditForm
                        location={location}
                        onSave={async (updatedData) => {
                          try {
                            await restaurantAPI.updateLocation(location._id || location.id, updatedData)
                            await fetchUserData()
                            setEditingLocation(null)
                            setMessage('Location updated successfully!')
                          } catch (error) {
                            console.error('Update location error:', error)
                            const errorMessage = error.message || error.response?.data?.message || 'Failed to update location'
                            const validationErrors = error.response?.data?.errors
                            if (validationErrors && Array.isArray(validationErrors)) {
                              setMessage(validationErrors.map(e => e.msg || e.message).join(', '))
                            } else {
                              setMessage(errorMessage)
                            }
                          }
                        }}
                        onCancel={() => setEditingLocation(null)}
                      />
                    ) : (
                      <>
                        <div className="location-info-modern">
                          {location.logoUrl && (
                            <img src={location.logoUrl} alt={location.name} className="location-logo-small" />
                          )}
                          <div className="location-details">
                            <h4>{location.name}</h4>
                            <a href={location.reservationLink} target="_blank" rel="noopener noreferrer" className="location-link-modern">
                              {location.reservationLink}
                            </a>
                          </div>
                        </div>
                        <div className="location-actions">
                          <button
                            className="edit-btn-small"
                            onClick={() => setEditingLocation(location._id || location.id)}
                          >
                            Edit
                          </button>
                          {userData.locations.length > 1 && (
                            <button
                              className="delete-btn-small"
                              onClick={async () => {
                                if (window.confirm(`Delete ${location.name}?`)) {
                                  try {
                                    await restaurantAPI.deleteLocation(location._id || location.id)
                                    await fetchUserData()
                                    setMessage('Location deleted successfully!')
                                  } catch (error) {
                                    setMessage(error.message || 'Failed to delete location')
                                  }
                                }
                              }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {message && (
              <div className={`message-modern ${message.includes('successfully') ? 'success' : 'error'}`}>
                {message}
              </div>
            )}
          </div>
        )}

        <div className="admin-footer">
          <a href="/" className="back-link">← Back to Main Site</a>
        </div>
      </div>
    </div>

    {/* Call Credits Purchase Modal - Outside container */}
    {showCallCreditsModal && (
      <div 
        className="modal-overlay" 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          width: '100%',
          height: '100%'
        }} 
        onClick={() => {
          if (!processingPayment) {
            setShowCallCreditsModal(false)
            setCallCreditsAmount('')
          }
        }}
      >
        <div className="modal-content" style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '8px',
          maxWidth: '500px',
          width: '90%',
          zIndex: 10001,
          position: 'relative',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)'
        }} onClick={(e) => {
          e.stopPropagation()
        }}>
          <h2 style={{ marginTop: 0 }}>Purchase Call Credits</h2>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>
            Call credits cost $0.50 per call. Enter the amount you'd like to purchase.
          </p>
          <form onSubmit={async (e) => {
            e.preventDefault()
            e.stopPropagation()
            try {
              await handlePurchaseCallCredits(e)
            } catch (error) {
              console.error('Form submission error:', error)
            }
          }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Amount ($)
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={callCreditsAmount}
                onChange={(e) => setCallCreditsAmount(e.target.value)}
                placeholder="Enter amount (e.g., 10.00)"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '1rem'
                }}
                disabled={processingPayment}
                autoFocus
                required
              />
              {callCreditsAmount && parseFloat(callCreditsAmount) > 0 && (
                <p style={{ marginTop: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
                  You'll receive {Math.floor(parseFloat(callCreditsAmount) / 0.5)} call credits
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setShowCallCreditsModal(false)
                  setCallCreditsAmount('')
                }}
                disabled={processingPayment}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: '1px solid #ddd',
                  background: 'white',
                  borderRadius: '6px',
                  cursor: processingPayment ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processingPayment || !callCreditsAmount || parseFloat(callCreditsAmount) <= 0}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: processingPayment ? '#ccc' : '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: processingPayment || !callCreditsAmount || parseFloat(callCreditsAmount) <= 0 ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  opacity: processingPayment || !callCreditsAmount || parseFloat(callCreditsAmount) <= 0 ? 0.6 : 1
                }}
              >
                {processingPayment ? 'Processing...' : 'Purchase'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  )
}

// Location Edit Form Component
function LocationEditForm({ location, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: location.name,
    displayName: location.displayName,
    reservationLink: location.reservationLink,
    logo: null,
    logoPreview: location.logoUrl
  })
  const [uploading, setUploading] = useState(false)

  const handleLogoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData({
          ...formData,
          logo: file,
          logoPreview: reader.result
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    setUploading(true)
    try {
      let logoUrl = formData.logoPreview
      let logoKey = location.logoKey

      if (formData.logo) {
        const uploadResult = await uploadAPI.uploadLogo(formData.logo)
        logoUrl = uploadResult.logoUrl
        logoKey = uploadResult.logoKey
      }

      await onSave({
        name: formData.name.trim(),
        displayName: formData.displayName || formData.name.trim(),
        reservationLink: formData.reservationLink.trim(),
        logoUrl,
        logoKey
      })
    } catch (error) {
      console.error('Error saving location:', error)
      // Error is handled by parent component
      throw error
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="location-edit-form">
      <div className="form-row-modern">
        <div className="form-group-modern-profile">
          <label>Location Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value, displayName: e.target.value })}
            className="form-input-modern-profile"
          />
        </div>
        <div className="form-group-modern-profile">
          <label>Reservation Link *</label>
          <input
            type="url"
            value={formData.reservationLink}
            onChange={(e) => setFormData({ ...formData, reservationLink: e.target.value })}
            className="form-input-modern-profile"
          />
        </div>
      </div>
      <div className="form-group-modern-profile">
        <label>Logo</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleLogoChange}
          className="file-input-modern"
        />
        {formData.logoPreview && (
          <div className="logo-preview-modern">
            <img src={formData.logoPreview} alt="Preview" />
          </div>
        )}
      </div>
      <div className="form-actions-modern">
        <button
          className="save-btn-modern"
          onClick={handleSave}
          disabled={uploading}
        >
          {uploading ? 'Saving...' : 'Save'}
        </button>
        <button
          className="cancel-btn-modern"
          onClick={onCancel}
          disabled={uploading}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default RestaurantAdmin
