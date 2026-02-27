import mongoose from 'mongoose'

const codeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  discountDescription: {
    type: String,
    required: true,
    trim: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  locations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User.locations'
  }],
  callerId: {
    type: String,
    required: true
  },
  peopleToCall: {
    type: Number,
    required: true,
    min: 1
  },
  submissions: {
    type: Number,
    default: 0
  },
  totalRevenue: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
})

// Index for faster queries
codeSchema.index({ code: 1 })
codeSchema.index({ restaurantId: 1 })
codeSchema.index({ expiresAt: 1 })
codeSchema.index({ isActive: 1 })

// Virtual to check if code is expired
codeSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt
})

// Method to validate code
codeSchema.methods.validateCode = function() {
  if (!this.isActive) {
    return { valid: false, error: 'Code is not active' }
  }
  if (this.isExpired) {
    return { valid: false, error: 'Code has expired' }
  }
  return { valid: true }
}

// Method to log validation
codeSchema.methods.logValidation = async function(billAmount) {
  this.submissions += 1
  this.totalRevenue += parseFloat(billAmount) || 0
  await this.save()
}

const Code = mongoose.model('Code', codeSchema)

export default Code
