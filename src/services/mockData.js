// Mock data service - will be replaced with API calls later

// Mock users
export const mockUsers = {
  'dukes@dukestechnologies.com': {
    email: 'dukes@dukestechnologies.com',
    password: 'dukes123',
    type: 'dukes',
    name: 'Dukes Admin'
  },
  'admin@mortons.com': {
    email: 'admin@mortons.com',
    password: 'mortons123',
    type: 'restaurant',
    name: 'Chad',
    restaurantName: "MORTON'S THE STEAKHOUSE",
    onboarded: true,
    locations: [
      {
        id: '1',
        name: "MORTON'S DOWNTOWN",
        displayName: "MORTON'S",
        reservationLink: 'https://www.mortons.com/reservations',
        logo: 'mortons'
      },
      {
        id: '2',
        name: "MORTON'S UPTOWN",
        displayName: "MORTON'S",
        reservationLink: 'https://www.mortons.com/reservations',
        logo: 'mortons'
      }
    ],
    callers: [
      { id: '1', status: 'available', lastCampaignEnd: null },
      { id: '2', status: 'available', lastCampaignEnd: null }
    ],
    codesThisMonth: 2
  },
  'admin@jalexanders.com': {
    email: 'admin@jalexanders.com',
    password: 'jalexanders123',
    type: 'restaurant',
    name: 'Alex',
    restaurantName: "J. ALEXANDER'S",
    onboarded: true,
    locations: [
      {
        id: '3',
        name: "J. ALEXANDER'S MAIN",
        displayName: "J. ALEXANDER'S",
        reservationLink: 'https://www.jalexanders.com/reservations',
        logo: 'jalexanders'
      }
    ],
    callers: [
      { id: '3', status: 'available', lastCampaignEnd: null }
    ],
    codesThisMonth: 1
  },
  'new@restaurant.com': {
    email: 'new@restaurant.com',
    password: 'newrest123',
    type: 'restaurant',
    name: 'New Restaurant',
    restaurantName: '',
    onboarded: false,
    locations: [],
    callers: [],
    codesThisMonth: 0
  }
}

// Mock codes
export const mockCodes = {
  'ABYTXE': {
    code: 'ABYTXE',
    restaurantId: 'admin@mortons.com',
    discountDescription: '2 FREE GLASSES OF WINE EACH GLASS MUST BE UNDER $20',
    expiresAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 35 * 60 * 60 * 1000 + 13 * 60 * 1000),
    locations: ['1', '2'],
    callerId: '1',
    peopleToCall: 500,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    submissions: 23,
    totalRevenue: 1345.00
  },
  'DUKE30': {
    code: 'DUKE30',
    restaurantId: 'admin@jalexanders.com',
    discountDescription: '30% OFF YOUR ENTIRE BILL',
    expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Expired
    locations: ['3'],
    callerId: '3',
    peopleToCall: 200,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    submissions: 45,
    totalRevenue: 2890.50
  }
}

// Get code data
export const getCodeData = (code) => {
  const codeData = mockCodes[code?.toUpperCase()]
  if (!codeData) return null

  const restaurant = mockUsers[codeData.restaurantId]
  if (!restaurant) return null

  const restaurants = codeData.locations.map(locId => {
    const location = restaurant.locations.find(l => l.id === locId)
    return location
  }).filter(Boolean)

  return {
    ...codeData,
    restaurants
  }
}

// Validate code for server
export const validateCodeForServer = (code, billAmount) => {
  const codeData = getCodeData(code)
  if (!codeData) {
    return { valid: false, error: 'Invalid discount code' }
  }

  if (new Date() > new Date(codeData.expiresAt)) {
    return { valid: false, error: 'This discount code has expired' }
  }

  // Log validation (in real app, this would be sent to backend)
  // For now, just update mock data
  if (mockCodes[code.toUpperCase()]) {
    mockCodes[code.toUpperCase()].submissions += 1
    mockCodes[code.toUpperCase()].totalRevenue += parseFloat(billAmount)
  }

  return { valid: true, codeData }
}

// Get all codes for a restaurant
export const getRestaurantCodes = (restaurantId) => {
  return Object.values(mockCodes).filter(code => code.restaurantId === restaurantId)
}

// Get all codes for Dukes view
export const getAllCodes = () => {
  return Object.values(mockCodes).map(code => {
    const restaurant = mockUsers[code.restaurantId]
    return {
      ...code,
      restaurantName: restaurant?.restaurantName || 'Unknown'
    }
  })
}

// Get all restaurants for Dukes view
export const getAllRestaurants = () => {
  return Object.values(mockUsers).filter(user => user.type === 'restaurant' && user.onboarded)
}
