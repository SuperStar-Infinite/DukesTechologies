# Local Testing Guide for Stripe Integration

## Quick Start for Local Testing

### 1. Install Stripe CLI

**Windows:**
- Download from: https://github.com/stripe/stripe-cli/releases
- Or use Chocolatey: `choco install stripe`
- Or use Scoop: `scoop install stripe`

**Mac:**
```bash
brew install stripe/stripe-cli/stripe
```

**Linux:**
```bash
# Download the latest release
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_X.X.X_linux_x86_64.tar.gz
tar -xvf stripe_X.X.X_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin/
```

### 2. Login to Stripe CLI

**Important:** Use the **SAME Stripe account** that your client's keys belong to!

```bash
stripe login
```

This will open your browser to authenticate with your Stripe account.

**Why use the same account?**
- Your client's Stripe keys (secret key, publishable key) are tied to their Stripe account
- Stripe CLI needs to authenticate with the same account to forward webhooks correctly
- All test data (customers, subscriptions, payments) will be in the same account
- The webhook secret from Stripe CLI will work with your client's keys

**If you use a different account:**
- The webhook secret won't match
- Test data will be in a different account
- You'll need to use different keys for testing

### 3. Start Your Backend Server

In one terminal, start your backend:
```bash
cd backend
npm run dev
# or
npm start
```

Your server should be running on `http://localhost:5000` (or your configured port).

### 4. Forward Webhooks to Local Server

In a **separate terminal**, run:
```bash
stripe listen --forward-to localhost:5000/api/stripe/webhook
```

You'll see output like:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)
```

### 5. Add Webhook Secret to .env

Copy the webhook signing secret (starts with `whsec_`) and add it to your `backend/.env` file:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

**Important:** Keep the `stripe listen` command running while testing!

### 6. Test Webhooks

Now when you:
- Complete a checkout session
- Update a subscription
- Make a payment

Stripe CLI will forward those events to your local server, and you'll see them in both terminals:
- Stripe CLI terminal: Shows the event being forwarded
- Your backend terminal: Shows the webhook being processed

## Testing Checklist

### Test Subscription Flow
1. ✅ Start backend server
2. ✅ Start Stripe CLI webhook forwarding
3. ✅ Go to `/pricing` page
4. ✅ Click "Subscribe" on a plan
5. ✅ Complete checkout (use test card: `4242 4242 4242 4242`)
6. ✅ Verify webhook received in Stripe CLI terminal
7. ✅ Check backend logs for webhook processing
8. ✅ Verify subscription status in admin panel

### Test Call Credits Purchase
1. ✅ Go to admin panel
2. ✅ Click "Purchase Call Credits"
3. ✅ Enter amount and complete payment
4. ✅ Verify webhook received
5. ✅ Check call credits balance updated

### Test Campaign Creation
1. ✅ Ensure you have call credits
2. ✅ Create a new campaign
3. ✅ Verify credits deducted
4. ✅ Verify campaign created successfully

## Test Cards

Use these test cards in Stripe Checkout:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0025 0000 3155`

Use any future expiry date, any 3-digit CVC, and any ZIP code.

## Troubleshooting

### Webhook Not Received?

1. **Check Stripe CLI is running**: Make sure `stripe listen` is active
2. **Check backend is running**: Verify server is on the correct port
3. **Check webhook secret**: Ensure `STRIPE_WEBHOOK_SECRET` in `.env` matches what Stripe CLI shows
4. **Check endpoint URL**: Should be `localhost:5000/api/stripe/webhook` (adjust port if needed)

### Webhook Signature Verification Failed?

- Make sure you're using the webhook secret from the **current** `stripe listen` session
- Restart your backend server after updating `.env`
- Check that the webhook secret in `.env` matches what Stripe CLI shows

### Port Already in Use?

If port 5000 is taken, either:
- Change your backend port in `.env`: `PORT=5001`
- Update Stripe CLI command: `stripe listen --forward-to localhost:5001/api/stripe/webhook`

## Production Deployment

When deploying to production:

1. **Remove Stripe CLI** - you won't need it in production
2. **Set up webhook endpoint in Stripe Dashboard**:
   - Go to: https://dashboard.stripe.com/webhooks
   - Click "Add endpoint"
   - URL: `https://yourdomain.com/api/stripe/webhook`
   - Select the same events listed in the main guide
   - Copy the webhook signing secret to your production `.env`

3. **Update environment variables** in your production server

## Additional Stripe CLI Commands

```bash
# View all webhook events
stripe events list

# Trigger a test webhook
stripe trigger checkout.session.completed

# View webhook logs
stripe logs tail
```
