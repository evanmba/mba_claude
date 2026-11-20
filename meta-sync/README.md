# meta-sync (Webby Meta Ads sync)

Hourly GitHub Action that pulls Meta Ads numbers into the **[MBA] Webby → Webinar Tracker** Google Sheet.

| Column | Source |
|---|---|
| Amount Spent | Meta spend, all campaigns **except** names containing "Hiring" or "Call Funnel" |
| CPM | spend ÷ impressions × 1000 (same campaigns, same window) |
| LCTR | unique link clicks ÷ reach (Meta's unique link CTR) |
| Page AgeQ Opt-In / Page Conversion Rate | sheet formula: `Age Q Reg ÷ Unique Link Clicks` |
| Unique Link Clicks, Impressions, Reach, Last Synced | helper columns added after Change Log |

**Windows:** each row covers *previous workshop date 7:00pm CT → this workshop date 7:00pm CT*
(Wednesday row = Sun 7pm → Wed 7pm, Sunday row = Wed 7pm → Sun 7pm). Spend/CPM are counted by the hour, so the cutoff is exact.
Unique clicks/reach can't be split by hour, so LCTR uses whole days (day after the window opens → workshop day).

**New rows:** on the first run at/after 7pm CT on a workshop day, the next workshop's row (Wed→Sun, Sun→Wed) is inserted under it,
formulas + formatting copied from the row above, typed-in values cleared.

## Setup

Runs from `.github/workflows/webby-meta-sync.yml` using this repo's existing secrets:
`META_ADS_ACCESS_TOKEN`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`.
Sheet ID and ad account ID are set in the workflow file.

1. Share the **[MBA] Webby** sheet (Editor) with the service account email stored in `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   (the `…@….iam.gserviceaccount.com` address, not a personal Gmail/Workspace address).
2. The Meta token must have access to the GamePlan Media Ad Account.
3. Actions → **Webby Meta Sync (hourly)** → Run workflow → `dry-run`, then `normal`.
   `backfill` (once, optional) fills CPM/LCTR for past rows and leaves historical Amount Spent alone.

This repo is public, so Actions logs print no metric values. For full output run locally with `VERBOSE=1`.

## Notes
- GitHub cron starts "at the top of the hour" but can run several minutes late under load.
- Each hourly run rewrites Amount Spent / CPM / LCTR for the open row (and the row that closed in the last 3h).
- Change excluded campaigns or the cutoff in `src/lib.js` → `CONFIG`.
- Local run: `npm ci && SHEET_ID=… META_AD_ACCOUNT_ID=… META_ADS_ACCESS_TOKEN=… GOOGLE_SERVICE_ACCOUNT_EMAIL=… GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=… VERBOSE=1 npm run sync -- --dry-run`
