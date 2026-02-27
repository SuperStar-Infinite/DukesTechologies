import express from 'express'
import { body, validationResult } from 'express-validator'
import { authenticate, requireRestaurant } from '../middleware/auth.js'
import Code from '../models/Code.js'
import User from '../models/User.js'

const router = express.Router()

// @route   GET /api/codes/:code
// @desc    Get code by code string (public validation)
// @access  Public - must be defined BEFORE authenticate middleware
router.get('/:code', async (req, res) => {
  try {
    const code = await Code.findOne({ code: req.params.code.toUpperCase() })

    if (!code) {
      return res.status(404).json({ message: 'Code not found' })
    }

    // Get restaurant with locations
    const restaurant = await User.findById(code.restaurantId)
    
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' })
    }

    // Filter locations that match the code's location IDs
    const codeLocations = restaurant.locations.filter(loc => 
      code.locations.some(locId => {
        const locIdStr = locId.toString ? locId.toString() : String(locId)
        const locIdStr2 = loc._id.toString ? loc._id.toString() : String(loc._id)
        return locIdStr === locIdStr2
      })
    )

    res.json({
      code: code.code,
      discountDescription: code.discountDescription,
      expiresAt: code.expiresAt,
      restaurants: codeLocations.map(loc => ({
        id: loc._id.toString(),
        name: loc.name,
        displayName: loc.displayName,
        reservationLink: loc.reservationLink,
        logoUrl: loc.logoUrl || null
      }))
    })
  } catch (error) {
    console.error('Get code error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// All other routes require authentication
router.use(authenticate)

// @route   POST /api/codes
// @desc    Create new discount code
// @access  Private (Restaurant)
router.post('/', requireRestaurant, [
  body('discountDescription').notEmpty().trim(),
  body('peopleToCall').isInt({ min: 1 }),
  body('duration').isInt({ min: 1 }),
  body('durationUnit').isIn(['minutes', 'hours', 'days']),
  body('selectedLocations').isArray().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { discountDescription, peopleToCall, duration, durationUnit, selectedLocations } = req.body

    // Get user with fresh data
    const user = await User.findById(req.user._id)
    
    // Check if onboarded
    if (!user.onboarded) {
      return res.status(400).json({ message: 'Please complete onboarding first' })
    }

    // Reset monthly codes if needed
    user.resetMonthlyCodes()
    await user.save()

    // Check for available caller
    const codesPerCaller = 4
    const totalCodesAllowed = user.callers.length * codesPerCaller
    
    if (user.codesThisMonth >= totalCodesAllowed) {
      return res.status(400).json({ 
        message: `You have reached your monthly limit of ${totalCodesAllowed} codes` 
      })
    }

    // Update all caller statuses based on all codes first (to ensure accurate status)
    const now = new Date()
    const allCodes = await Code.find({ restaurantId: user._id })
    
    // TODO: TESTING MODE - Change back to 48 hours (48 * 60 * 60 * 1000) after testing
    const COOLING_PERIOD_MS = 10 * 60 * 1000 // 10 minutes for testing (normally 48 hours = 48 * 60 * 60 * 1000)

    // Process each caller to determine their correct status
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

    await user.save() // Save caller status updates

    // Now find an available caller (status must be 'available', not 'active' or 'cooling')
    const availableCaller = user.callers.find(caller => caller.status === 'available')

    if (!availableCaller) {
      return res.status(400).json({ 
        message: 'No available callers. All callers are currently active or in cooling period. Please wait for a caller to become available.' 
      })
    }

    // Validate locations
    const validLocations = selectedLocations.filter(locId => 
      user.locations.some(loc => loc._id.toString() === locId)
    )

    if (validLocations.length === 0) {
      return res.status(400).json({ message: 'Invalid location selection' })
    }

    // Calculate expiration
    const expiresAt = new Date()
    switch (durationUnit) {
      case 'days':
        expiresAt.setDate(expiresAt.getDate() + duration)
        break
      case 'hours':
        expiresAt.setHours(expiresAt.getHours() + duration)
        break
      case 'minutes':
        expiresAt.setMinutes(expiresAt.getMinutes() + duration)
        break
    }

    // Generate unique code
    let code
    let codeExists = true
    while (codeExists) {
      code = Math.random().toString(36).substring(2, 8).toUpperCase()
      codeExists = await Code.findOne({ code })
    }

    // Create code
    const newCode = new Code({
      code,
      restaurantId: user._id,
      discountDescription,
      expiresAt,
      locations: validLocations,
      callerId: availableCaller._id.toString(),
      peopleToCall
    })

    await newCode.save()

    // Update caller status to active
    availableCaller.status = 'active'
    availableCaller.lastCampaignEnd = null // Clear any previous cooling period
    user.codesThisMonth += 1
    await user.save()

    // Also update all caller statuses based on all codes (to ensure consistency)
    // Reuse 'allCodes' and 'now' variables already declared above
    // Refresh allCodes to include the newly created code
    const updatedAllCodes = await Code.find({ restaurantId: user._id })
    
    // Reset all callers to available first (except those we just set)
    for (const caller of user.callers) {
      if (caller._id.toString() !== availableCaller._id.toString()) {
        // Check if this caller has an active code
        const hasActiveCode = updatedAllCodes.some(c => 
          c.callerId?.toString() === caller._id.toString() && 
          new Date(c.expiresAt) > now
        )
        if (!hasActiveCode) {
          // Check if this caller has an expired code (should be cooling)
          const hasExpiredCode = updatedAllCodes.some(c => 
            c.callerId?.toString() === caller._id.toString() && 
            new Date(c.expiresAt) <= now
          )
          if (hasExpiredCode) {
            // Find the most recent expired code for this caller
            const expiredCodes = updatedAllCodes.filter(c => 
              c.callerId?.toString() === caller._id.toString() && 
              new Date(c.expiresAt) <= now
            )
            if (expiredCodes.length > 0) {
              const mostRecentExpired = expiredCodes.sort((a, b) => 
                new Date(b.expiresAt) - new Date(a.expiresAt)
              )[0]
              caller.status = 'cooling'
              caller.lastCampaignEnd = mostRecentExpired.expiresAt
            }
          } else {
            // No codes, check if cooling period is over
            if (caller.status === 'cooling' && caller.lastCampaignEnd) {
              const COOLING_PERIOD_MS = 10 * 60 * 1000 // 10 minutes for testing
              const msSince = now - new Date(caller.lastCampaignEnd)
              if (msSince >= COOLING_PERIOD_MS) {
                caller.status = 'available'
                caller.lastCampaignEnd = null
              }
            } else if (caller.status !== 'cooling') {
              caller.status = 'available'
            }
          }
        } else {
          // Has active code, set to active
          caller.status = 'active'
        }
      }
    }
    
    await user.save()

    res.status(201).json({
      message: `Code "${code}" created successfully`,
      code: {
        id: newCode._id,
        code: newCode.code,
        discountDescription: newCode.discountDescription,
        expiresAt: newCode.expiresAt,
        locations: newCode.locations,
        peopleToCall: newCode.peopleToCall
      }
    })
  } catch (error) {
    console.error('Create code error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   GET /api/codes
// @desc    Get all codes for restaurant
// @access  Private (Restaurant)
router.get('/', requireRestaurant, async (req, res) => {
  try {
    const codes = await Code.find({ restaurantId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('restaurantId', 'restaurantName email')

    res.json({ codes })
  } catch (error) {
    console.error('Get codes error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
