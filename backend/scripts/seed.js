import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.js'

dotenv.config()

const seedUsers = [
  {
    email: 'dukes@dukestechnologies.com',
    password: 'dukes123',
    name: 'Dukes Admin',
    type: 'dukes'
  },
  {
    email: 'admin@mortons.com',
    password: 'mortons123',
    name: 'Chad',
    type: 'restaurant',
    restaurantName: "MORTON'S THE STEAKHOUSE",
    onboarded: true,
    locations: [
      {
        name: "MORTON'S DOWNTOWN",
        displayName: "MORTON'S",
        reservationLink: 'https://www.mortons.com/reservations'
      },
      {
        name: "MORTON'S UPTOWN",
        displayName: "MORTON'S",
        reservationLink: 'https://www.mortons.com/reservations'
      }
    ],
    callers: [
      { status: 'available', lastCampaignEnd: null },
      { status: 'available', lastCampaignEnd: null }
    ]
  },
  {
    email: 'admin@jalexanders.com',
    password: 'jalexanders123',
    name: 'Alex',
    type: 'restaurant',
    restaurantName: "J. ALEXANDER'S",
    onboarded: true,
    locations: [
      {
        name: "J. ALEXANDER'S MAIN",
        displayName: "J. ALEXANDER'S",
        reservationLink: 'https://www.jalexanders.com/reservations'
      }
    ],
    callers: [
      { status: 'available', lastCampaignEnd: null }
    ]
  }
]

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/relay')
    console.log('✅ Connected to MongoDB')

    // Clear existing users
    await User.deleteMany({})
    console.log('🗑️  Cleared existing users')

    // Create users
    for (const userData of seedUsers) {
      const user = new User(userData)
      await user.save()
      console.log(`✅ Created user: ${user.email}`)
    }

    console.log('✅ Seeding completed!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Seeding error:', error)
    process.exit(1)
  }
}

seed()
