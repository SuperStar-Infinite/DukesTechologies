# Stripe Account Setup Guide

## Using Client's Stripe Account

Since you're receiving Stripe keys from your client, here's how to set everything up correctly:

### 1. Get Access to Client's Stripe Account

You have two options:

#### Option A: Client Logs In (Recommended for Testing)
- Ask your client to:
  1. Install Stripe CLI on their machine
  2. Run `stripe login` and authenticate
  3. Run `stripe listen --forward-to localhost:5000/api/stripe/webhook`
  4. Share the webhook secret with you

#### Option B: You Get Access (If Client Grants It)
- Client adds you as a team member in Stripe Dashboard:
  1. Go to Stripe Dashboard → Settings → Team
  2. Click "Add team member"
  3. Enter your email and give you "Developer" or "Admin" access
  4. You'll receive an invitation email
  5. Accept and log in to Stripe CLI with that account

### 2. Use Client's Keys

Make sure you're using the keys provided by your client:

**Backend `.env` file:**
```env
STRIPE_SECRET_KEY=sk_test_... # From client
STRIPE_PUBLISHABLE_KEY=pk_test_... # From client
STRIPE_WEBHOOK_SECRET=whsec_... # From Stripe CLI or Dashboard
```

**Frontend `.env` or `vite.config.js`:**
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... # From client
```

### 3. Login to Stripe CLI

**Use the client's Stripe account credentials:**

```bash
stripe login
```

When prompted, log in with:
- The email associated with the client's Stripe account, OR
- Your email if the client added you as a team member

### 4. Forward Webhooks

```bash
stripe listen --forward-to localhost:5000/api/stripe/webhook
```

The webhook secret shown will work with the client's keys.

## Important Notes

### ✅ DO:
- Use the same Stripe account that the keys belong to
- Keep webhook secret in sync (from Stripe CLI or Dashboard)
- Test with the client's test keys
- Use test mode keys (starting with `sk_test_` and `pk_test_`)

### ❌ DON'T:
- Mix accounts (your account + client's keys won't work together)
- Use production keys (`sk_live_` / `pk_live_`) for local testing
- Share webhook secrets between different Stripe accounts

## Testing with Your Own Account (Alternative)

If you want to test with your own Stripe account first:

1. **Create your own Stripe account** (free test account)
2. **Get your own test keys** from your Stripe Dashboard
3. **Use your own keys** in `.env` files
4. **Login to Stripe CLI** with your account
5. **Test everything** with your account
6. **Switch to client's keys** when ready

**Note:** When you switch to client's keys, you'll need to:
- Update all `.env` files with client's keys
- Login to Stripe CLI with client's account
- Get new webhook secret from client's account

## Production Deployment

When deploying to production:

1. **Use client's production keys** (starting with `sk_live_` and `pk_live_`)
2. **Set up webhook endpoint** in client's Stripe Dashboard:
   - URL: `https://yourdomain.com/api/stripe/webhook`
   - Get production webhook secret
3. **Update environment variables** in production server

## Summary

**For local testing with client's keys:**
- ✅ Login to Stripe CLI with **client's account** (or get access)
- ✅ Use **client's test keys** in your `.env` files
- ✅ Get webhook secret from **client's account** (via Stripe CLI or Dashboard)

Everything must be from the **same Stripe account**!
