import express from 'express'
import { body, validationResult } from 'express-validator'
import Code from '../models/Code.js'
import ValidationLog from '../models/ValidationLog.js'

const router = express.Router()

// @route   POST /api/server/validate
// @desc    Validate code and log submission (public - no auth required)
// @access  Public
router.post('/validate', [
  body('code').notEmpty().trim(),
  body('billAmount').isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { code, billAmount } = req.body

    const codeDoc = await Code.findOne({ code: code.toUpperCase() })
      .populate('restaurantId', 'restaurantName locations')

    if (!codeDoc) {
      return res.status(404).json({ message: 'Invalid discount code' })
    }

    // Validate code
    const validation = codeDoc.validateCode()
    if (!validation.valid) {
      return res.status(400).json({ message: validation.error })
    }

    // Log validation
    await codeDoc.logValidation(billAmount)

    // Create validation log
    await ValidationLog.create({
      codeId: codeDoc._id,
      restaurantId: codeDoc.restaurantId._id,
      billAmount: parseFloat(billAmount),
      validatedAt: new Date()
    })

    // Get restaurant locations for this code
    const restaurant = codeDoc.restaurantId
    const codeLocations = restaurant.locations.filter(loc => 
      codeDoc.locations.some(locId => locId.toString() === loc._id.toString())
    )

    res.json({
      valid: true,
      code: codeDoc.code,
      discountDescription: codeDoc.discountDescription,
      expiresAt: codeDoc.expiresAt,
      restaurants: codeLocations.map(loc => ({
        id: loc._id,
        name: loc.name,
        displayName: loc.displayName,
        reservationLink: loc.reservationLink,
        logoUrl: loc.logoUrl
      }))
    })
  } catch (error) {
    console.error('Validation error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
