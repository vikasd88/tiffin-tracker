# Supabase setup for My Tiffin Provider

This app uses Supabase Auth plus four Postgres tables. Provider data is scoped to the signed-in user with Row Level Security (RLS). The existing Customer Tracker workspace remains browser-local; the Provider workspace uses Supabase.

## 1. Create the tables and security policies

1. Open your project at https://supabase.com/dashboard.
2. Select **SQL Editor** and create a new query.
3. Open `supabase/schema.sql` in this project, copy the entire file, paste it into the SQL Editor, and click **Run**.
4. Confirm that `provider_settings`, `provider_customers`, `provider_orders`, and `provider_payments` appear under **Table Editor**.

The SQL enables RLS on every provider table, removes table privileges from the `anon` role, grants CRUD to `authenticated`, and adds per-user policies. Orders and payments are also checked against the owning user's customer record. Do not disable RLS or make these tables publicly readable.

## 2. Configure email authentication

In Supabase Dashboard:

1. Open **Authentication → Providers → Email** and ensure Email is enabled.
2. For account creation, email confirmation can remain enabled. New users will need to click the confirmation link before signing in.
3. Under **Authentication → URL Configuration**, set the Site URL to your local app URL during development (usually `http://localhost:5173`) and add your deployed Vercel URL to Redirect URLs. If using password reset, add both local and production URLs.
4. Create a provider account through the app's **Create an account** screen.

Do not share your database password or secret/service-role key. The browser uses only the project URL and publishable key; RLS protects the records.

## 3. Configure local development

Copy `.env.example` to `.env.local` in the project root and replace the placeholders with the Project URL and publishable key shown in Supabase's **Connect** panel / API settings:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Then run:

```bash
npm install
npm run dev
```

Restart Vite after changing environment variables. Never commit `.env.local`; it is ignored by `.gitignore`.

## 4. Deploy to Vercel

1. Push the project to your Git repository and import it into Vercel (or update your existing project).
2. In **Vercel → Project → Settings → Environment Variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for Preview and Production as needed.
3. Add your Vercel deployment URL to Supabase **Authentication → URL Configuration → Redirect URLs** and set the production Site URL.
4. Redeploy after adding or changing environment variables.

Vite variables prefixed with `VITE_` are included in browser code. They must only contain the publishable key, never the service-role key or database password.

## 5. Existing browser-local provider records

Before replacing the old provider build, open it in the browser that currently contains your records and go to **Settings & backups → Export JSON**. After the Supabase-connected app is running, sign in, open **Settings & backups → Import JSON**, and confirm replacement. This uploads the backup into the signed-in account. Importing replaces that account's current provider records, so export a backup first.

The existing Customer Tracker mode is unchanged and remains local to each browser. Provider records are stored in Supabase. To see edits made in another browser while the app is already open, use **Refresh data** in the provider header. Avoid editing the same order simultaneously in multiple browsers; a conflicting update may fail rather than overwrite silently.

## Database tables

- `provider_settings`: meal prices for the signed-in provider.
- `provider_customers`: customer details and regular meal preferences.
- `provider_orders`: per-customer/date/meal-slot orders and delivery status.
- `provider_payments`: payments allocated to a billing month.

All tables include RLS policies. Never add a policy such as `using (true)` for provider data.
