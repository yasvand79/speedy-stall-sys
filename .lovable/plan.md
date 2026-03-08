

## Plan: Bluetooth Thermal Printer for Mobile POS

### Important Context

Your project runs on **Lovable**, which is built on React + Vite + Tailwind. It cannot be converted to React Native or Flutter. However, your project **already has Capacitor configured**, which means it can run as a native mobile app with access to native device features like Bluetooth.

The approach: Use a **Capacitor Bluetooth printer plugin** (`capacitor-thermal-printer`) to send ESC/POS commands directly from the app to a paired Bluetooth thermal printer — no PDF, no browser dialog, no new tabs.

### What Changes

**1. Install `capacitor-thermal-printer` plugin**

Add the Capacitor plugin that provides native Bluetooth ESC/POS printing on both Android and iOS. This replaces the QZ Tray approach (which only works on desktop browsers) with native Bluetooth communication for the mobile app.

**2. Create `src/hooks/useBluetoothPrinter.ts`**

New hook that wraps the Capacitor plugin with:
- `scanForPrinters()` — Discover nearby Bluetooth thermal printers
- `connectPrinter(address)` — Pair and connect to a selected printer
- `printBill(order, shopSettings)` — Build and send ESC/POS commands (reuses the existing `buildEscPosData` logic from `useThermalPrinter.ts`)
- `printTestPage()` — Send a test receipt
- Status tracking: `'disconnected' | 'scanning' | 'connected' | 'printing'`
- Auto-reconnect to the last saved printer on app launch
- Save default printer address to localStorage (and optionally to shop_settings)
- Platform detection: use Bluetooth on mobile (Capacitor), fall back to QZ Tray on desktop

**3. Update `src/hooks/useThermalPrinter.ts`**

Add platform detection at the top level:
- If running inside Capacitor (`Capacitor.isNativePlatform()`), delegate to the Bluetooth printer hook
- If running in a regular browser, keep the existing QZ Tray logic
- Expose the same API surface so all consumers (`Orders.tsx`, `PaymentDialog.tsx`, `PrinterConfiguration.tsx`) work unchanged

**4. Update `src/components/settings/PrinterConfiguration.tsx`**

Add a "Bluetooth Printers" section (shown on mobile):
- "Scan for Bluetooth Printers" button
- List of discovered printers with signal strength
- Connect/disconnect buttons
- "Set as Default" to save the printer
- Test print button
- Paper width selector (58mm / 80mm)

**5. Update `src/components/billing/PaymentDialog.tsx`**

No API changes needed — it already calls `printBill()` from `useThermalPrinter`. The platform detection in the hook will automatically route to Bluetooth on mobile.

**6. Update `src/pages/Orders.tsx`**

Same — no changes needed since it already uses `useThermalPrinter`.

### ESC/POS Bill Format

The existing `buildEscPosData()` function already generates proper ESC/POS commands for 80mm printers (48 chars/line). It will be extended to support 58mm (32 chars/line) based on the saved paper width setting.

### Error Handling

| Scenario | Behavior |
|---|---|
| Bluetooth off | Prompt user to enable Bluetooth |
| No printers found | "No Bluetooth printers found. Ensure printer is on and in range." |
| Connection lost | Auto-reconnect attempt, toast if fails |
| Permission denied | Request Bluetooth permissions via Capacitor |
| Desktop browser | Falls back to QZ Tray (existing behavior) |

### Files to Create/Modify

| File | Action |
|---|---|
| `src/hooks/useBluetoothPrinter.ts` | **Create** — Capacitor Bluetooth printing hook |
| `src/hooks/useThermalPrinter.ts` | **Modify** — Add platform detection, delegate to Bluetooth on mobile |
| `src/components/settings/PrinterConfiguration.tsx` | **Modify** — Add Bluetooth scanner UI for mobile |

### Post-Implementation Setup

After these code changes, to test on a real device you will need to:
1. Export the project to GitHub
2. Run `npm install` and `npx cap sync`
3. Open in Android Studio (`npx cap run android`) or Xcode (`npx cap run ios`)
4. Pair your Bluetooth thermal printer and test

