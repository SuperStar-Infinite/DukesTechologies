import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.js'

dotenv.config()

// Get option from command line
const option = process.argv[2] // 'all' or specific email

async function resetStripeCustomers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/relay')
    console.log('✅ Connected to MongoDB')

    let users
    if (option === 'all') {
      // Reset all users
      users = await User.find({ stripeCustomerId: { $ne: null } })
      console.log(`📋 Found ${users.length} user(s) with Stripe customer IDs`)
    } else if (option && option.includes('@')) {
      // Reset specific user by email
      const user = await User.findOne({ email: option.toLowerCase() })
      if (!user) {
        console.error(`❌ User with email "${option}" not found`)
        process.exit(1)
      }
      users = [user]
      console.log(`📋 Found user: ${user.email}`)
    } else {
      console.error('❌ Usage: node scripts/reset-stripe-customers.js <all|email>')
      console.error('Example: node scripts/reset-stripe-customers.js all')
      console.error('Example: node scripts/reset-stripe-customers.js user@example.com')
      process.exit(1)
    }

    if (users.length === 0) {
      console.log('ℹ️  No users with Stripe customer IDs found')
      process.exit(0)
    }

    // Reset Stripe customer IDs
    for (const user of users) {
      const oldCustomerId = user.stripeCustomerId
      user.stripeCustomerId = null
      user.stripeSubscriptionId = null
      // Optionally reset subscription status to trial
      // user.subscriptionPlan = 'trial'
      // user.subscriptionStatus = 'trial'
      await user.save()
      console.log(`✅ Reset Stripe data for ${user.email} (old customer ID: ${oldCustomerId})`)
    }

    console.log(`\n✅ Successfully reset Stripe customer IDs for ${users.length} user(s)`)
    console.log('ℹ️  New Stripe customers will be created automatically when users make purchases')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error resetting Stripe customers:', error)
    process.exit(1)
  }
}

resetStripeCustomers()
