import express from 'express'
import { authenticate, requireDukes } from '../middleware/auth.js'
import User from '../models/User.js'
import Code from '../models/Code.js'

const router = express.Router()

// All routes require Dukes admin
router.use(authenticate)
router.use(requireDukes)

// @route   GET /api/dukes/restaurants
// @desc    Get all restaurants with stats
// @access  Private (Dukes)
router.get('/restaurants', async (req, res) => {
  try {
    const restaurants = await User.find({ type: 'restaurant', onboarded: true })
      .select('-password')
      .sort({ createdAt: -1 })

    // Get stats for each restaurant
    const restaurantsWithStats = await Promise.all(
      restaurants.map(async (restaurant) => {
        const codes = await Code.find({ restaurantId: restaurant._id })
        
        const activeCodes = codes.filter(c => 
          c.isActive && new Date() < c.expiresAt
        ).length
        
        const totalRevenue = codes.reduce((sum, c) => sum + (c.totalRevenue || 0), 0)
        const totalSubmissions = codes.reduce((sum, c) => sum + (c.submissions || 0), 0)

        return {
          ...restaurant.toObject(),
          stats: {
            activeCodes,
            totalCodes: codes.length,
            totalRevenue,
            totalSubmissions
          }
        }
      })
    )

    res.json({ restaurants: restaurantsWithStats })
  } catch (error) {
    console.error('Get restaurants error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   GET /api/dukes/restaurants/:id/codes
// @desc    Get all codes for a restaurant
// @access  Private (Dukes)
router.get('/restaurants/:id/codes', async (req, res) => {
  try {
    const codes = await Code.find({ restaurantId: req.params.id })
      .populate('restaurantId', 'restaurantName email')
      .sort({ createdAt: -1 })

    res.json({ codes })
  } catch (error) {
    console.error('Get restaurant codes error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   GET /api/dukes/codes
// @desc    Get all codes across all restaurants
// @access  Private (Dukes)
router.get('/codes', async (req, res) => {
  try {
    const codes = await Code.find()
      .populate('restaurantId', 'restaurantName email')
      .sort({ createdAt: -1 })

    res.json({ codes })
  } catch (error) {
    console.error('Get all codes error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   PUT /api/dukes/restaurants/:id/people-on-list
// @desc    Update people on list for a restaurant
// @access  Private (Dukes)
router.put('/restaurants/:id/people-on-list', async (req, res) => {
  try {
    const { peopleOnList } = req.body

    if (peopleOnList !== undefined && (typeof peopleOnList !== 'number' || peopleOnList < 0)) {
      return res.status(400).json({ message: 'peopleOnList must be a non-negative number or null' })
    }

    const restaurant = await User.findById(req.params.id)
    
    if (!restaurant || restaurant.type !== 'restaurant') {
      return res.status(404).json({ message: 'Restaurant not found' })
    }

    restaurant.peopleOnList = peopleOnList === null || peopleOnList === '' ? null : peopleOnList
    await restaurant.save()

    res.json({
      message: 'People on list updated successfully',
      restaurant: {
        id: restaurant._id,
        restaurantName: restaurant.restaurantName,
        peopleOnList: restaurant.peopleOnList
      }
    })
  } catch (error) {
    console.error('Update people on list error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
