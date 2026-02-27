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

const User = mongoose.model('User', userSchema)

export default User
