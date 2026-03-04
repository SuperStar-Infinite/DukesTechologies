import express from 'express'
import jwt from 'jsonwebtoken'
import { body, validationResult } from 'express-validator'
import User from '../models/User.js'
import { sendPasswordResetEmail } from '../utils/email.js'

const router = express.Router()

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  })
}

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { email, password } = req.body

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    // Reset monthly codes if needed
    user.resetMonthlyCodes()
    await user.save()

    const token = generateToken(user._id)

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        type: user.type,
        restaurantName: user.restaurantName,
        onboarded: user.onboarded
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   POST /api/auth/register
// @desc    Register new user (public for restaurants, Dukes can also register)
// @access  Public
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty().trim(),
  body('type').isIn(['restaurant', 'dukes']).optional()
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { email, password, name, type } = req.body

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' })
    }

    // Default to restaurant type if not specified (public signup is for restaurants)
    const userType = type || 'restaurant'

    // Create user
    const user = new User({
      email: email.toLowerCase(),
      password,
      name,
      type: userType
    })

    await user.save()

    const token = generateToken(user._id)

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        type: user.type,
        onboarded: user.onboarded
      }
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.userId).select('-password')
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' })
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        type: user.type,
        restaurantName: user.restaurantName,
        onboarded: user.onboarded,
        locations: user.locations,
        callers: user.callers,
        codesThisMonth: user.codesThisMonth
      }
    })
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' })
  }
})

// @route   POST /api/auth/forgot-password
// @desc    Request password reset (sends reset token via email)
// @access  Public
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { email } = req.body
    const user = await User.findOne({ email: email.toLowerCase() })

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ 
        message: 'If an account exists with that email, a password reset link has been sent.' 
      })
    }

    // Generate reset token
    const resetToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1h' // Token expires in 1 hour
    })

    user.resetPasswordToken = resetToken
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    await user.save()

    // Send password reset email
    const emailResult = await sendPasswordResetEmail(user.email, resetToken)

    // In development mode, also return the token for testing
    const response = { 
      message: 'If an account exists with that email, a password reset link has been sent.'
    }

    if (process.env.NODE_ENV === 'development' || emailResult.method === 'console') {
      response.resetToken = resetToken
      response.emailSent = emailResult.method === 'email'
    }

    res.json(response)
  } catch (error) {
    console.error('Forgot password error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', [
  body('token').notEmpty(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { token, password } = req.body

    // Verify token
    let decoded
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch (error) {
      return res.status(400).json({ message: 'Invalid or expired reset token' })
    }

    const user = await User.findOne({
      _id: decoded.userId,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    })

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' })
    }

    // Update password
    user.password = password
    user.resetPasswordToken = null
    user.resetPasswordExpires = null
    await user.save()

    res.json({ message: 'Password reset successfully. You can now login with your new password.' })
  } catch (error) {
    console.error('Reset password error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
