import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.js'

dotenv.config()

// Get email, password, and name from command line arguments
const email = process.argv[2]
const password = process.argv[3]
const name = process.argv[4] || 'Dukes Admin'

if (!email || !password) {
  console.error('❌ Usage: node scripts/create-admin.js <email> <password> [name]')
  console.error('Example: node scripts/create-admin.js admin@example.com MyPassword123 "Admin Name"')
  process.exit(1)
}

async function createAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/relay')
    console.log('✅ Connected to MongoDB')

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    
    if (existingUser) {
      console.error(`❌ User with email "${email}" already exists`)
      console.log(`   Type: ${existingUser.type}`)
      console.log(`   Name: ${existingUser.name}`)
      console.log(`   To change password, use: npm run change-password ${email} <new-password>`)
      process.exit(1)
    }

    // Create new admin user
    const admin = new User({
      email: email.toLowerCase(),
      password: password,
      name: name,
      type: 'dukes'
    })

    await admin.save()

    console.log(`✅ Super admin created successfully!`)
    console.log(`   Email: ${admin.email}`)
    console.log(`   Name: ${admin.name}`)
    console.log(`   Type: ${admin.type}`)
    console.log(`   Password: ${password}`)
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error creating admin:', error)
    process.exit(1)
  }
}

createAdmin()
