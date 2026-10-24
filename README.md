# My Tiffin Tracker

A personal, responsive React + TypeScript app for tracking homemade lunch and dinner orders, absences, monthly bills and payments. All records are saved in browser `localStorage`; there is no backend, authentication, or external database.

## Run locally

Requirements: Node.js 18.18+ (Node 20 LTS recommended) and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To create a production build:

```bash
npm run build
npm run preview
```

## Features

- Dashboard with monthly totals and today's lunch/dinner status
- Independent Lunch and Dinner selection: Mini Meal, Full Meal, or No Order
- Monthly calendar and date-wise meal editing
- Out-of-station date ranges applied to lunch, dinner, or both
- Configurable rates; each order stores its own charged price
- Monthly bill, CSV export, print-friendly statement and month finalization/unlocking
- Payment history with partial payments and billing-month allocation
- JSON backup/restore with structure validation and replacement confirmation
- Optional September 2026 demo data, and a separate clear-demo action
- Asia/Kolkata date formatting and date-only `YYYY-MM-DD` meal keys

## Notes

- Browser storage is device/browser-specific. Export JSON backups regularly.
- An absence confirmation removes existing orders in the selected slots/range so those slots cannot be charged twice.
- “No Order” is represented as a non-chargeable slot; it is not stored as a billable meal.
