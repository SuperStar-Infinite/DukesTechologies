import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.js'

dotenv.config()

// Get email and new password from command line arguments
const email = process.argv[2]
const newPassword = process.argv[3]

if (!email || !newPassword) {
  console.error('❌ Usage: node scripts/change-password.js <email> <new-password>')
  console.error('Example: node scripts/change-password.js dukes@dukestechnologies.com MyNewPassword123')
  process.exit(1)
}

async function changePassword() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/relay')
    console.log('✅ Connected to MongoDB')

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() })
    
    if (!user) {
      console.error(`❌ User with email "${email}" not found`)
      process.exit(1)
    }

    console.log(`📧 Found user: ${user.email}`)
    console.log(`👤 Name: ${user.name}`)
    console.log(`🔑 Type: ${user.type}`)

    // Update password (will be automatically hashed by pre-save hook)
    user.password = newPassword
    await user.save()

    console.log(`✅ Password updated successfully for ${user.email}`)
    console.log(`🔐 New password: ${newPassword}`)
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error changing password:', error)
    process.exit(1)
  }
}

changePassword()
