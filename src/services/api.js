// API service for connecting to backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Helper function to get auth token
const getToken = () => {
  return sessionStorage.getItem('token')
}

// Helper function to set auth token
const setToken = (token) => {
  sessionStorage.setItem('token', token)
}

// Helper function to remove auth token
const removeToken = () => {
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('currentUser')
}

// Generic API request function
const apiRequest = async (endpoint, options = {}) => {
  const token = getToken()
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    },
    ...options
  }

  // Remove Content-Type for FormData
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type']
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config)
    
    // Read response as text first (can only read once)
    const text = await response.text()
    
    let data
    // Try to parse as JSON
    try {
      data = text ? JSON.parse(text) : {}
    } catch (e) {
      // Not JSON, create error with text
      if (!response.ok) {
        const error = new Error(text || 'API request failed')
        error.response = { status: response.status, data: { message: text } }
        throw error
      }
      // If OK but not JSON, return text as message
      data = { message: text }
    }

    if (!response.ok) {
      const error = new Error(data.message || data.error || 'API request failed')
      error.response = { data, status: response.status }
      throw error
    }

    return data
  } catch (error) {
    console.error('API Error:', error)
    // If it's already our error object, throw it as is
    if (error.response) {
      throw error
    }
    // Otherwise wrap it
    throw new Error(error.message || 'Network error')
  }
}

// Auth API
export const authAPI = {
  login: async (email, password) => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
    
    if (data.token) {
      setToken(data.token)
      sessionStorage.setItem('currentUser', JSON.stringify(data.user))
    }
    
    return data
  },

  register: async (email, password, name, type = 'restaurant') => {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, type })
    })
    
    if (data.token) {
      setToken(data.token)
      sessionStorage.setItem('currentUser', JSON.stringify(data.user))
    }
    
    return data
  },

  getCurrentUser: async () => {
    return apiRequest('/auth/me')
  },

  logout: () => {
    removeToken()
  },

  forgotPassword: async (email) => {
    return apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    })
  },

  resetPassword: async (token, password) => {
    return apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password })
    })
  }
}

// Code API
export const codeAPI = {
  create: async (codeData) => {
    return apiRequest('/codes', {
      method: 'POST',
      body: JSON.stringify(codeData)
    })
  },

  getAll: async (hoursAgo, expiredOnly) => {
    const params = new URLSearchParams()
    if (hoursAgo) params.append('hoursAgo', hoursAgo)
    if (expiredOnly !== undefined) params.append('expiredOnly', expiredOnly)
    const queryString = params.toString()
    return apiRequest(`/codes${queryString ? '?' + queryString : ''}`)
  },

  getByCode: async (code) => {
    return apiRequest(`/codes/${code}`)
  },

  deleteExpired: async () => {
    return apiRequest('/codes/expired', {
      method: 'DELETE'
    })
  },

  delete: async (codeId) => {
    return apiRequest(`/codes/${codeId}`, {
      method: 'DELETE'
    })
  }
}

// Server Validation API
export const serverAPI = {
  validate: async (code, billAmount) => {
    return apiRequest('/server/validate', {
      method: 'POST',
      body: JSON.stringify({ code, billAmount })
    })
  }
}

// Restaurant API
export const restaurantAPI = {
  completeOnboarding: async (onboardingData) => {
    return apiRequest('/restaurants/onboarding', {
      method: 'POST',
      body: JSON.stringify(onboardingData)
    })
  },

  getProfile: async () => {
    return apiRequest('/restaurants/profile')
  },

  updateProfile: async (profileData) => {
    return apiRequest('/restaurants/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    })
  },

  addLocation: async (locationData) => {
    return apiRequest('/restaurants/locations', {
      method: 'POST',
      body: JSON.stringify(locationData)
    })
  },

  updateLocation: async (locationId, locationData) => {
    return apiRequest(`/restaurants/locations/${locationId}`, {
      method: 'PUT',
      body: JSON.stringify(locationData)
    })
  },

  deleteLocation: async (locationId) => {
    return apiRequest(`/restaurants/locations/${locationId}`, {
      method: 'DELETE'
    })
  },

  testResetCaller: async (callerId, hoursAgo) => {
    return apiRequest(`/restaurants/callers/${callerId}/test-reset`, {
      method: 'POST',
      body: JSON.stringify({ hoursAgo })
    })
  }
}

// Upload API
export const uploadAPI = {
  uploadLogo: async (file) => {
    const formData = new FormData()
    formData.append('logo', file)

    return apiRequest('/upload/logo', {
      method: 'POST',
      body: formData
    })
  },

  deleteLogo: async (logoKey) => {
    return apiRequest('/upload/logo', {
      method: 'DELETE',
      body: JSON.stringify({ logoKey })
    })
  }
}

// Dukes API
export const dukesAPI = {
  getAllRestaurants: async () => {
    return apiRequest('/dukes/restaurants')
  },

  getRestaurantCodes: async (restaurantId) => {
    return apiRequest(`/dukes/restaurants/${restaurantId}/codes`)
  },

  getAllCodes: async (hoursAgo, expiredOnly, restaurantId) => {
    const params = new URLSearchParams()
    if (hoursAgo) params.append('hoursAgo', hoursAgo)
    if (expiredOnly !== undefined) params.append('expiredOnly', expiredOnly)
    if (restaurantId) params.append('restaurantId', restaurantId)
    const queryString = params.toString()
    return apiRequest(`/dukes/codes${queryString ? '?' + queryString : ''}`)
  },

  deleteExpiredCodes: async () => {
    return apiRequest('/dukes/codes/expired', {
      method: 'DELETE'
    })
  },

  updatePeopleOnList: async (restaurantId, peopleOnList) => {
    return apiRequest(`/dukes/restaurants/${restaurantId}/people-on-list`, {
      method: 'PUT',
      body: JSON.stringify({ peopleOnList })
    })
  }
}

// Stripe API
export const stripeAPI = {
  getPlans: async () => {
    return apiRequest('/stripe/plans')
  },

  createCheckoutSession: async (planId, amount) => {
    const body = typeof planId === 'string' && planId === 'call_credits' && amount
      ? { type: 'call_credits', amount }
      : { planId }
    return apiRequest('/stripe/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify(body)
    })
  },

  createPaymentIntent: async (amount) => {
    return apiRequest('/stripe/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ amount })
    })
  },

  getSubscription: async () => {
    return apiRequest('/stripe/subscription')
  }
}

export { getToken, setToken, removeToken }
