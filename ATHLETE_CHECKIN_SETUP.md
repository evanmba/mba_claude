# Athlete Weekly Check-In — Setup

A weekly check-in tool for high school athletes. Athletes enter four metrics, and
each submission is stored (keyed by phone number) so they can watch their progress
build week over week.

## What athletes see

- **Public form:** `/check-in` (mobile-first, no login). They enter:
  - Arm Velocity (mph — higher is better)
  - Exit Velocity (mph — higher is better)
  - 60-Yard Dash (seconds — lower is better)
  - 5-10-5 Shuttle (seconds — lower is better)
  - Phone number (the tracking key — the form reminds them to reuse the same number)
  - First name (optional)
- On submit they immediately see a **mobile-friendly line chart** of their progress
  per metric, plus current values and change since Week 1.

The **program week is derived automatically** from the date of the athlete's first
check-in (week 1 = first entry; each 7-day span after is the next week). Athletes are
never asked what week they're on.

## What the coach sees

- The **home screen** (`/`, "Athletes" in the sidebar): every athlete grouped by
  phone number, with their full check-in history, per-metric charts, and week-over-week
  deltas.

## Where the data is stored

Every submission appends a row to a **Google Sheet** you own:

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| submittedAt (ISO) | phone | name | armVelo | exitVelo | sixtyYard | fiveTenFive |

You can open, sort, filter, and export this sheet at any time — it is the durable
system of record.

> If no backend is configured, the app falls back to a local file
> (`.data/athletes.json`) so it still works in development. That file is **not durable
> on serverless hosts** (e.g. Vercel), so configure the Sheet for production.

There are two ways to connect the Sheet — pick **one**:

- **Option 1 — Apps Script Web App (recommended, simplest).** You give the app a
  single URL. No Google Cloud project, no key file.
- **Option 2 — Service account (Sheets API).** Writes stay fully private to your
  server, but setup needs a Google Cloud project + JSON key.

---

## Option 1 — Apps Script Web App (recommended)

1. **Create the Sheet.** New Google Sheet → rename the first tab to `CheckIns`.
   In row 1 add the headers:
   `submittedAt  phone  name  armVelo  exitVelo  sixtyYard  fiveTenFive`

2. **Add the script.** In the Sheet, go to **Extensions → Apps Script**. Delete any
   starter code and paste the entire contents of [`apps-script/CheckIns.gs`](apps-script/CheckIns.gs).
   Change the `TOKEN` constant near the top to your own secret word.

3. **Deploy it.** Click **Deploy → New deployment → Web app**. Set:
   - **Execute as:** Me
   - **Who has access:** Anyone

   Click **Deploy**, authorize when prompted, and **copy the Web app URL** (ends in `/exec`).

4. **Set the environment variables** (see `.env.example`):

   ```bash
   ATHLETE_WEBAPP_URL=https://script.google.com/macros/s/AKfyc.../exec
   ATHLETE_WEBAPP_TOKEN=the_same_secret_you_put_in_the_script
   ```

5. **Redeploy the app.** New check-ins now append to your Sheet.

> **Security note:** A Web App set to "Anyone" is a public endpoint, which is why the
> `TOKEN` matters — only requests carrying your token can read or append. Keep the
> token private (it lives only in the script and your env vars, never in the browser).
> If you ever edit the script, redeploy via **Deploy → Manage deployments → edit → New
> version** so the `/exec` URL stays the same.

---

## Option 2 — Service account (Sheets API)

1. **Create the Sheet.** New Google Sheet → rename the first tab to `CheckIns`.
   In row 1 add the headers (optional but recommended):
   `submittedAt  phone  name  armVelo  exitVelo  sixtyYard  fiveTenFive`
   Copy the spreadsheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/`**`THIS_IS_THE_ID`**`/edit`

2. **Create a service account** (free) that the app uses to write rows:
   - Go to <https://console.cloud.google.com/> → create/select a project.
   - Enable the **Google Sheets API** (APIs & Services → Library → Google Sheets API → Enable).
   - APIs & Services → Credentials → *Create credentials* → **Service account**.
   - Open the new service account → **Keys** → *Add key* → *Create new key* → **JSON**.
     A `.json` key file downloads.

3. **Share the Sheet with the service account.** Open the JSON file and copy the
   `client_email` (looks like `name@project.iam.gserviceaccount.com`). In your Google
   Sheet, click **Share** and give that email **Editor** access.

4. **Set the environment variables** (see `.env.example`). Easiest is to paste the whole
   JSON key into `GOOGLE_SERVICE_ACCOUNT_JSON`:

   ```bash
   ATHLETE_SHEET_ID=your_spreadsheet_id
   ATHLETE_SHEET_TAB=CheckIns
   GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","...":"..."}
   ```

   Or use the two discrete variables instead of the JSON blob:

   ```bash
   GOOGLE_SERVICE_ACCOUNT_EMAIL=name@project.iam.gserviceaccount.com
   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

   On Vercel: Project → Settings → Environment Variables. (When pasting the discrete
   private key, keep the `\n` sequences — the app converts them to real newlines.)

5. **Redeploy / restart.** New check-ins now append to your Sheet, and the home
   screen reads from it. The amber "not configured" banner disappears once the
   credentials are present.

## Notes

- Environment-variable names must match **exactly** as shown above — the app reads
  `ATHLETE_WEBAPP_URL` / `ATHLETE_WEBAPP_TOKEN` (Option 1) or the `ATHLETE_SHEET_ID`
  + `GOOGLE_SERVICE_ACCOUNT_*` names (Option 2). A variable under any other name is
  ignored.
- Phone numbers are normalized to their last 10 digits, so `(555) 123-4567` and
  `5551234567` map to the same athlete.
- The check-in form is intentionally public (no login) to keep athlete friction low.
  The coach roster is the app's home screen.
