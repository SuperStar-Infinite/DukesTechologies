import express from 'express'
import { body, validationResult } from 'express-validator'
import { authenticate, requireRestaurant } from '../middleware/auth.js'
import User from '../models/User.js'
import Code from '../models/Code.js'

const router = express.Router()

// All routes require authentication
router.use(authenticate)
router.use(requireRestaurant)

// @route   POST /api/restaurants/onboarding
// @desc    Complete restaurant onboarding
// @access  Private (Restaurant)
router.post('/onboarding', [
  body('restaurantName').notEmpty().trim(),
  body('locations').isArray().notEmpty(),
  body('locations.*.name').notEmpty().trim(),
  body('locations.*.displayName').notEmpty().trim(),
  body('locations.*.reservationLink').notEmpty().trim(),
  body('locations.*.logoUrl').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array())
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      })
    }

    // Manual URL validation for reservation links
    const { restaurantName, locations } = req.body
    
    if (!locations || locations.length === 0) {
      return res.status(400).json({ message: 'At least one location is required' })
    }

    for (let i = 0; i < locations.length; i++) {
      const loc = locations[i]
      if (!loc.reservationLink || !loc.reservationLink.trim()) {
        return res.status(400).json({ 
          message: `Reservation link is required for location ${i + 1}` 
        })
      }
      
      try {
        new URL(loc.reservationLink.trim())
      } catch (e) {
        return res.status(400).json({ 
          message: `Invalid reservation link for location ${i + 1}: "${loc.reservationLink}". Please include http:// or https://` 
        })
      }

      // Validate logoUrl if provided (should be a valid URL or null)
      if (loc.logoUrl && loc.logoUrl.trim()) {
        try {
          new URL(loc.logoUrl.trim())
        } catch (e) {
          console.warn(`Invalid logo URL for location ${i + 1}, setting to null`)
          loc.logoUrl = null
        }
      }
    }

    const user = await User.findById(req.user._id)
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    
    if (user.onboarded) {
      return res.status(400).json({ message: 'Already onboarded' })
    }

    // Update user
    user.restaurantName = restaurantName
    user.locations = locations.map(loc => ({
      name: loc.name,
      displayName: loc.displayName,
      reservationLink: loc.reservationLink,
      logoUrl: loc.logoUrl || null,
      logoKey: loc.logoKey || null
    }))
    
    // Initialize callers (default 2 callers for new users)
    if (user.callers.length === 0) {
      user.callers = [
        { status: 'available', lastCampaignEnd: null },
        { status: 'available', lastCampaignEnd: null }
      ]
    }
    
    user.onboarded = true
    await user.save()

    res.json({
      message: 'Onboarding completed successfully',
      user: {
        id: user._id,
        restaurantName: user.restaurantName,
        onboarded: user.onboarded,
        locations: user.locations
      }
    })
  } catch (error) {
    console.error('Onboarding error:', error)
    res.status(500).json({ 
      message: error.message || 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// @route   PUT /api/restaurants/profile
// @desc    Update restaurant profile (name only)
// @access  Private (Restaurant)
router.put('/profile', [
  body('restaurantName').optional().notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { restaurantName } = req.body

    const user = await User.findById(req.user._id)
    
    if (!user.onboarded) {
      return res.status(400).json({ message: 'Please complete onboarding first' })
    }

    if (restaurantName) {
      user.restaurantName = restaurantName
      await user.save()
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        restaurantName: user.restaurantName,
        locations: user.locations
      }
    })
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   POST /api/restaurants/locations
// @desc    Add new location
// @access  Private (Restaurant)
router.post('/locations', [
  body('name').notEmpty().trim(),
  body('reservationLink').notEmpty().trim(),
  body('logoUrl').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array())
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      })
    }

    const { name, displayName, reservationLink, logoUrl, logoKey } = req.body

    // Validate reservation link URL
    if (!reservationLink || !reservationLink.trim()) {
      return res.status(400).json({ message: 'Reservation link is required' })
    }

    try {
      new URL(reservationLink.trim())
    } catch (e) {
      return res.status(400).json({ 
        message: `Invalid reservation link: "${reservationLink}". Please include http:// or https://` 
      })
    }

    // Validate logoUrl if provided
    if (logoUrl && logoUrl.trim()) {
      try {
        new URL(logoUrl.trim())
      } catch (e) {
        console.warn('Invalid logo URL, setting to null')
        logoUrl = null
      }
    }

    const user = await User.findById(req.user._id)
    
    if (!user.onboarded) {
      return res.status(400).json({ message: 'Please complete onboarding first' })
    }

    // Use displayName if provided, otherwise use name
    const finalDisplayName = displayName || name

    // Add new location
    user.locations.push({
      name: name.trim(),
      displayName: finalDisplayName.trim(),
      reservationLink: reservationLink.trim(),
      logoUrl: logoUrl || null,
      logoKey: logoKey || null
    })

    await user.save()

    res.json({
      message: 'Location added successfully',
      location: user.locations[user.locations.length - 1]
    })
  } catch (error) {
    console.error('Add location error:', error)
    res.status(500).json({ 
      message: error.message || 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// @route   PUT /api/restaurants/locations/:locationId
// @desc    Update location
// @access  Private (Restaurant)
router.put('/locations/:locationId', [
  body('name').optional().notEmpty().trim(),
  body('displayName').optional().notEmpty().trim(),
  body('reservationLink').optional().notEmpty().trim(),
  body('logoUrl').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array())
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      })
    }

    const { locationId } = req.params
    let { name, displayName, reservationLink, logoUrl, logoKey } = req.body

    const user = await User.findById(req.user._id)
    
    if (!user.onboarded) {
      return res.status(400).json({ message: 'Please complete onboarding first' })
    }

    const location = user.locations.id(locationId)
    if (!location) {
      return res.status(404).json({ message: 'Location not found' })
    }

    // Validate reservation link if provided
    if (reservationLink !== undefined) {
      if (!reservationLink || !reservationLink.trim()) {
        return res.status(400).json({ message: 'Reservation link cannot be empty' })
      }
      try {
        new URL(reservationLink.trim())
      } catch (e) {
        return res.status(400).json({ 
          message: `Invalid reservation link: "${reservationLink}". Please include http:// or https://` 
        })
      }
    }

    // Validate logoUrl if provided
    if (logoUrl !== undefined && logoUrl && logoUrl.trim()) {
      try {
        new URL(logoUrl.trim())
      } catch (e) {
        console.warn('Invalid logo URL, setting to null')
        logoUrl = null
      }
    }

    if (name) location.name = name.trim()
    if (displayName) {
      location.displayName = displayName.trim()
    } else if (name) {
      // If name changed but displayName not provided, update displayName to match
      location.displayName = name.trim()
    }
    if (reservationLink) location.reservationLink = reservationLink.trim()
    if (logoUrl !== undefined) location.logoUrl = logoUrl || null
    if (logoKey !== undefined) location.logoKey = logoKey || null

    await user.save()

    res.json({
      message: 'Location updated successfully',
      location
    })
  } catch (error) {
    console.error('Update location error:', error)
    res.status(500).json({ 
      message: error.message || 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// @route   DELETE /api/restaurants/locations/:locationId
// @desc    Delete location
// @access  Private (Restaurant)
router.delete('/locations/:locationId', async (req, res) => {
  try {
    const { locationId } = req.params

    const user = await User.findById(req.user._id)
    
    if (!user.onboarded) {
      return res.status(400).json({ message: 'Please complete onboarding first' })
    }

    if (user.locations.length <= 1) {
      return res.status(400).json({ message: 'Cannot delete last location. You must have at least one location.' })
    }

    const location = user.locations.id(locationId)
    if (!location) {
      return res.status(404).json({ message: 'Location not found' })
    }

    user.locations.pull(locationId)
    await user.save()

    res.json({
      message: 'Location deleted successfully'
    })
  } catch (error) {
    console.error('Delete location error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Helper function to update caller status based on expired codes
async function updateCallerStatusFromExpiredCodes(userId) {
  const user = await User.findById(userId)
  
  if (!user || !user.onboarded) return user

  const now = new Date()
  
  // Find all codes for this restaurant
  const allCodes = await Code.find({
    restaurantId: userId
  })

  // 72 hour cooldown period
  const COOLING_PERIOD_MS = 72 * 60 * 60 * 1000 // 72 hours

  // Process each caller
  for (const caller of user.callers) {
    const callerId = caller._id.toString()
    
    // Find all codes for this caller
    const callerCodes = allCodes.filter(code => code.callerId?.toString() === callerId)
    
    if (callerCodes.length === 0) {
      // No codes assigned - check if cooling period is over
      if (caller.status === 'cooling' && caller.lastCampaignEnd) {
        const msSince = now - new Date(caller.lastCampaignEnd)
        if (msSince >= COOLING_PERIOD_MS) {
          caller.status = 'available'
          caller.lastCampaignEnd = null
        }
      } else if (caller.status !== 'cooling') {
        caller.status = 'available'
      }
      continue
    }

    // Check for active codes (not expired)
    const activeCodes = callerCodes.filter(code => new Date(code.expiresAt) > now)
    if (activeCodes.length > 0) {
      // Has active code(s) - set to active
      caller.status = 'active'
      caller.lastCampaignEnd = null
      continue
    }

    // No active codes - check for expired codes
    const expiredCodes = callerCodes.filter(code => new Date(code.expiresAt) <= now)
    if (expiredCodes.length > 0) {
      // Has expired code(s) - should be in cooling period
      // Find the most recent expired code
      const mostRecentExpired = expiredCodes.sort((a, b) => 
        new Date(b.expiresAt) - new Date(a.expiresAt)
      )[0]
      
      // Set to cooling with lastCampaignEnd = most recent expiration
      caller.status = 'cooling'
      caller.lastCampaignEnd = mostRecentExpired.expiresAt
      
      // Check if cooling period is over
      const msSince = now - new Date(caller.lastCampaignEnd)
      if (msSince >= COOLING_PERIOD_MS) {
        caller.status = 'available'
        caller.lastCampaignEnd = null
      }
    }
  }

  await user.save()
  return user
}

// @route   GET /api/restaurants/profile
// @desc    Get restaurant profile
// @access  Private (Restaurant)
router.get('/profile', async (req, res) => {
  try {
    // Update caller status based on expired codes before returning
    const user = await updateCallerStatusFromExpiredCodes(req.user._id)
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json({ user })
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   POST /api/restaurants/callers/:callerId/test-reset
// @desc    Reset caller for testing (development only)
// @access  Private (Restaurant)
router.post('/callers/:callerId/test-reset', async (req, res) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ message: 'This endpoint is only available in development mode' })
    }

    const { callerId } = req.params
    const { hoursAgo } = req.body // Optional: set lastCampaignEnd to X hours ago

    const user = await User.findById(req.user._id)
    
    if (!user.onboarded) {
      return res.status(400).json({ message: 'Please complete onboarding first' })
    }

    const caller = user.callers.id(callerId)
    if (!caller) {
      return res.status(404).json({ message: 'Caller not found' })
    }

    if (hoursAgo !== undefined) {
      // Set lastCampaignEnd to X hours ago
      const now = new Date()
      const hoursAgoMs = parseFloat(hoursAgo) * 60 * 60 * 1000
      caller.lastCampaignEnd = new Date(now - hoursAgoMs)
      caller.status = 'cooling'
    } else {
      // Reset to available
      caller.status = 'available'
      caller.lastCampaignEnd = null
    }

    await user.save()

    res.json({
      message: 'Caller reset successfully',
      caller: {
        id: caller._id,
        status: caller.status,
        lastCampaignEnd: caller.lastCampaignEnd,
        hoursSinceLastCampaign: caller.lastCampaignEnd 
          ? ((new Date() - new Date(caller.lastCampaignEnd)) / (1000 * 60 * 60)).toFixed(2)
          : null
      }
    })
  } catch (error) {
    console.error('Test reset caller error:', error)
    res.status(500).json({ 
      message: error.message || 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

export default router
