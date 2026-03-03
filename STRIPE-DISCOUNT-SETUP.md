# Stripe Discount Setup Guide

## Problem
The 20% off discount plans are showing an error: "You must provide at least one recurring price in `subscription` mode when using prices."

This happens because the discount price IDs need to be set up as **recurring subscription prices** in Stripe, not one-time prices.

## Solution Options

### Option 1: Use Stripe Coupons (Recommended) ✅

This is the **recommended approach** for handling discounts in Stripe subscriptions.

#### Step 1: Create a 20% Off Coupon in Stripe Dashboard

1. Go to Stripe Dashboard → **Products** → **Coupons**
2. Click **"Create coupon"**
3. Configure:
   - **Name**: `20% Off Annual Plans`
   - **ID**: `20_PERCENT_OFF_ANNUAL` (or any unique ID)
   - **Type**: `Percentage`
   - **Percent off**: `20`
   - **Duration**: `Forever` (applies to all future billing cycles)
   - **Redemption limits**: Leave empty (unlimited) or set a limit
4. Click **"Create coupon"**
5. Copy the **Coupon ID** (it will look like `20_PERCENT_OFF_ANNUAL`)

#### Step 2: Add Coupon ID to .env

Add to your `backend/.env` file:

```env
STRIPE_20_PERCENT_COUPON_ID=20_PERCENT_OFF_ANNUAL
```

#### Step 3: How It Works

- When a user selects a discount plan (e.g., `starter_annual_discount`)
- The code will use the **base annual price** (e.g., `starter_annual`)
- And automatically apply the **20% off coupon**
- The subscription will be created with the discount applied

**Advantages:**
- ✅ Cleaner setup (one coupon for all discount plans)
- ✅ Easier to manage (change discount in one place)
- ✅ Works with Stripe's subscription system
- ✅ Discount applies to all future renewals automatically

---

### Option 2: Create Separate Discount Prices (Alternative)

If you prefer to use separate discount prices instead of coupons:

#### Step 1: Create Discount Prices in Stripe Dashboard

For each discount plan (Starter, Pro, Advanced):

1. Go to Stripe Dashboard → **Products**
2. Find the product (e.g., "Starter")
3. Click **"Add another price"**
4. Configure:
   - **Price**: `$2,880.00` (for Starter - 20% off $3,600)
   - **Billing period**: `Yearly` (or `Annual`)
   - **Recurring**: ✅ **MUST BE CHECKED** (this is critical!)
   - **Price ID**: Can be auto-generated or custom (e.g., `starter_annual_20off`)
5. Click **"Save price"**
6. Copy the **Price ID** (starts with `price_...`)

#### Step 2: Verify Price Type

**IMPORTANT:** Make sure the discount price is:
- ✅ **Recurring** (not one-time)
- ✅ **Subscription** type (not payment)
- ✅ **Annual/Yearly** billing period

#### Step 3: Add Price IDs to .env

```env
STRIPE_STARTER_ANNUAL_DISCOUNT_PRICE_ID=price_xxxxx
STRIPE_PRO_ANNUAL_DISCOUNT_PRICE_ID=price_xxxxx
STRIPE_ADVANCED_ANNUAL_DISCOUNT_PRICE_ID=price_xxxxx
```

#### Step 4: Update Code (if needed)

The code already supports this approach. If your discount prices are set up correctly as recurring subscriptions, they should work.

---

## Which Option Should You Use?

### Use Option 1 (Coupons) if:
- ✅ You want simpler setup
- ✅ You want to manage discount in one place
- ✅ You want discount to apply to all renewals automatically
- ✅ You might change the discount percentage in the future

### Use Option 2 (Separate Prices) if:
- ✅ You already created the discount prices
- ✅ You want different discount amounts per plan
- ✅ You prefer explicit pricing per plan

---

## Testing

After setting up either option:

1. **Test regular plans** (should work as before):
   - Starter Monthly
   - Starter Annual
   - Pro Monthly
   - Pro Annual
   - Advanced Monthly
   - Advanced Annual
   - Unlimited Annual

2. **Test discount plans**:
   - Starter Annual (20% Off)
   - Pro Annual (20% Off)
   - Advanced Annual (20% Off)

3. **Verify in Stripe Dashboard**:
   - Check that subscription was created
   - Verify discount is applied
   - Check that amount is correct (20% off)

---

## Troubleshooting

### Error: "You must provide at least one recurring price"

**Cause:** The discount price is set up as a one-time price, not a recurring subscription price.

**Solution:**
- If using Option 1: Make sure `STRIPE_20_PERCENT_COUPON_ID` is set in `.env`
- If using Option 2: Recreate the discount price as a **recurring subscription price**

### Discount Not Applied

**Check:**
1. Coupon ID is correct in `.env`
2. Coupon is active in Stripe Dashboard
3. Price ID is correct (if using Option 2)
4. Check backend logs for errors

### Price Mismatch

**Verify:**
- Discount price = Base price × 0.8 (20% off)
- Starter: $3,600 × 0.8 = $2,880 ✅
- Pro: $5,400 × 0.8 = $4,320 ✅
- Advanced: $9,000 × 0.8 = $7,200 ✅

---

## Quick Setup (Recommended)

1. Create coupon in Stripe Dashboard (5 minutes)
2. Add `STRIPE_20_PERCENT_COUPON_ID` to `.env`
3. Restart backend server
4. Test discount plans

That's it! 🎉
