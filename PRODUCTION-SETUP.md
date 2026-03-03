# Production Setup Guide

This guide will help you set up the Stripe integration for production.

## Prerequisites

1. **Production Stripe Account**: You need a live Stripe account (not test mode)
2. **Production Domain**: Your app must be deployed with a public HTTPS URL
3. **Environment Variables**: All Stripe keys must be production keys

---

## Step 1: Get Production Stripe Keys

1. Log in to your Stripe Dashboard: https://dashboard.stripe.com
2. Make sure you're in **Live mode** (toggle in the top right)
3. Go to **Developers** → **API keys**
4. Copy your **Publishable key** (starts with `pk_live_...`)
5. Copy your **Secret key** (starts with `sk_live_...`)

⚠️ **Important**: Never commit these keys to version control!

---

## Step 2: Create Production Price IDs

1. In Stripe Dashboard (Live mode), go to **Products**
2. Create products for each subscription plan:
   - Starter Monthly
   - Starter Annual
   - Pro Monthly
   - Pro Annual
   - Advanced Monthly
   - Advanced Annual
   - Unlimited Annual

3. For each product:
   - Set up **Recurring** pricing (monthly or annual)
   - Copy the **Price ID** (starts with `price_...`)
   - Note: Discount plans use coupons, not separate prices

4. Create a **20% off coupon**:
   - Go to **Products** → **Coupons**
   - Click **Create coupon**
   - Name: "20% Off Annual Plans"
   - Type: **Percentage**
   - Percentage: **20%**
   - Duration: **Once** (applies to first payment only)
   - Copy the **Coupon ID** (starts with `coupon_...`)

---

## Step 3: Configure Webhook Endpoint

### Option A: Using Stripe Dashboard (Recommended)

1. In Stripe Dashboard (Live mode), go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your webhook URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `payment_intent.succeeded` (optional, for call credits)
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_...`)

### Option B: Using Stripe CLI (For Testing)

If you need to test webhooks locally before deploying:

```bash
# Login to Stripe CLI with your production account
stripe login

# Forward webhooks to your local server
stripe listen --forward-to http://localhost:5000/api/stripe/webhook

# Copy the webhook signing secret from the output
```

---

## Step 4: Update Environment Variables

Update your production `.env` file (or hosting platform's environment variables):

```env
# Stripe Production Keys
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...  # Same as above for frontend

# Stripe Webhook
STRIPE_WEBHOOK_SECRET=whsec_...  # From Step 3

# Stripe Price IDs (Production)
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_STARTER_ANNUAL=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_ANNUAL=price_...
STRIPE_PRICE_ADVANCED_MONTHLY=price_...
STRIPE_PRICE_ADVANCED_ANNUAL=price_...
STRIPE_PRICE_UNLIMITED_ANNUAL=price_...

# Stripe Coupon ID (for 20% off annual plans)
STRIPE_20_PERCENT_COUPON_ID=coupon_...

# Frontend URL (Production)
FRONTEND_URL=https://yourdomain.com

# Backend URL (Production)
BACKEND_URL=https://api.yourdomain.com  # or your backend URL
```

---

## Step 5: Deploy Your Application

1. **Build your frontend**:
   ```bash
   npm run build
   ```

2. **Deploy backend**:
   - Make sure your backend server is running
   - Ensure it's accessible via HTTPS
   - Update `FRONTEND_URL` and `BACKEND_URL` in `.env`

3. **Deploy frontend**:
   - Deploy the built files to your hosting service
   - Ensure HTTPS is enabled

---

## Step 6: Test Production Setup

### Test Subscription Purchase

1. Go to your production pricing page
2. Select a plan and click "Subscribe"
3. Use Stripe's test card: `4242 4242 4242 4242`
   - Or use a real card in test mode first
4. Complete the checkout
5. Verify:
   - Subscription status updates in admin panel
   - Number of callers updates correctly
   - Campaign limits are enforced

### Test Call Credits Purchase

1. Go to admin panel
2. Click "Purchase Credits"
3. Enter an amount (e.g., $10)
4. Complete checkout
5. Verify:
   - Call credits update immediately
   - Credits are deducted when creating campaigns

### Test Webhook Delivery

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click on your webhook endpoint
3. Check **Events** tab
4. Verify events are being received and processed (status: 200)

---

## Step 7: Monitor Webhooks

### Check Webhook Logs

1. In Stripe Dashboard → **Developers** → **Webhooks**
2. Click on your webhook endpoint
3. View **Events** to see:
   - Event types received
   - Response status codes
   - Error messages (if any)

### Common Issues

**Issue**: Webhook returns 400 or 500 error
- **Solution**: Check your webhook signing secret matches
- **Solution**: Verify your webhook endpoint URL is correct
- **Solution**: Check backend logs for errors

**Issue**: Events not being received
- **Solution**: Verify webhook endpoint is publicly accessible
- **Solution**: Check HTTPS is enabled
- **Solution**: Verify events are selected in webhook configuration

**Issue**: Subscription not updating after payment
- **Solution**: Check webhook events are being received
- **Solution**: Verify `checkout.session.completed` event is selected
- **Solution**: Check backend logs for webhook processing errors

---

## Step 8: Security Checklist

- [ ] All Stripe keys are production keys (not test keys)
- [ ] Webhook signing secret is set correctly
- [ ] HTTPS is enabled on all endpoints
- [ ] Environment variables are not committed to version control
- [ ] Webhook endpoint is publicly accessible
- [ ] All required webhook events are selected
- [ ] Error logging is enabled for webhook failures

---

## Step 9: Go Live Checklist

Before going live with real customers:

- [ ] Test subscription purchase with real card (in test mode)
- [ ] Test call credits purchase
- [ ] Test campaign creation and credit deduction
- [ ] Test subscription renewal (wait for next billing cycle)
- [ ] Test subscription cancellation
- [ ] Verify webhook events are being received
- [ ] Set up monitoring/alerts for webhook failures
- [ ] Test the 72-hour cooldown period
- [ ] Test campaign limits enforcement
- [ ] Verify trial period logic (60 days)
- [ ] Verify 7-day offer window logic

---

## Support

If you encounter issues:

1. Check Stripe Dashboard → **Developers** → **Logs** for API errors
2. Check your backend logs for webhook processing errors
3. Verify all environment variables are set correctly
4. Test webhook delivery using Stripe Dashboard's "Send test webhook" feature

---

## Additional Resources

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe Production Checklist](https://stripe.com/docs/keys)
