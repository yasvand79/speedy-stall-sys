

## Billing Page: Role-Based View

**Goal**: Branch Admin sees the full Billing page (stats + pending payments + recent transactions). Billing staff sees only the pending payments section with the Pay button — no stats cards, no transaction history.

### Changes

**File: `src/pages/Billing.tsx`**

1. Import `useAuth` from `@/contexts/AuthContext`
2. Get `role` from `useAuth()`
3. Determine `isBillingRole = role === 'billing'`
4. Conditionally render:
   - **Stats cards section** (Today's Collection, Pending Payments, GST): only if `!isBillingRole`
   - **Pending Payments card**: always shown (this is the core work area for billing staff)
   - **Recent Transactions card**: only if `!isBillingRole`
5. Optionally adjust the page subtitle for billing staff (e.g. "Process pending payments")

No database or routing changes needed — just conditional rendering within the existing component.

