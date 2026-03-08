

## Plan: Add Theme & Display Settings to Profile Page

The app currently has `next-themes` installed but no `ThemeProvider` is set up, so dark mode doesn't work yet. We need to wire it up and add a theme toggle to the profile page.

### Changes

1. **`src/App.tsx`** — Wrap the app with `ThemeProvider` from `next-themes` (with `attribute="class"`, `defaultTheme="system"`, `enableSystem`)

2. **`index.html`** — Ensure `<html>` doesn't have a hardcoded class that conflicts (likely fine already)

3. **`src/pages/Profile.tsx`** — Add a new "Display Settings" card with:
   - **Theme selector**: Light / Dark / System toggle using radio group or segmented buttons
   - **Font size preference**: Small / Default / Large option (stored in localStorage, applied via a CSS class on `<html>`)
   - Uses `useTheme()` from `next-themes` for theme switching

### Technical Notes
- `next-themes` is already installed as a dependency
- Tailwind CSS dark mode works with `class` strategy (already configured via `darkMode: "class"` in tailwind config typically)
- Font size preference will use `localStorage` since it's a UI-only preference — no database changes needed
- Theme preference is handled automatically by `next-themes` (persists to localStorage)

