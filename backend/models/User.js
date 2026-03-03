import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const locationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  reservationLink: {
    type: String,
    required: true,
    trim: true
  },
  logoUrl: {
    type: String,
    default: null
  },
  logoKey: {
    type: String,
    default: null
  }
}, { _id: true })

const callerSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['available', 'active', 'cooling'],
    default: 'available'
  },
  lastCampaignEnd: {
    type: Date,
    default: null
  }
}, { _id: true })

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['restaurant', 'dukes'],
    required: true
  },
  // Restaurant-specific fields
  restaurantName: {
    type: String,
    default: ''
  },
  onboarded: {
    type: Boolean,
    default: false
  },
  locations: [locationSchema],
  callers: [callerSchema],
  codesThisMonth: {
    type: Number,
    default: 0
  },
  monthlyResetDate: {
    type: Date,
    default: () => {
      const now = new Date()
      return new Date(now.getFullYear(), now.getMonth() + 1, 1)
    }
  },
  // Stripe subscription fields
  stripeCustomerId: {
    type: String,
    default: null
  },
  stripeSubscriptionId: {
    type: String,
    default: null
  },
  subscriptionPlan: {
    type: String,
    enum: ['trial', 'starter_monthly', 'starter_annual', 'starter_annual_discount', 'pro_monthly', 'pro_annual', 'pro_annual_discount', 'advanced_monthly', 'advanced_annual', 'advanced_annual_discount', 'unlimited_annual'],
    default: 'trial'
  },
  subscriptionStatus: {
    type: String,
    enum: ['trial', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid'],
    default: 'trial'
  },
  trialStartDate: {
    type: Date,
    default: () => new Date()
  },
  trialEndDate: {
    type: Date,
    default: () => {
      const now = new Date()
      return new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000) // 60 days from now
    }
  },
  offerEndDate: {
    type: Date,
    default: function() {
      // 67 days from account creation for 20% off annual plans
      const now = new Date()
      return new Date(now.getTime() + 67 * 24 * 60 * 60 * 1000)
    }
  },
  // Call credits (in cents, $0.50 per call = 50 cents)
  // New users get 200 free calls = 200 * 50 cents = 10000 cents = $100
  callCredits: {
    type: Number,
    default: 10000, // 200 calls worth of credits
    min: 0
  },
  campaignsThisMonth: {
    type: Number,
    default: 0
  },
  campaignsMonthlyResetDate: {
    type: Date,
    default: () => {
      const now = new Date()
      return new Date(now.getFullYear(), now.getMonth() + 1, 1)
    }
  }
}, {
  timestamps: true
})

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  
  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Initialize default values for new restaurant users
userSchema.pre('save', async function(next) {
  // Only for new restaurant users
  if (this.isNew && this.type === 'restaurant') {
    // Initialize 2 callers for new restaurant users
    if (!this.callers || this.callers.length === 0) {
      this.callers = [
        { status: 'available', lastCampaignEnd: null },
        { status: 'available', lastCampaignEnd: null }
      ]
    }
    // Ensure callCredits is set to default (200 free calls = 10000 cents)
    if (this.callCredits === undefined || this.callCredits === null) {
      this.callCredits = 10000
    }
  }
  next()
})

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

// Reset monthly codes counter
userSchema.methods.resetMonthlyCodes = function() {
  const now = new Date()
  if (now >= this.monthlyResetDate) {
    this.codesThisMonth = 0
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    this.monthlyResetDate = nextMonth
    return true
  }
  return false
}

// Reset monthly campaigns counter
userSchema.methods.resetMonthlyCampaigns = function() {
  const now = new Date()
  if (now >= this.campaignsMonthlyResetDate) {
    this.campaignsThisMonth = 0
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    this.campaignsMonthlyResetDate = nextMonth
    return true
  }
  return false
}

// Get plan limits
userSchema.methods.getPlanLimits = function() {
  const limits = {
    callers: 1,
    campaignsPerMonth: null, // null = unlimited
    isUnlimited: false
  }

  if (this.subscriptionStatus === 'trial' || this.subscriptionPlan === 'trial') {
    limits.callers = 2 // Trial users get 2 free callers
    limits.campaignsPerMonth = null // unlimited during trial
    limits.isUnlimited = true
    return limits
  }

  switch (this.subscriptionPlan) {
    case 'starter_monthly':
      limits.callers = 1
      limits.campaignsPerMonth = 2
      break
    case 'starter_annual':
    case 'starter_annual_discount':
      limits.callers = 1
      limits.campaignsPerMonth = 3
      break
    case 'pro_monthly':
      limits.callers = 2
      limits.campaignsPerMonth = 5
      break
    case 'pro_annual':
    case 'pro_annual_discount':
      limits.callers = 2
      limits.campaignsPerMonth = 7
      break
    case 'advanced_monthly':
      limits.callers = 3
      limits.campaignsPerMonth = 10
      break
    case 'advanced_annual':
    case 'advanced_annual_discount':
      limits.callers = 3
      limits.campaignsPerMonth = 13
      break
    case 'unlimited_annual':
      limits.callers = 5
      limits.campaignsPerMonth = null
      limits.isUnlimited = true
      break
    default:
      limits.callers = 1
      limits.campaignsPerMonth = null
      limits.isUnlimited = true
  }

  return limits
}

// Check if user is in trial period
userSchema.methods.isInTrial = function() {
  if (this.subscriptionPlan !== 'trial' && this.subscriptionStatus !== 'trial') {
    return false
  }
  const now = new Date()
  return now < this.trialEndDate
}

// Check if user is in 67-day offer window (for 20% off annual plans)
userSchema.methods.isInOfferWindow = function() {
  if (!this.offerEndDate) return false
  const now = new Date()
  return now <= this.offerEndDate
}

const User = mongoose.model('User', userSchema)

export default User
