

# Plan: Billing as Main Page, Remove New Order Button, Razorpay Auto-Verification

## Summary

Four changes: (1) fix the error on the screenshot (printer setup page - need to identify), (2) remove "New Order" button from Orders page, (3) make Billing the default landing page for billing/branch_admin roles, (4) integrate Razorpay checkout into Billing payment step with auto-verification.

## Changes

### 1. Remove "New Order" button from Orders page
**File: `src/pages/Orders.tsx`**
- Remove the `NewOrderDialog` import and its usage on line 162
- The `NewOrderDialog` component stays in codebase but is no longer rendered on Orders page

### 2. Make Billing the main/default page
**File: `src/App.tsx`**
- Change the `/` route to also allow `billing` role
- Update `ProtectedRoute` redirect logic: billing users already redirect to `/billing` — this is correct
- Alternatively, make `/billing` accessible as the first tab in bottom nav for billing role (already is)

**File: `src/components/auth/ProtectedRoute.tsx`**  
- Already redirects billing role to `/billing` — no change needed

**File: `src/components/layout/BottomNav.tsx`**
- Reorder so Billing appears first for billing role (currently: Home, Orders, Billing, Reports)
- Move Billing before Orders in the array, or keep as-is since billing users don't see Home

### 3. Integrate Razorpay into Billing payment step with auto-verification
**File: `src/pages/Billing.tsx`**
- Import `useRazorpay` hook
- In the payment step (Step 3), add a "Pay with Razorpay" button that calls `initiatePayment` with the current order details
- On Razorpay success callback: the `verify-razorpay-payment` edge function already records the payment and updates order status automatically
- After Razorpay success, move to the success step
- The existing UPI QR (manual) and Cash buttons remain as fallback options

**Flow:**
1. User places order → Step 3 (Payment) shows
2. Three options: (a) Razorpay Pay button (auto-verifies), (b) Manual UPI QR + confirm, (c) Cash Received
3. Razorpay handler calls `verify-razorpay-payment` → records payment → updates order status → moves to success step

### 4. Fix `getClaims` error in edge functions
**Files: `supabase/functions/verify-razorpay-payment/index.ts`, `supabase/functions/check-razorpay-payment/index.ts`, `supabase/functions/create-razorpay-order/index.ts`**
- `getClaims()` is not a valid Supabase auth method — replace with `supabase.auth.getUser(token)` for authentication
- This is likely the source of errors when Razorpay functions are called

## Technical Details

### Razorpay auto-verification flow in Billing.tsx:
```
Place Order → Razorpay Checkout opens → Customer pays → 
Razorpay handler fires → verify-razorpay-payment edge function → 
Payment recorded + order status updated → UI moves to success step
```

### Edge function auth fix (all 3 functions):
Replace:
```typescript
const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
if (claimsError || !claimsData?.claims) { ... }
```
With:
```typescript
const { data: { user }, error: userError } = await supabase.auth.getUser(token);
if (userError || !user) { ... }
```

