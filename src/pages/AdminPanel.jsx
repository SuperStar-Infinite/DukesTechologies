import { useState } from 'react'
import '../styles/AdminPanel.css'

function AdminPanel() {
  const [formData, setFormData] = useState({
    code: '',
    duration: '',
    durationUnit: 'days',
    restaurant: '',
    reservationLink: '',
    restaurantName: '',
    restaurantDisplayName: ''
  })

  const [restaurants, setRestaurants] = useState([
    { id: '1', name: "MORTON'S THE STEAKHOUSE", displayName: "MORTON'S" },
    { id: '2', name: "J. ALEXANDER'S", displayName: "J. ALEXANDER'S" }
  ])

  const [createdCodes, setCreatedCodes] = useState([])
  const [message, setMessage] = useState('')

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleRestaurantSelect = (e) => {
    const restaurantId = e.target.value
    const restaurant = restaurants.find(r => r.id === restaurantId)
    
    if (restaurant) {
      setFormData(prev => ({
        ...prev,
        restaurant: restaurantId,
        restaurantName: restaurant.name,
        restaurantDisplayName: restaurant.displayName
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        restaurant: '',
        restaurantName: '',
        restaurantDisplayName: ''
      }))
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setMessage('')

    // Validation
    if (!formData.code.trim()) {
      setMessage('Please enter a discount code')
      return
    }

    if (!formData.duration || parseInt(formData.duration) <= 0) {
      setMessage('Please enter a valid duration')
      return
    }

    if (!formData.restaurant) {
      setMessage('Please select a restaurant')
      return
    }

    if (!formData.reservationLink.trim()) {
      setMessage('Please enter a reservation link')
      return
    }

    // Calculate expiration date
    const duration = parseInt(formData.duration)
    const now = new Date()
    let expiresAt = new Date(now)

    switch (formData.durationUnit) {
      case 'days':
        expiresAt.setDate(now.getDate() + duration)
        break
      case 'hours':
        expiresAt.setHours(now.getHours() + duration)
        break
      case 'minutes':
        expiresAt.setMinutes(now.getMinutes() + duration)
        break
      default:
        expiresAt.setDate(now.getDate() + duration)
    }

    // Create code object (in real app, this would be sent to backend)
    const newCode = {
      code: formData.code.toUpperCase(),
      duration: `${formData.duration} ${formData.durationUnit}`,
      expiresAt: expiresAt.toISOString(),
      restaurant: {
        id: formData.restaurant,
        name: formData.restaurantName,
        displayName: formData.restaurantDisplayName,
        reservationLink: formData.reservationLink
      },
      createdAt: new Date().toISOString()
    }

    setCreatedCodes(prev => [newCode, ...prev])
    setMessage(`Code "${newCode.code}" created successfully!`)
    
    // Reset form
    setFormData({
      code: '',
      duration: '',
      durationUnit: 'days',
      restaurant: '',
      reservationLink: '',
      restaurantName: '',
      restaurantDisplayName: ''
    })
  }

  return (
    <div className="admin-container">
      <div className="admin-content">
        <h1 className="admin-title">RELAY ADMIN PANEL</h1>
        <p className="powered-by">POWERED BY DUKES TECHNOLOGIES</p>

        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label htmlFor="code">Discount Code *</label>
            <input
              type="text"
              id="code"
              name="code"
              value={formData.code}
              onChange={handleInputChange}
              placeholder="Enter discount code (e.g., ABYTXE)"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="duration">Duration *</label>
            <div className="duration-input-group">
              <input
                type="number"
                id="duration"
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                placeholder="3"
                className="form-input duration-input"
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

          <div className="form-group">
            <label htmlFor="restaurant">Restaurant *</label>
            <select
              id="restaurant"
              name="restaurant"
              value={formData.restaurant}
              onChange={handleRestaurantSelect}
              className="form-select"
              required
            >
              <option value="">Select a restaurant</option>
              {restaurants.map(restaurant => (
                <option key={restaurant.id} value={restaurant.id}>
                  {restaurant.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="reservationLink">Reservation Link *</label>
            <input
              type="url"
              id="reservationLink"
              name="reservationLink"
              value={formData.reservationLink}
              onChange={handleInputChange}
              placeholder="https://www.restaurant.com/reservations"
              className="form-input"
              required
            />
          </div>

          {message && (
            <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}

          <button type="submit" className="submit-button-admin">
            CREATE CODE
          </button>
        </form>

        {createdCodes.length > 0 && (
          <div className="codes-list">
            <h2>Created Codes</h2>
            <div className="codes-grid">
              {createdCodes.map((code, index) => (
                <div key={index} className="code-card">
                  <div className="code-card-header">
                    <strong>{code.code}</strong>
                  </div>
                  <div className="code-card-body">
                    <p><strong>Duration:</strong> {code.duration}</p>
                    <p><strong>Restaurant:</strong> {code.restaurant.displayName}</p>
                    <p><strong>Expires:</strong> {new Date(code.expiresAt).toLocaleString()}</p>
                    <a 
                      href={code.restaurant.reservationLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="code-link"
                    >
                      View Reservation Link
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="admin-footer">
          <a href="/" className="back-link">← Back to Main Site</a>
        </div>
      </div>
    </div>
  )
}

export default AdminPanel
