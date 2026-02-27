import mongoose from 'mongoose'

const validationLogSchema = new mongoose.Schema({
  codeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Code',
    required: true
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  locationId: {
    type: String,
    default: null
  },
  billAmount: {
    type: Number,
    required: true,
    min: 0
  },
  validatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

// Index for faster queries
validationLogSchema.index({ codeId: 1 })
validationLogSchema.index({ restaurantId: 1 })
validationLogSchema.index({ validatedAt: -1 })

const ValidationLog = mongoose.model('ValidationLog', validationLogSchema)

export default ValidationLog
