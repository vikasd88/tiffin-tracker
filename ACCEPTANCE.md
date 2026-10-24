# Acceptance checklist — Supabase-connected provider

## Setup
- [ ] Run `supabase/schema.sql` in Supabase SQL Editor.
- [ ] Verify all four tables exist and RLS is enabled on each.
- [ ] Add local `.env.local` with Project URL and publishable key only.
- [ ] Configure Supabase Auth email provider and local/Vercel redirect URLs.
- [ ] Create and confirm a provider account.

## Provider workflow
- [ ] Add a customer and verify it appears after page refresh.
- [ ] Add regular orders and change delivery status; verify changes persist.
- [ ] Record a payment and verify monthly bill totals.
- [ ] Open the same account in a second browser, sign in, and verify the same records appear.
- [ ] Change a record in browser A; click **Refresh data** in browser B and verify the update appears.
- [ ] Export JSON, import it back into the same account, and verify records remain intact.
- [ ] Sign out and verify provider data is not visible until signing in again.
- [ ] Create a second test account and verify it cannot see the first account's customers, orders, payments, or settings.
- [ ] Test password reset and password update with configured Supabase redirect URLs.

## Security
- [ ] In Supabase Table Editor, verify RLS is enabled for `provider_settings`, `provider_customers`, `provider_orders`, and `provider_payments`.
- [ ] Verify the `anon` role has no table privileges and each table has policies scoped to `auth.uid()`.
- [ ] Confirm no service-role key or database password is present in source code, `.env.example`, Vercel client variables, or Git history.

## Build status
- TypeScript/TSX transpile syntax checks passed for the edited source files.
- A full `npm run build`, live Supabase query test, and browser end-to-end tests were not completed in this environment because `npm install` timed out. Complete these checks after installing dependencies and adding your Supabase credentials.

## Daily attendance and monthly pricing
- [ ] Daily Register supports date selection, Lunch/Dinner selection, and All / Not marked / Taken / Not available filters.
- [ ] Marking Taken creates a chargeable order at half of the monthly plan rate divided by the selected month's actual calendar days.
- [ ] Marking Not available records a zero-charge entry; switching back to Not marked removes the attendance entry.
- [ ] Monthly bills count only chargeable Taken orders and subtract recorded payments.
- [ ] Settings expose Mini Meal and Full Meal monthly rates, defaulting to ₹4,000 and ₹5,000.
