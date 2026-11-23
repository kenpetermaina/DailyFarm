# DairyFarm Manager

A web app for dairy farmers to register cows, record milk at each milking (morning, lunch, evening),
and see daily, weekly and monthly production with PDF and Excel reports.

**Stack:** React + Vite, React Router, Lucide icons, Recharts, jsPDF, SheetJS (XLSX), Supabase (PostgreSQL, Auth, Row Level Security, Storage).

## 1. Create the Supabase project
1. Go to <https://supabase.com>, create a project and wait for it to finish starting.
2. Open **SQL Editor** and run, in this order (paste the whole file each time):
   1. `supabase/migrations/001_schema.sql` — tables, constraints, indexes, triggers, security policies, photo storage.
   2. `supabase/migrations/002_sample_data_functions.sql` — optional sample-data helpers (needed for the Settings "Load sample data" button).
3. **Project Settings → API**: copy the **Project URL** and the **anon / publishable key**.
4. *(Optional, recommended while testing)* **Authentication → Providers → Email**: turn off "Confirm email" so new accounts can log in straight away. If you leave it on, new users get a confirmation email first (the app handles both).
5. **Authentication → URL Configuration**: add `http://localhost:5173` (and your live address later) to *Site URL / Redirect URLs*. Password-reset emails link back to `/reset-password`.

## 2. Run it locally
```bash
npm install
cp .env.example .env      # then edit .env with your URL and anon key
npm run dev               # http://localhost:5173
```
Register a farm account, then optionally go to **Settings → Load sample data** to see the app with five test cows
(Daisy, Bella, Misty, Rose, Lucy) and 45 days of records. Sample rows are marked "Sample" and can be removed
at any time without touching real records.

`npm run build` creates a production build in `dist/` that you can host on any static host (Netlify, Vercel, Cloudflare Pages…).
Configure a redirect of all paths to `index.html` so links like `/reset-password` work.

## 3. Security model
* The browser only ever uses the **anon/publishable key**. Never put the `service_role` key in `.env`.
* Row Level Security is on for `profiles`, `farms`, `cows` and `milk_records`. A user can only read or change rows belonging to their own farm.
* A database trigger stops anyone recording milk against a cow from another farm, even if they send a forged request.
* Sign-up creates the profile and farm inside the database (trigger on `auth.users`), so it works even with email confirmation on.
* Cows cannot be deleted (only deactivated) and a cow that has milk records can never be removed, so history is kept.
* Data is validated in the forms **and** in the database (`quantity > 0`, session is one of MORNING/LUNCH/EVENING, unique cow+date+session, unique ear tag per farm).
* Cow photos live in a public storage bucket under `<farm_id>/…`; only the farm owner can upload, replace or delete them. Anyone with a photo's exact (random) URL can view it.

## 4. Project structure
```
src/
  components/  Layout, charts, modals, forms, shared UI
  context/     Auth, toasts, "data changed" refresh signal
  pages/       Login, Register, ForgotPassword, ResetPassword, Dashboard, Cows, CowDetail,
               RecordMilk, MilkRecords, Reports, Settings
  services/    All Supabase queries (no queries inside UI components)
  utils/       Dates (farm-local), aggregation, validation, report builder, PDF/Excel export
  styles/      app.css
supabase/
  migrations/  001_schema.sql, 002_sample_data_functions.sql
  seed.sql     Optional sample data from the SQL editor
```

## 5. Notes
* **Dates** are plain local calendar days (`YYYY-MM-DD`) taken from the farmer's device, so "today" matches the farm, not UTC. Weeks run Monday–Sunday.
* **Average per cow** on the dashboard = today's milk ÷ active cows. In reports it is the period total ÷ active cows.
* Lists and charts fetch in pages of 1,000 rows, so large histories are not silently cut off by Supabase's default limit.
* The `xlsx` package from npm is version 0.18.5, the last one published there. It is used only to *write* files in this app.
