

## Plan: QZ Tray Thermal Printer Integration

### Problem
Currently, printing uses the browser's native `window.print()` via hidden iframes, which opens the system print dialog (often showing a PDF preview on mobile/Android). You need direct, silent printing to a thermal POS printer using ESC/POS commands via QZ Tray.

### Approach
Integrate the [QZ Tray](https://qz.io) JavaScript library as the print bridge. QZ Tray is a local background application that connects the browser to raw printers. The web app will communicate with QZ Tray via WebSocket, send ESC/POS byte commands, and print silently — no PDF, no new tab, no dialogs.

### Implementation Steps

**1. Create a `useThermalPrinter` hook (`src/hooks/useThermalPrinter.ts`)**

Central module with clean separation of concerns:
- **`connectQZ()`** — Load QZ Tray JS library dynamically, establish WebSocket connection. Auto-connect on page load. Store connection status in state.
- **`detectPrinter()`** — Call `qz.printers.find()` to list installed printers. Allow user to select one or auto-match against the printer name saved in shop settings (e.g. "XP-80C").
- **`buildEscPosData(order, shopSettings)`** — Generate ESC/POS byte array commands:
  - `ESC @` — Initialize printer
  - `ESC a 1` — Center align for shop name
  - Shop name in double-height/width
  - Dashed separator line
  - Order number, date, table/takeaway info
  - Item rows with aligned columns (name, qty, price) using fixed-width formatting for 80mm (48 chars per line)
  - Subtotal, GST, total (bold via `ESC E 1`)
  - Payment method
  - Footer text ("Thank You Visit Again")
  - `ESC d 4` — Feed 4 lines
  - `GS V 0` — Auto-cut paper
- **`printBill(order)`** — Connect if not connected, detect printer, send raw ESC/POS data via `qz.print()`.
- **Error handling** — Expose `qzStatus` state: `'disconnected' | 'connecting' | 'connected' | 'error'` with user-friendly error messages for: QZ Tray not installed, printer not found, connection failure.

**2. Add QZ Tray script loader (`index.html`)**

Add the QZ Tray JS library via CDN script tag or bundle it. QZ Tray's JS library (`qz-tray.js`) will be loaded and `qz` will be available globally.

**3. Update `PaymentDialog.tsx` — Auto-print after payment**

- Import and use `useThermalPrinter` hook.
- On `step === 'success'`, automatically call `printBill()` with the order data (items, totals, payment method, shop settings).
- Replace the existing `handlePrintBill` (which opens a new window) with the QZ Tray-based thermal print call.
- Keep the "Print Bill" button as a manual re-print option.
- Show a small status indicator: "Printing..." / "Printed" / "Printer not connected".

**4. Update `Orders.tsx` — Print via QZ Tray**

- Replace the existing `handlePrintFromPreview` iframe-based approach with the thermal printer hook.
- The preview dialog can remain for visual verification, but the "Print" button will send ESC/POS commands via QZ Tray instead of using `window.print()`.
- Add a fallback: if QZ Tray is not connected, fall back to the existing iframe print method.

**5. Update `PrinterConfiguration.tsx` — QZ Tray status & printer selection**

- Add a "QZ Tray Status" indicator (connected/disconnected) at the top of the printer config card.
- Add a "Detect Printers via QZ Tray" button that uses `qz.printers.find()` to list all OS-installed printers.
- Save the selected printer name to shop settings so auto-print knows which printer to target.
- Add a "Test Print" button that sends a test ESC/POS receipt to the selected printer.

**6. Update `Settings.tsx`**

- Pass the QZ Tray printer list to `PrinterConfiguration` for selection.

### Bill Format (80mm / 48 chars per line)

```text
        RESTAURANT NAME
     123 Main St, City
   GSTIN: 12ABCDE3456F7
--------------------------------
Order: #ORD-001    Table: 5
Date: 08/03/2026 18:30
--------------------------------
ITEM           QTY  RATE   AMT
--------------------------------
Burger          x2   100   200
Pizza           x1   150   150
Cold Coffee     x1    80    80
--------------------------------
Subtotal               430
CGST 2.5%               11
SGST 2.5%               11
--------------------------------
TOTAL                  452
--------------------------------
Payment: UPI
--------------------------------
   Thank You! Visit Again
```

### Error Handling

| Scenario | User sees |
|---|---|
| QZ Tray not installed | Toast: "Install QZ Tray for direct printing" + download link |
| QZ Tray not running | Toast: "Start QZ Tray application" |
| No printer found | Toast: "No printer detected. Check connection." |
| Print fails | Toast: "Print failed. Retrying..." with retry button |
| Fallback | Falls back to browser print dialog if QZ unavailable |

### Files to Create/Modify

| File | Action |
|---|---|
| `src/hooks/useThermalPrinter.ts` | **Create** — QZ Tray connection, printer detection, ESC/POS formatting, print function |
| `index.html` | **Modify** — Add QZ Tray JS library script |
| `src/components/billing/PaymentDialog.tsx` | **Modify** — Auto-print on payment success, replace window.open with thermal print |
| `src/pages/Orders.tsx` | **Modify** — Use thermal printer for print button, keep iframe fallback |
| `src/components/settings/PrinterConfiguration.tsx` | **Modify** — Add QZ Tray status, printer detection via QZ, test print |

