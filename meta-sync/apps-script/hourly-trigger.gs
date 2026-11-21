/**
 * Hourly kicker for the "Webby Meta Sync (hourly)" GitHub Action.
 *
 * GitHub's own cron is best-effort and skips most runs, so this Apps Script
 * (bound to the [MBA] Webby sheet) starts the workflow once per hour, within
 * the first 10 minutes of the hour.
 *
 * Setup:
 *  1. Extensions -> Apps Script, paste this file, save.
 *  2. Project Settings (gear) -> Script properties -> add GITHUB_TOKEN
 *     (fine-grained token, repo evanmba/mba_claude only, Actions: Read and write).
 *  3. Select `setup` -> Run -> approve permissions.
 */

const GH = {
  REPO: 'evanmba/mba_claude',
  WORKFLOW: 'webby-meta-sync.yml',
  REF: 'claude/build-cms-dashboard-poFYa', // repo default branch
};

/** Run once: installs the 10-minute trigger and kicks one sync right away. */
function setup() {
  if (!token_()) throw new Error('Add GITHUB_TOKEN under Project Settings -> Script properties first.');
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'tick')
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('tick').timeBased().everyMinutes(10).create();
  runSyncNow();
}

/** Fires every 10 min; starts the workflow once per hour, in the first 10 minutes. */
function tick() {
  const now = new Date();
  const tz = 'America/Chicago';
  const minute = Number(Utilities.formatDate(now, tz, 'm'));
  const hourKey = Utilities.formatDate(now, tz, 'yyyy-MM-dd HH');
  const props = PropertiesService.getScriptProperties();
  if (minute >= 10 || props.getProperty('LAST_DISPATCH_HOUR') === hourKey) return;
  runSyncNow();
  props.setProperty('LAST_DISPATCH_HOUR', hourKey);
}

/** Starts the GitHub workflow immediately (also handy to run by hand). */
function runSyncNow() {
  const url = `https://api.github.com/repos/${GH.REPO}/actions/workflows/${GH.WORKFLOW}/dispatches`;
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + token_(),
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    payload: JSON.stringify({ ref: GH.REF, inputs: { mode: 'normal' } }),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 204) {
    throw new Error(`GitHub dispatch failed (${res.getResponseCode()}): ${res.getContentText()}`);
  }
}

function token_() {
  return PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
}
