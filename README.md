# My Tiffin Tracker — Customer + Provider Management

A responsive React + TypeScript app with two workspaces. The Provider workspace uses Supabase Auth and a shared PostgreSQL database; the Customer Tracker remains browser-local:

- **Customer Tracker:** the original personal meal calendar, absences, monthly bill, payments, settings, JSON backup/restore, PWA and WhatsApp helper.
- **Tiffin Provider:** manage multiple customers, delivery addresses, regular lunch/dinner preferences, daily orders, delivery status, customer-wise monthly bills, payments, meal pricing, and JSON backup/restore. WhatsApp functionality is intentionally not included in Provider mode for this first version.

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

## Provider workflow

1. Choose **Tiffin Provider** at startup.
2. Add customers with contact details, delivery address, and their regular lunch/dinner plan.
3. Open **Daily Register**, choose the date and Lunch or Dinner, and use **Load regular orders**. This adds only missing orders for active customers; it does not overwrite an existing order.
4. Adjust each customer's meal, quantity, and delivery status (Pending, Preparing, Dispatched, Delivered).
5. Open **Monthly Bills** to review each customer's charges, payments, and outstanding balance. Record partial payments against the selected billing month.
6. Open **Settings & backups** and export a JSON backup regularly. Importing a backup replaces the provider data in the signed-in Supabase account.

Default meal prices are configurable. Each order stores its unit price, so changing a default price does not change historical charges. `No Order` entries are not billed.

## Supabase data and Vercel deployment

The **Tiffin Provider** workspace uses Supabase Auth and four database tables (`provider_settings`, `provider_customers`, `provider_orders`, `provider_payments`) with Row Level Security. Signed-in provider records are shared across browsers that sign in to the same account. Use **Refresh data** to fetch changes made in another browser while the app is already open.

Setup guide: [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md). SQL schema and policies: [`supabase/schema.sql`](./supabase/schema.sql) and [`supabase/migrations/202610240001_provider_cloud.sql`](./supabase/migrations/202610240001_provider_cloud.sql).

For local development, copy `.env.example` to `.env.local`, fill in the Supabase Project URL and publishable key, then run `npm install` and `npm run dev`. For Vercel, add the same two variables in **Project Settings → Environment Variables** and redeploy. Do not expose a service-role key or database password in frontend code.

Before replacing a previous local-only provider version, export its JSON backup. After signing in to the Supabase version, import that backup from **Settings & backups**. Import replaces the records in the currently signed-in provider account, so back up first.

The existing **Customer Tracker** remains local to each browser and is not synchronized by Supabase in this version. The provider workspace is synchronized to Supabase.

## PWA

The service worker is registered for production builds. To test installation, deploy over HTTPS (or use `localhost`) and choose **Install app** or **Add to Home screen** in the browser. The Customer Tracker continues to use local browser storage; Provider records are fetched from Supabase after sign-in.

## Privacy note

The Provider workspace requires Supabase sign-in and uses RLS policies so a signed-in account can access only its own provider records. The Customer Tracker workspace is still stored in local browser storage and has no account-level sync. Keep your sign-in credentials private and export periodic JSON backups of provider data.

## Provider-only release

This build opens directly into the Tiffin Provider sign-in/workspace. The Customer Tracker remains in the source code but its workspace selector and navigation entry are hidden for now. To restore both modes later, restore the previous `App.tsx`, `ProviderGate.tsx`, and `ProviderApp.tsx` mode-selection/navigation code.
