import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { stripeAPI } from '../services/api'
import '../styles/Pricing.css'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51T5ursCFQaWcDS8Sq1JyDrT8IE9vPDXtcsBF9xLLUdJFpcWU8UK3R2CUj3FOzMEigoyhBzrxBtVvW6x62ntmaL400g4QxZv6W')

const PLANS_CONFIG = {
  starter_monthly: {
    name: 'Starter',
    billing: 'Monthly',
    price: 300,
    priceAnnual: null,
    callers: 1,
    campaignsPerMonth: 2,
    costPerCampaign: 150
  },
  starter_annual: {
    name: 'Starter',
    billing: 'Annual',
    price: 3600,
    priceAnnual: null,
    callers: 1,
    campaignsPerMonth: 3,
    costPerCampaign: 100
  },
  starter_annual_discount: {
    name: 'Starter',
    billing: 'Annual (20% Off)',
    price: 2880,
    priceAnnual: null,
    callers: 1,
    campaignsPerMonth: 3,
    costPerCampaign: 80
  },
  pro_monthly: {
    name: 'Pro',
    billing: 'Monthly',
    price: 450,
    priceAnnual: null,
    callers: 2,
    campaignsPerMonth: 5,
    costPerCampaign: 90
  },
  pro_annual: {
    name: 'Pro',
    billing: 'Annual',
    price: 5400,
    priceAnnual: null,
    callers: 2,
    campaignsPerMonth: 7,
    costPerCampaign: 64.29
  },
  pro_annual_discount: {
    name: 'Pro',
    billing: 'Annual (20% Off)',
    price: 4320,
    priceAnnual: null,
    callers: 2,
    campaignsPerMonth: 7,
    costPerCampaign: 51.43
  },
  advanced_monthly: {
    name: 'Advanced',
    billing: 'Monthly',
    price: 750,
    priceAnnual: null,
    callers: 3,
    campaignsPerMonth: 10,
    costPerCampaign: 75
  },
  advanced_annual: {
    name: 'Advanced',
    billing: 'Annual',
    price: 9000,
    priceAnnual: null,
    callers: 3,
    campaignsPerMonth: 13,
    costPerCampaign: 57.69
  },
  advanced_annual_discount: {
    name: 'Advanced',
    billing: 'Annual (20% Off)',
    price: 7200,
    priceAnnual: null,
    callers: 3,
    campaignsPerMonth: 13,
    costPerCampaign: 46.15
  },
  unlimited_annual: {
    name: 'Unlimited',
    billing: 'Annual',
    price: 12000,
    priceAnnual: null,
    callers: 5,
    campaignsPerMonth: null, // unlimited
    costPerCampaign: null
  }
}

function Pricing() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isInOfferWindow, setIsInOfferWindow] = useState(false)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    // Fetch subscription data to check offer window
    const fetchSubscriptionData = async () => {
      try {
        const data = await stripeAPI.getSubscription()
        setIsInOfferWindow(data.isInOfferWindow || false)
      } catch (error) {
        // User might not be logged in, that's okay
        console.error('Error fetching subscription data:', error)
      }
    }
    fetchSubscriptionData()

    // Check for success/cancel from Stripe
    if (searchParams.get('success') === 'true') {
      // Redirect to admin after successful payment
      setTimeout(() => {
        navigate('/restaurant/admin')
      }, 2000)
    }
  }, [searchParams, navigate])

  const handleSubscribe = async (planId) => {
    setLoading(true)
    setError('')

    try {
      const { sessionId, url } = await stripeAPI.createCheckoutSession(planId)
      
      if (url) {
        // Redirect to Stripe Checkout
        window.location.href = url
      } else {
        setError('Failed to create checkout session')
        setLoading(false)
      }
    } catch (err) {
      setError(err.message || 'Failed to start checkout')
      setLoading(false)
    }
  }

  // Filter discount plans based on offer window
  const getGroupedPlans = () => {
    const basePlans = [
      {
        name: 'Starter',
        plans: isInOfferWindow 
          ? ['starter_monthly', 'starter_annual', 'starter_annual_discount']
          : ['starter_monthly', 'starter_annual']
      },
      {
        name: 'Pro',
        plans: isInOfferWindow
          ? ['pro_monthly', 'pro_annual', 'pro_annual_discount']
          : ['pro_monthly', 'pro_annual']
      },
      {
        name: 'Advanced',
        plans: isInOfferWindow
          ? ['advanced_monthly', 'advanced_annual', 'advanced_annual_discount']
          : ['advanced_monthly', 'advanced_annual']
      },
      {
        name: 'Unlimited',
        plans: ['unlimited_annual']
      }
    ]
    return basePlans
  }

  const groupedPlans = getGroupedPlans()

  return (
    <div className="pricing-container">
      <div className="pricing-header">
        <h1>Choose Your Plan</h1>
        <p>All plans include call credits at $0.50 per call</p>
      </div>

      {error && <div className="pricing-error">{error}</div>}

      {searchParams.get('success') === 'true' && (
        <div className="pricing-success">
          Payment successful! Redirecting to your admin panel...
        </div>
      )}

      {searchParams.get('canceled') === 'true' && (
        <div className="pricing-info">
          Payment was canceled. You can try again anytime.
        </div>
      )}

      <div className="pricing-grid">
        {groupedPlans.map((group) => (
          <div key={group.name} className="plan-group">
            <h2 className="plan-group-title">{group.name}</h2>
            <div className="plan-cards">
              {group.plans.map((planId) => {
                const plan = PLANS_CONFIG[planId]
                if (!plan) return null

                return (
                  <div key={planId} className="plan-card">
                    <div className="plan-header">
                      <h3>{plan.name}</h3>
                      <p className="plan-billing">{plan.billing}</p>
                    </div>
                    
                    <div className="plan-price">
                      <span className="price-amount">${plan.price.toLocaleString()}</span>
                      <span className="price-period">
                        {plan.billing.includes('Monthly') ? '/mo' : '/yr'}
                      </span>
                    </div>

                    <div className="plan-features">
                      <div className="feature">
                        <span className="feature-label">Callers:</span>
                        <span className="feature-value">{plan.callers}</span>
                      </div>
                      <div className="feature">
                        <span className="feature-label">Campaigns/month:</span>
                        <span className="feature-value">
                          {plan.campaignsPerMonth === null ? 'Unlimited' : plan.campaignsPerMonth}
                        </span>
                      </div>
                      {plan.costPerCampaign !== null && (
                        <div className="feature highlight">
                          <span className="feature-label">Cost per campaign:</span>
                          <span className="feature-value">${plan.costPerCampaign.toFixed(2)}</span>
                        </div>
                      )}
                      {plan.costPerCampaign === null && (
                        <div className="feature highlight">
                          <span className="feature-label">Cost per campaign:</span>
                          <span className="feature-value">Depends on usage</span>
                        </div>
                      )}
                    </div>

                    <button
                      className="plan-button"
                      onClick={() => handleSubscribe(planId)}
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : 'Subscribe'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="pricing-footer">
        <p>
          <strong>60-Day Free Trial:</strong> New customers get 60 days to run unlimited campaigns with 2 callers and 200 free calls.
        </p>
        <p>
          <strong>67-Day Special Offer:</strong> Get 20% off annual plans for 67 days from account creation!
        </p>
      </div>
    </div>
  )
}

export default Pricing
