/**
 * Apply red → yellow → green gradient conditional formatting to IG post log columns.
 *
 * HOW TO RUN:
 *   1. Open your Google Sheet
 *   2. Extensions → Apps Script
 *   3. Paste this entire file, replacing any existing code
 *   4. Click Run → applyIGConditionalFormatting
 *   5. Approve permissions when prompted
 */

function applyIGConditionalFormatting() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('DATA');

  if (!sheet) {
    SpreadsheetApp.getUi().alert('Sheet "DATA" not found!');
    return;
  }

  const allData = sheet.getDataRange().getValues();

  // ── Find the IG post log header row ──────────────────────────────────────────
  // It's the row that contains both "reach 24h" and "likes 24h"
  let headerRowIndex = -1;
  let headers = [];

  for (let i = 0; i < allData.length; i++) {
    const joined = allData[i].join(',').toLowerCase();
    const hasReach24 = joined.includes('reach 24h') || joined.includes('reach(24h)') || joined.includes('reach (24h)');
    const hasLikes24 = joined.includes('likes 24h') || joined.includes('likes(24h)') || joined.includes('likes (24h)');
    if (hasReach24 && hasLikes24) {
      headerRowIndex = i;
      headers = allData[i].map(h => String(h).toLowerCase().trim());
      break;
    }
  }

  if (headerRowIndex === -1) {
    SpreadsheetApp.getUi().alert('Could not find the IG post log header row.\nMake sure the DATA sheet has columns "Reach 24h" and "Likes 24h".');
    return;
  }

  // ── Column definitions ────────────────────────────────────────────────────────
  // Each entry: { label, keywords that ALL must appear in the header, optional excludeKeywords }
  const targetColumns = [
    { label: 'Reach 24h',                keywords: ['reach', '24'],            exclude: [] },
    { label: 'Avg Total Watch Time (sec)', keywords: ['watch'],                 exclude: [] },
    { label: 'Likes 24h',                keywords: ['likes', '24'],            exclude: [] },
    { label: 'Shares 24h',               keywords: ['shares', '24'],           exclude: [] },
    { label: 'Follows 24h',              keywords: ['follows', '24'],          exclude: [] },
    { label: 'Reach:Like',               keywords: ['reach', 'like'],          exclude: ['24'] },
    { label: 'Reach:Shares',             keywords: ['reach', 'share'],         exclude: ['24'] },
    { label: 'Reach:Followers',          keywords: ['reach', 'follow'],        exclude: ['24'] },
  ];

  // ── Resolve column indices ────────────────────────────────────────────────────
  const resolved = targetColumns.map(target => {
    const idx = headers.findIndex(h => {
      const allMatch  = target.keywords.every(k => h.includes(k));
      const noneExcld = target.exclude.every(e => !h.includes(e));
      return allMatch && noneExcld;
    });
    return { label: target.label, colIndex: idx };
  });

  const notFound = resolved.filter(r => r.colIndex === -1).map(r => r.label);
  if (notFound.length > 0) {
    console.log('Columns not found: ' + notFound.join(', '));
  }

  // ── Determine data range ──────────────────────────────────────────────────────
  const lastRow     = sheet.getLastRow();
  const dataStartRow = headerRowIndex + 2; // +1 for 1-based, +1 to skip the header row itself
  const numDataRows  = lastRow - dataStartRow + 1;

  if (numDataRows <= 0) {
    SpreadsheetApp.getUi().alert('No data rows found below the header row!');
    return;
  }

  // ── Build & apply conditional format rules ────────────────────────────────────
  // Keep existing rules so we don't wipe unrelated formatting
  const existingRules = sheet.getConditionalFormatRules();

  // Remove any old rules that overlap our target columns (to avoid duplicates)
  const cleanRules = existingRules.filter(rule => {
    const ruleRanges = rule.getRanges();
    return !ruleRanges.some(rng => {
      const rCol = rng.getColumn();
      return resolved.some(r => r.colIndex >= 0 && rCol === r.colIndex + 1);
    });
  });

  const newRules = [...cleanRules];

  resolved.forEach(({ label, colIndex }) => {
    if (colIndex === -1) {
      console.log('Skipping not-found column: ' + label);
      return;
    }

    const colNum = colIndex + 1; // Sheets API is 1-based
    const range  = sheet.getRange(dataStartRow, colNum, numDataRows, 1);

    const rule = SpreadsheetApp.newConditionalFormatRule()
      // Red   = minimum value (lowest performers)
      .setGradientMinpointWithValue('#FF0000', SpreadsheetApp.InterpolationType.MIN, '0')
      // Yellow = 50th percentile (median)
      .setGradientMidpointWithValue('#FFFF00', SpreadsheetApp.InterpolationType.PERCENTILE, '50')
      // Green  = maximum value (outliers / best performers)
      .setGradientMaxpointWithValue('#00B050', SpreadsheetApp.InterpolationType.MAX, '0')
      .setRanges([range])
      .build();

    newRules.push(rule);
    console.log('Applied: ' + label + ' → col ' + colNum + ', rows ' + dataStartRow + '–' + lastRow);
  });

  sheet.setConditionalFormatRules(newRules);
  SpreadsheetApp.flush();

  const applied = resolved.filter(r => r.colIndex >= 0).map(r => r.label);
  SpreadsheetApp.getUi().alert(
    '✅ Conditional formatting applied!\n\n' +
    'Columns formatted:\n• ' + applied.join('\n• ') +
    (notFound.length > 0 ? '\n\n⚠️ Not found:\n• ' + notFound.join('\n• ') : '')
  );
}
