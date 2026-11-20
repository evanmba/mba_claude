import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cutoffInstant, nextWorkshopYmd, parseKey, isExcluded, sumHourly, ymdIn, colLetter } from '../src/lib.js';

test('7pm CT cutoff handles CST and CDT', () => {
  assert.equal(cutoffInstant([2026, 11, 22]).toISOString(), '2026-11-23T01:00:00.000Z'); // CST
  assert.equal(cutoffInstant([2026, 7, 15]).toISOString(), '2026-07-16T00:00:00.000Z');  // CDT
  assert.equal(cutoffInstant([2026, 3, 8]).toISOString(), '2026-03-09T00:00:00.000Z');   // DST start day
});

test('Wed -> Sun -> Wed cadence', () => {
  assert.deepEqual(nextWorkshopYmd([2026, 11, 18]), [2026, 11, 22]); // Wed -> Sun
  assert.deepEqual(nextWorkshopYmd([2026, 11, 22]), [2026, 11, 25]); // Sun -> Wed
  assert.deepEqual(nextWorkshopYmd([2026, 12, 30]), [2027, 1, 3]);   // year rollover
});

test('parses sheet keys', () => {
  assert.deepEqual(parseKey('11/8/2026 9:00 PM'), { ymd: [2026, 11, 8], timeText: '9:00 PM' });
  assert.equal(parseKey('Webinar Date & Time (key)'), null);
});

test('excludes hiring + retarget call funnel only', () => {
  assert.ok(isExcluded('Hiring | Athlete Success Manager'));
  assert.ok(isExcluded('RETARGET | Call Funnel'));
  assert.ok(!isExcluded('SCALING | Offer Winners'));
  assert.ok(!isExcluded("BOF Hammer 'Em | ThruPlays"));
});

test('hourly sum respects 7pm CT window edges', () => {
  const start = cutoffInstant([2026, 11, 22]); // Sun 7pm CT
  const end = cutoffInstant([2026, 11, 25]);   // Wed 7pm CT
  const h = (date, hour, spend, name = 'SCALING | Offer Winners') => ({
    campaign_name: name, date_start: date, spend: String(spend), impressions: '1000',
    hourly_stats_aggregated_by_advertiser_time_zone: `${String(hour).padStart(2, '0')}:00:00 - ${String(hour).padStart(2, '0')}:59:59`,
  });
  const rows = [
    h('2026-11-22', 18, 1),   // Sun 6pm CT: before window
    h('2026-11-22', 19, 10),  // Sun 7pm CT: in
    h('2026-11-25', 18, 100), // Wed 6pm CT: in
    h('2026-11-25', 19, 1000),// Wed 7pm CT: next window
    h('2026-11-23', 12, 5, 'RETARGET | Call Funnel'), // excluded
  ];
  assert.deepEqual(sumHourly(rows, start, end, 'America/Chicago'), { spend: 110, impressions: 2000 });
});

test('misc helpers', () => {
  assert.equal(ymdIn(new Date('2026-11-23T01:30:00Z'), 'America/Chicago'), '2026-11-22');
  assert.equal(colLetter(40), 'AN');
});

import { footerFormulas, FOOTER_SUM_COLS, FOOTER_RATIO_COLS } from '../src/lib.js';
test('footer formulas use sums and window ranges', () => {
  const names = [...FOOTER_SUM_COLS, ...Object.keys(FOOTER_RATIO_COLS)];
  const headerCols = Object.fromEntries(names.map((n, i) => [n.toLowerCase(), i + 2]));
  const f = footerFormulas(headerCols, 44, 38, 41);
  const col = (n) => headerCols[n.toLowerCase()];
  assert.equal(f[col('Amount Spent')], '=SUM(B38:B41)');
  assert.match(f[col('CPM')], /^=IFERROR\(SUMPRODUCT\([A-Z]+38:[A-Z]+41,[A-Z]+38:[A-Z]+41\)\/[A-Z]+44,""\)$/);
  assert.match(f[col('Upsell %')], /^=IF\([A-Z]+44=0,"",[A-Z]+44\/[A-Z]+44\)$/);
  assert.equal(Object.keys(f).length, names.length);
});
