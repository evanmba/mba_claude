/**
 * Reliable scheduler for the mba_claude GitHub Actions.
 *
 * GitHub's own cron is best-effort and skips most runs, so this Apps Script
 * (bound to the [MBA] Webby sheet) starts each workflow itself.
 * Hourly jobs start within the first 10 minutes of every hour (Central time);
 * daily jobs start within the first 10 minutes of their hour.
 *
 * Setup:
 *  1. Extensions -> Apps Script, paste this file, save.
 *  2. Project Settings (gear) -> Script properties -> add GITHUB_TOKEN
 *     (fine-grained token, repo evanmba/mba_claude only, Actions: Read and write).
 *  3. Select `setup` -> Run -> approve permissions.
 *  (Updating the code later: paste + save is enough; no need to re-run setup.)
 */

const GH = {
  REPO: 'evanmba/mba_claude',
  REF: 'claude/build-cms-dashboard-poFYa', // repo default branch
  TZ: 'America/Chicago',
};

// hourCT: null = every hour; a number = once a day at that hour (Central time).
const JOBS = [
  { workflow: 'webby-meta-sync.yml',     hourCT: null, inputs: { mode: 'normal' } }, // Webby Meta Sync
  { workflow: 'update-campaign-ads.yml', hourCT: null, inputs: {} },                 // Update Campaign Ads
  { workflow: 'update-today-meta.yml',   hourCT: null, inputs: {} },                 // Call Funnel Data
  { workflow: 'sync-meta-ads.yml',       hourCT: 5,    inputs: {} },                 // Master Tracker, 6am ET
];

/** Run once: installs the 10-minute trigger and starts every hourly job right away. */
function setup() {
  if (!token_()) throw new Error('Add GITHUB_TOKEN under Project Settings -> Script properties first.');
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'tick')
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('tick').timeBased().everyMinutes(10).create();
  JOBS.filter((j) => j.hourCT === null).forEach(dispatch_);
}

/** Fires every 10 min; starts each due job once per hour, in the first 10 minutes. */
function tick() {
  const now = new Date();
  const minute = Number(Utilities.formatDate(now, GH.TZ, 'm'));
  if (minute >= 10) return;
  const hour = Number(Utilities.formatDate(now, GH.TZ, 'H'));
  const hourKey = Utilities.formatDate(now, GH.TZ, 'yyyy-MM-dd HH');
  const props = PropertiesService.getScriptProperties();
  const errors = [];
  JOBS.forEach((job) => {
    if (job.hourCT !== null && job.hourCT !== hour) return;
    const key = 'LAST_' + job.workflow;
    if (props.getProperty(key) === hourKey) return;
    try {
      dispatch_(job);
      props.setProperty(key, hourKey);
    } catch (e) {
      errors.push(e.message);
    }
  });
  if (errors.length) throw new Error(errors.join('\n')); // shows up in Apps Script > Executions
}

/** Manual helper: start the Webby sync now. */
function runSyncNow() {
  dispatch_(JOBS[0]);
}

function dispatch_(job) {
  const url = `https://api.github.com/repos/${GH.REPO}/actions/workflows/${job.workflow}/dispatches`;
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + token_(),
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    payload: JSON.stringify({ ref: GH.REF, inputs: job.inputs }),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 204) {
    throw new Error(`${job.workflow}: GitHub dispatch failed (${res.getResponseCode()}): ${res.getContentText()}`);
  }
}

function token_() {
  return PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
}
