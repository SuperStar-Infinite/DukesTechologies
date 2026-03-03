# Stripe Integration Summary

## ✅ Completed Implementation

### 1. Backend Setup
- ✅ Installed Stripe SDK (`stripe` package)
- ✅ Created Stripe routes (`backend/routes/stripe.js`)
- ✅ Updated User model with subscription fields:
  - `stripeCustomerId`, `stripeSubscriptionId`
  - `subscriptionPlan`, `subscriptionStatus`
  - `trialStartDate`, `trialEndDate`, `offerEndDate`
  - `callCredits` (in cents)
  - `campaignsThisMonth`, `campaignsMonthlyResetDate`
- ✅ Added plan limit methods to User model
- ✅ Webhook handler configured (handled in `server.js` before body parser)

### 2. Pricing Plans
All plans configured with:
- **Starter**: 1 caller
  - Monthly: $300/mo, 2 campaigns/mo → $150/campaign
  - Annual: $3,600/yr, 3 campaigns/mo → $100/campaign
  - Annual (20% off): $2,880/yr, 3 campaigns/mo → $80/campaign
- **Pro**: 2 callers
  - Monthly: $450/mo, 5 campaigns/mo → $90/campaign
  - Annual: $5,400/yr, 7 campaigns/mo → $64.29/campaign
  - Annual (20% off): $4,320/yr, 7 campaigns/mo → $51.43/campaign
- **Advanced**: 3 callers
  - Monthly: $750/mo, 10 campaigns/mo → $75/campaign
  - Annual: $9,000/yr, 13 campaigns/mo → $57.69/campaign
  - Annual (20% off): $7,200/yr, 13 campaigns/mo → $46.15/campaign
- **Unlimited**: 5 callers, Annual only
  - Annual: $12,000/yr, Unlimited campaigns

### 3. Trial Period
- ✅ 60-day free trial (no credit card required)
- ✅ 1 caller during trial
- ✅ Unlimited campaigns during trial
- ✅ Trial period tracked in User model

### 4. 7-Day Offer Window
- ✅ After 60-day trial, 7-day window for 20% off annual plans
- ✅ Notification displayed on admin page
- ✅ Offer end date tracked in User model

### 5. Call Credits System
- ✅ $0.50 per call (50 cents)
- ✅ Call credits stored in User model (in cents)
- ✅ Credits checked before code creation
- ✅ Credits deducted when code is created
- ✅ Payment intent endpoint for purchasing credits

### 6. Campaign Limits
- ✅ Enforced based on subscription plan
- ✅ Monthly reset logic
- ✅ Unlimited for trial and Unlimited plan

### 7. Caller Cooldown
- ✅ Updated from 10 minutes to **72 hours**
- ✅ Applied to all caller status checks

### 8. Frontend
- ✅ Pricing page (`/pricing`)
- ✅ Stripe.js integration
- ✅ Subscription status display in admin
- ✅ Call credits display and purchase modal
- ✅ 7-day offer notification banner

## 🔧 Environment Variables Needed

Add these to your `.env` file:

```env
# Stripe Keys (provided)
STRIPE_SECRET_KEY=sk_test_51T5...
STRIPE_PUBLISHABLE_KEY=pk_test_51T5...
STRIPE_WEBHOOK_SECRET=whsec_... # Get this after setting up webhook endpoint in Stripe Dashboard

# Stripe Price IDs (create these in Stripe Dashboard)
STRIPE_STARTER_MONTHLY_PRICE_ID=price_...
STRIPE_STARTER_ANNUAL_PRICE_ID=price_...
STRIPE_STARTER_ANNUAL_DISCOUNT_PRICE_ID=price_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_ANNUAL_PRICE_ID=price_...
STRIPE_PRO_ANNUAL_DISCOUNT_PRICE_ID=price_...
STRIPE_ADVANCED_MONTHLY_PRICE_ID=price_...
STRIPE_ADVANCED_ANNUAL_PRICE_ID=price_...
STRIPE_ADVANCED_ANNUAL_DISCOUNT_PRICE_ID=price_...
STRIPE_UNLIMITED_ANNUAL_PRICE_ID=price_...
```

## 📋 Next Steps

### 1. Create Stripe Products & Prices
1. Go to Stripe Dashboard → Products
2. Create products for each plan (Starter, Pro, Advanced, Unlimited)
3. Create prices for:
   - Monthly subscriptions (recurring monthly)
   - Annual subscriptions (recurring yearly)
   - Annual discount prices (create separate prices with 20% discount)
4. Copy the Price IDs and add to `.env`

### 2. Set Up Webhook Endpoint

#### For Local Testing (Development)
Use Stripe CLI to forward webhooks to your local server:

1. **Install Stripe CLI** (if not already installed):
   - Windows: Download from https://stripe.com/docs/stripe-cli
   - Mac: `brew install stripe/stripe-cli/stripe`
   - Linux: See Stripe docs

2. **Login to Stripe CLI**:
   ```bash
   stripe login
   ```

3. **Forward webhooks to your local server**:
   ```bash
   stripe listen --forward-to localhost:5000/api/stripe/webhook
   ```
   (Replace `5000` with your backend port if different)

4. **Copy the webhook signing secret** that appears in the terminal (starts with `whsec_...`)
   - Add it to your `.env` file as `STRIPE_WEBHOOK_SECRET`

5. **Keep the Stripe CLI running** in a separate terminal while testing

#### For Production (Deployment)
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Add endpoint URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `payment_intent.succeeded`
5. Copy the webhook signing secret to your production `.env` file

### 3. Update Frontend Environment
Add to frontend `.env` or `vite.config.js`:
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51T5ursCFQaWcDS8Sq1JyDrT8IE9vPDXtcsBF9xLLUdJFpcWU8UK3R2CUj3FOzMEigoyhBzrxBtVvW6x62ntmaL400g4QxZv6W
```

### 4. Test the Integration
1. Test trial period (60 days, unlimited campaigns)
2. Test subscription checkout
3. Test call credits purchase
4. Test campaign limits
5. Test 72-hour cooldown
6. Test 7-day offer notification

## 🐛 Known Issues / TODO

1. **Call Credits Purchase**: The modal uses a simplified approach. For production, consider:
   - Using Stripe Elements for card input
   - Or redirecting to Stripe Checkout for call credits

2. **Webhook Testing**: ✅ Already documented above - use Stripe CLI for local testing

3. **Price IDs**: Need to be created in Stripe Dashboard and added to `.env`

4. **Frontend Call Credits Modal**: Currently shows a basic form. May need Stripe Elements integration for card input.

## 📝 Notes

- All prices are in cents in the database
- Call credits are stored in cents (50 cents = 1 call)
- Trial period starts automatically on user creation
- 7-day offer window starts after trial ends
- Campaign limits reset monthly
- Caller cooldown is 72 hours (not 48 hours as originally planned)
