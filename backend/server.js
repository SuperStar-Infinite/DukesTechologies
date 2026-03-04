import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import codeRoutes from './routes/codes.js'
import restaurantRoutes from './routes/restaurants.js'
import serverValidationRoutes from './routes/serverValidation.js'
import dukesRoutes from './routes/dukes.js'
import uploadRoutes from './routes/upload.js'
import stripeRoutes from './routes/stripe.js'
import Code from './models/Code.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Security middleware
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
})
app.use('/api/', limiter)

// Test endpoint to verify webhook route is accessible
app.get('/api/stripe/webhook/test', (req, res) => {
  res.json({ 
    message: 'Webhook endpoint is accessible',
    webhookSecretConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
    stripeSecretConfigured: !!process.env.STRIPE_SECRET_KEY
  })
})

// Stripe webhook route must be before body parser (needs raw body)
// We'll register it directly here, then import stripe routes for other endpoints
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  // Defer to the stripe router's webhook handler
  // We need to import it dynamically to avoid circular dependencies
  try {
    const stripeModule = await import('./routes/stripe.js')
    // The webhook is handled in the stripe router, but we need to call it here
    // Since it's already set up with express.raw(), we'll handle it inline
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const User = (await import('./models/User.js')).default
    
    const sig = req.headers['stripe-signature']
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    let event
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message)
      return res.status(400).send(`Webhook Error: ${err.message}`)
    }

    // Handle webhook events
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object
          const userId = session.metadata?.userId
          const planId = session.metadata?.planId
          const sessionType = session.metadata?.type

          // Handle call credits purchase (payment mode)
          if (session.mode === 'payment' && sessionType === 'call_credits') {
            const amount = parseFloat(session.metadata?.amount || '0')
            if (userId && amount > 0) {
              const user = await User.findById(userId)
              if (user) {
                // Store credits in cents (amount in dollars * 100)
                // $10 = 1000 cents = 20 calls worth ($0.50 per call)
                const creditsToAdd = Math.floor(amount * 100)
                user.callCredits += creditsToAdd
                await user.save()
              } else {
                console.error('User not found for call credits:', userId)
              }
            } else {
              console.error('Invalid call credits purchase data:', { userId, amount })
            }
            break
          }

          // Handle subscription purchase
          if (userId && planId) {
            const user = await User.findById(userId)
            if (user) {
              // Get subscription if it exists
              if (session.subscription) {
                try {
                  const subscription = await stripe.subscriptions.retrieve(session.subscription)
                  user.stripeSubscriptionId = subscription.id
                  user.subscriptionPlan = planId
                  user.subscriptionStatus = subscription.status
                } catch (subError) {
                  console.error('Error retrieving subscription:', subError)
                  // Still update plan even if subscription retrieval fails
                  user.subscriptionPlan = planId
                  user.subscriptionStatus = 'active'
                }
              } else {
                // If no subscription ID, still update the plan
                user.subscriptionPlan = planId
                user.subscriptionStatus = 'active'
              }

              // Update callers based on plan
              const PLANS = {
                starter_monthly: { callers: 1 },
                starter_annual: { callers: 1 },
                starter_annual_discount: { callers: 1 },
                pro_monthly: { callers: 2 },
                pro_annual: { callers: 2 },
                pro_annual_discount: { callers: 2 },
                advanced_monthly: { callers: 3 },
                advanced_annual: { callers: 3 },
                advanced_annual_discount: { callers: 3 },
                unlimited_annual: { callers: 5 }
              }
              const plan = PLANS[planId]
              if (plan) {
                const currentCallers = user.callers.length
                const targetCallers = plan.callers
                if (currentCallers < targetCallers) {
                  for (let i = currentCallers; i < targetCallers; i++) {
                    user.callers.push({ status: 'available', lastCampaignEnd: null })
                  }
                } else if (currentCallers > targetCallers) {
                  const toRemove = currentCallers - targetCallers
                  for (let i = 0; i < toRemove && user.callers.length > 1; i++) {
                    user.callers.pop()
                  }
                }
              }

              // User is purchasing a subscription, so they're leaving trial
              // Don't set offer end date - they're now on a paid plan

              await user.save()
            } else {
              console.error('User not found:', userId)
            }
          }
          break
        }
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const subscription = event.data.object
          const customerId = subscription.customer
          const user = await User.findOne({ stripeCustomerId: customerId })
          if (user) {
            if (event.type === 'customer.subscription.deleted') {
              user.subscriptionPlan = 'trial'
              user.subscriptionStatus = 'trial'
              user.stripeSubscriptionId = null
              while (user.callers.length > 1) {
                user.callers.pop()
              }
            } else {
              user.subscriptionStatus = subscription.status
              user.stripeSubscriptionId = subscription.id
            }
            await user.save()
          }
          break
        }
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object
          const userId = paymentIntent.metadata?.userId
          if (userId && paymentIntent.metadata?.type === 'call_credits') {
            const user = await User.findById(userId)
            if (user) {
              // paymentIntent.amount is already in cents, so use it directly
              const creditsToAdd = paymentIntent.amount
              user.callCredits += creditsToAdd
              await user.save()
            } else {
              console.error('User not found for payment intent:', userId)
            }
          }
          break
        }
      }
      res.json({ received: true })
    } catch (error) {
      console.error('Webhook handler error:', error)
      console.error('Error stack:', error.stack)
      res.status(500).json({ error: 'Webhook handler failed', message: error.message })
    }
  } catch (error) {
    console.error('Webhook processing error:', error)
    console.error('Error stack:', error.stack)
    res.status(500).json({ error: 'Webhook processing failed', message: error.message })
  }
})

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/codes', codeRoutes)
app.use('/api/restaurants', restaurantRoutes)
app.use('/api/server', serverValidationRoutes)
app.use('/api/dukes', dukesRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/stripe', stripeRoutes)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/relay', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ Connected to MongoDB')
  
  // Auto-delete expired codes (expired more than 60 days ago) - runs daily
  const deleteOldExpiredCodes = async () => {
    try {
      const now = new Date()
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
      
      const result = await Code.deleteMany({
        expiresAt: { $lt: sixtyDaysAgo }
      })
      
      if (result.deletedCount > 0) {
        console.log(`🗑️  Auto-deleted ${result.deletedCount} expired code(s) (expired more than 60 days ago)`)
      }
    } catch (error) {
      console.error('❌ Error auto-deleting expired codes:', error)
    }
  }
  
  // Run immediately on startup, then daily
  deleteOldExpiredCodes()
  setInterval(deleteOldExpiredCodes, 24 * 60 * 60 * 1000) // Run every 24 hours
  
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`)
  })
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error)
  process.exit(1)
})

export default app
