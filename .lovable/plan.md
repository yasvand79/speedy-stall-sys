

## Plan: Show Email on Profile Page

The Profile page already displays the email in the "Account Details" card. Looking at the code in `src/pages/Profile.tsx`, line ~139 shows `{user?.email}`. 

However, the user is on `/profile` and may not be seeing it. Let me check if there's an issue with the current implementation.

Looking at the existing code more carefully, the email IS already displayed in the Account Details card. The issue might be that:
1. The `user` object is null (not logged in properly)
2. The email field is visually hard to spot

Since it's already in the code, the user likely wants it more prominent — perhaps in the Personal Information section at the top, not buried in Account Details.

### Changes

**`src/pages/Profile.tsx`**:
- Add an email field (read-only) in the **Personal Information** card, right above the Full Name input, so it's immediately visible when the page loads
- Keep the existing email display in Account Details as well

