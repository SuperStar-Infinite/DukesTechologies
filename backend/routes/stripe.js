import express from 'express'
import Stripe from 'stripe'
import { authenticate, requireRestaurant } from '../middleware/auth.js'
import User from '../models/User.js'

const router = express.Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Plan configurations
const PLANS = {
  starter_monthly: {
    priceId: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
    amount: 30000, // $300 in cents
    callers: 1,
    campaignsPerMonth: 2,
    name: 'Starter (Monthly)'
  },
  starter_annual: {
    priceId: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID,
    amount: 360000, // $3,600 in cents
    callers: 1,
    campaignsPerMonth: 3,
    name: 'Starter (Annual)'
  },
  starter_annual_discount: {
    priceId: process.env.STRIPE_STARTER_ANNUAL_DISCOUNT_PRICE_ID,
    amount: 288000, // $2,880 in cents (20% off)
    callers: 1,
    campaignsPerMonth: 3,
    name: 'Starter (Annual - 20% Off)'
  },
  pro_monthly: {
    priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    amount: 45000, // $450 in cents
    callers: 2,
    campaignsPerMonth: 5,
    name: 'Pro (Monthly)'
  },
  pro_annual: {
    priceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
    amount: 540000, // $5,400 in cents
    callers: 2,
    campaignsPerMonth: 7,
    name: 'Pro (Annual)'
  },
  pro_annual_discount: {
    priceId: process.env.STRIPE_PRO_ANNUAL_DISCOUNT_PRICE_ID,
    amount: 432000, // $4,320 in cents (20% off)
    callers: 2,
    campaignsPerMonth: 7,
    name: 'Pro (Annual - 20% Off)'
  },
  advanced_monthly: {
    priceId: process.env.STRIPE_ADVANCED_MONTHLY_PRICE_ID,
    amount: 75000, // $750 in cents
    callers: 3,
    campaignsPerMonth: 10,
    name: 'Advanced (Monthly)'
  },
  advanced_annual: {
    priceId: process.env.STRIPE_ADVANCED_ANNUAL_PRICE_ID,
    amount: 900000, // $9,000 in cents
    callers: 3,
    campaignsPerMonth: 13,
    name: 'Advanced (Annual)'
  },
  advanced_annual_discount: {
    priceId: process.env.STRIPE_ADVANCED_ANNUAL_DISCOUNT_PRICE_ID,
    amount: 720000, // $7,200 in cents (20% off)
    callers: 3,
    campaignsPerMonth: 13,
    name: 'Advanced (Annual - 20% Off)'
  },
  unlimited_annual: {
    priceId: process.env.STRIPE_UNLIMITED_ANNUAL_PRICE_ID,
    amount: 1200000, // $12,000 in cents
    callers: 5,
    campaignsPerMonth: null, // unlimited
    name: 'Unlimited (Annual)'
  }
}

// @route   POST /api/stripe/create-checkout-session
// @desc    Create Stripe checkout session for subscription or call credits
// @access  Private (Restaurant)
router.post('/create-checkout-session', authenticate, requireRestaurant, async (req, res) => {
  try {
    const { planId, amount, type } = req.body

    // Handle call credits purchase
    if (type === 'call_credits' && amount) {
      const user = await User.findById(req.user._id)
      if (!user || !user.onboarded) {
        return res.status(400).json({ message: 'Please complete onboarding first' })
      }

      // Create or get Stripe customer
      let customerId = user.stripeCustomerId
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.restaurantName || user.name,
          metadata: {
            userId: user._id.toString()
          }
        })
        customerId = customer.id
        user.stripeCustomerId = customerId
        await user.save()
      }

      // Create checkout session for one-time payment
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Call Credits',
                description: `$${amount.toFixed(2)} in call credits (${Math.floor(amount / 0.5)} calls at $0.50 per call)`
              },
              unit_amount: Math.round(amount * 100) // Convert to cents
            },
            quantity: 1
          }
        ],
        success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/restaurant/admin?credits_success=true`,
        cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/restaurant/admin?credits_canceled=true`,
        metadata: {
          userId: user._id.toString(),
          type: 'call_credits',
          amount: amount.toString()
        }
      })

      return res.json({ sessionId: session.id, url: session.url })
    }

    // Handle subscription plans
    if (!planId || !PLANS[planId]) {
      return res.status(400).json({ message: 'Invalid plan ID' })
    }

    const user = await User.findById(req.user._id)
    if (!user || !user.onboarded) {
      return res.status(400).json({ message: 'Please complete onboarding first' })
    }

    const plan = PLANS[planId]

    // Create or get Stripe customer
    let customerId = user.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.restaurantName || user.name,
        metadata: {
          userId: user._id.toString()
        }
      })
      customerId = customer.id
      user.stripeCustomerId = customerId
      await user.save()
    }

    // For discount plans, use the regular annual price with a coupon
    // OR use the discount price if it's set up as a recurring subscription price
    let lineItems = [{ price: plan.priceId, quantity: 1 }]
    let discounts = []
    
    // Check if this is a discount plan
    if (planId.includes('_annual_discount')) {
      // Option 1: Use coupon (recommended approach)
      // Get the base annual plan ID (e.g., starter_annual from starter_annual_discount)
      const basePlanId = planId.replace('_annual_discount', '_annual')
      const basePlan = PLANS[basePlanId]
      
      if (basePlan && process.env.STRIPE_20_PERCENT_COUPON_ID) {
        // Use base price with coupon
        lineItems = [{ price: basePlan.priceId, quantity: 1 }]
        discounts = [{ coupon: process.env.STRIPE_20_PERCENT_COUPON_ID }]
      } else if (basePlan) {
        // Fallback: Use base price (coupon will be applied via Stripe Dashboard or webhook)
        lineItems = [{ price: basePlan.priceId, quantity: 1 }]
        console.warn(`No coupon ID found for ${planId}, using base price. Set STRIPE_20_PERCENT_COUPON_ID in .env`)
      }
      // If discount price is set up correctly as recurring, it will work with the original code above
    }

    // Create checkout session
    const sessionConfig = {
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription', // All plans are subscriptions
      line_items: lineItems,
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/restaurant/admin?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pricing?canceled=true`,
      metadata: {
        userId: user._id.toString(),
        planId: planId
      }
    }

    // Add discounts if using coupon approach
    if (discounts.length > 0) {
      sessionConfig.discounts = discounts
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)

    res.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error('Create checkout session error:', error)
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

// @route   POST /api/stripe/create-payment-intent
// @desc    Create payment intent for call credits
// @access  Private (Restaurant)
router.post('/create-payment-intent', authenticate, requireRestaurant, async (req, res) => {
  try {
    const { amount } = req.body // amount in dollars

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' })
    }

    const user = await User.findById(req.user._id)
    if (!user || !user.onboarded) {
      return res.status(400).json({ message: 'Please complete onboarding first' })
    }

    // Create or get Stripe customer
    let customerId = user.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.restaurantName || user.name,
        metadata: {
          userId: user._id.toString()
        }
      })
      customerId = customer.id
      user.stripeCustomerId = customerId
      await user.save()
    }

    // Create payment intent (amount in cents)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      customer: customerId,
      metadata: {
        userId: user._id.toString(),
        type: 'call_credits'
      }
    })

    res.json({ 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    })
  } catch (error) {
    console.error('Create payment intent error:', error)
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

// @route   POST /api/stripe/webhook
// @desc    Handle Stripe webhooks
// @access  Public (Stripe signature verification)
// Note: This route is handled directly in server.js before body parser middleware
// Keeping this here for reference, but it's not used (handled in server.js)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.metadata?.userId
        const planId = session.metadata?.planId

        if (userId && planId) {
          const user = await User.findById(userId)
          if (user) {
            // Get subscription details
            const subscription = await stripe.subscriptions.retrieve(session.subscription)
            
            user.stripeSubscriptionId = subscription.id
            user.subscriptionPlan = planId
            user.subscriptionStatus = subscription.status

            // Update callers based on plan
            const plan = PLANS[planId]
            if (plan) {
              const currentCallers = user.callers.length
              const targetCallers = plan.callers

              // Add or remove callers to match plan
              if (currentCallers < targetCallers) {
                for (let i = currentCallers; i < targetCallers; i++) {
                  user.callers.push({ status: 'available', lastCampaignEnd: null })
                }
              } else if (currentCallers > targetCallers) {
                // Remove excess callers (remove from end, but keep at least 1)
                const toRemove = currentCallers - targetCallers
                for (let i = 0; i < toRemove && user.callers.length > 1; i++) {
                  user.callers.pop()
                }
              }
            }

            // Offer end date is set in User model default (67 days from account creation)
            // No need to override it here

            await user.save()
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
            // Subscription canceled - revert to trial or free tier
            user.subscriptionPlan = 'trial'
            user.subscriptionStatus = 'trial'
            user.stripeSubscriptionId = null
            // Reset to 1 caller
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
            // Add call credits (amount is in cents, $0.50 per call = 50 cents)
            const creditsToAdd = Math.floor(paymentIntent.amount / 50) // Convert dollars to call credits
            user.callCredits += creditsToAdd
            await user.save()
          }
        }
        break
      }
    }

    res.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    res.status(500).json({ error: 'Webhook handler failed' })
  }
})

// @route   GET /api/stripe/plans
// @desc    Get all available plans
// @access  Public
router.get('/plans', (req, res) => {
  const plans = Object.entries(PLANS).map(([id, plan]) => ({
    id,
    name: plan.name,
    amount: plan.amount,
    callers: plan.callers,
    campaignsPerMonth: plan.campaignsPerMonth,
    isUnlimited: plan.campaignsPerMonth === null
  }))

  res.json({ plans })
})

// @route   GET /api/stripe/subscription
// @desc    Get current subscription status
// @access  Private (Restaurant)
router.get('/subscription', authenticate, requireRestaurant, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const limits = user.getPlanLimits()
    const isInTrial = user.isInTrial()
    const isInOfferWindow = user.isInOfferWindow()

    res.json({
      subscriptionPlan: user.subscriptionPlan,
      subscriptionStatus: user.subscriptionStatus,
      callCredits: user.callCredits,
      campaignsThisMonth: user.campaignsThisMonth,
      limits,
      isInTrial,
      isInOfferWindow,
      trialEndDate: user.trialEndDate,
      offerEndDate: user.offerEndDate,
      callers: user.callers.length
    })
  } catch (error) {
    console.error('Get subscription error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
