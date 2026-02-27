import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { restaurantAPI, uploadAPI } from '../services/api'
import '../styles/RestaurantOnboarding.css'

function RestaurantOnboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [restaurantName, setRestaurantName] = useState('')
  const [locations, setLocations] = useState([
    { name: '', reservationLink: '', logo: null, logoPreview: null }
  ])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAddLocation = () => {
    setLocations([...locations, { name: '', reservationLink: '', logo: null, logoPreview: null }])
  }

  const handleRemoveLocation = (index) => {
    if (locations.length > 1) {
      setLocations(locations.filter((_, i) => i !== index))
    }
  }

  const handleLocationChange = (index, field, value) => {
    const updated = [...locations]
    updated[index][field] = value
    setLocations(updated)
  }

  const handleLogoUpload = (index, e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const updated = [...locations]
        updated[index].logo = file
        updated[index].logoPreview = reader.result
        setLocations(updated)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleStep1Submit = (e) => {
    e.preventDefault()
    if (!restaurantName.trim()) {
      setError('Please enter your restaurant name')
      return
    }
    setError('')
    setStep(2)
  }

  const handleStep2Submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    // Validate all locations
    for (let i = 0; i < locations.length; i++) {
      const loc = locations[i]
      if (!loc.name.trim()) {
        setError(`Please enter a name for location ${i + 1}`)
        setLoading(false)
        return
      }
      if (!loc.reservationLink.trim()) {
        setError(`Please enter a reservation link for location ${i + 1}`)
        setLoading(false)
        return
      }
      if (!loc.logo) {
        setError(`Please upload a logo for location ${i + 1}`)
        setLoading(false)
        return
      }
    }

    try {
      // Upload logos and prepare locations data
      const locationsData = await Promise.all(
        locations.map(async (loc, index) => {
          try {
            // Upload logo to R2
            const uploadResult = await uploadAPI.uploadLogo(loc.logo)
            
            return {
              name: loc.name.trim(),
              displayName: loc.name.trim(), // You can customize this
              reservationLink: loc.reservationLink.trim(),
              logoUrl: uploadResult.logoUrl,
              logoKey: uploadResult.logoKey
            }
          } catch (uploadError) {
            console.error(`Logo upload error for location ${index + 1}:`, uploadError)
            throw new Error(`Failed to upload logo for location ${index + 1}: ${uploadError.message || 'Upload failed'}`)
          }
        })
      )

      // Complete onboarding
      await restaurantAPI.completeOnboarding({
        restaurantName: restaurantName.trim(),
        locations: locationsData
      })

      // Update current user
      const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}')
      currentUser.onboarded = true
      sessionStorage.setItem('currentUser', JSON.stringify(currentUser))
      
      navigate('/restaurant/admin')
    } catch (error) {
      console.error('Onboarding error:', error)
      const errorMessage = error.message || error.response?.data?.message || 'Failed to complete onboarding'
      const validationErrors = error.response?.data?.errors
      if (validationErrors && Array.isArray(validationErrors)) {
        setError(validationErrors.map(e => e.msg || e.message).join(', '))
      } else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="onboarding-container">
      <div className="onboarding-content">
        <h1 className="onboarding-title">RELAY SETUP</h1>
        <p className="powered-by">POWERED BY DUKES TECHNOLOGIES</p>

        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="onboarding-form">
            <h2>Step 1: Restaurant Information</h2>
            <div className="form-group">
              <label htmlFor="restaurantName">Restaurant Name *</label>
              <input
                type="text"
                id="restaurantName"
                value={restaurantName}
                onChange={(e) => {
                  setRestaurantName(e.target.value)
                  setError('')
                }}
                className="form-input"
                placeholder="Enter your restaurant name"
                required
                autoFocus
              />
            </div>

            {error && <p className="error-message">{error}</p>}

            <button type="submit" className="submit-button-onboarding" disabled={loading}>
              {loading ? 'PROCESSING...' : 'CONTINUE'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="onboarding-form">
            <h2>Step 2: Add Locations</h2>
            <p className="form-help-text">Add at least one location with reservation link and logo</p>

            {locations.map((location, index) => (
              <div key={index} className="location-form">
                <div className="location-header">
                  <h3>Location {index + 1}</h3>
                  {locations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLocation(index)}
                      className="remove-location-btn"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="form-group">
                  <label>Location Name *</label>
                  <input
                    type="text"
                    value={location.name}
                    onChange={(e) => handleLocationChange(index, 'name', e.target.value)}
                    className="form-input"
                    placeholder="e.g., Downtown Location"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Reservation Link *</label>
                  <input
                    type="url"
                    value={location.reservationLink}
                    onChange={(e) => handleLocationChange(index, 'reservationLink', e.target.value)}
                    className="form-input"
                    placeholder="https://www.restaurant.com/reservations"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Logo *</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleLogoUpload(index, e)}
                    className="file-input"
                    required
                  />
                  {location.logoPreview && (
                    <div className="logo-preview">
                      <img src={location.logoPreview} alt="Logo preview" />
                    </div>
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddLocation}
              className="add-location-btn"
            >
              + Add Another Location
            </button>

            {error && <p className="error-message">{error}</p>}

            <div className="form-actions">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="back-button-onboarding"
              >
                BACK
              </button>
              <button type="submit" className="submit-button-onboarding" disabled={loading}>
                {loading ? 'SAVING...' : 'COMPLETE SETUP'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default RestaurantOnboarding
