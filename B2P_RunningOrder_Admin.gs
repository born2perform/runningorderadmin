// ============================================================
// B2P Running Order Admin — Standalone Apps Script
// ============================================================
// SETUP:
// 1. Go to script.google.com → New project
// 2. Paste this entire file
// 3. Set SHEET_ID below to your Google Sheet ID
// 4. Deploy as Web App:
//    - Execute as: Me
//    - Who has access: Anyone
// 5. Copy the deployment URL into the GitHub Pages app config
// ============================================================

const SHEET_ID       = 'YOUR_SHEET_ID_HERE'; // ← REPLACE THIS
const SHEET_NAME     = 'Running Order';
const DATA_START_ROW = 5;

// Colours that mean "normal/empty — standard or spacer"
const WHITE_COLOURS = ['#ffffff', '#fff', '', null];

// ============================================================
// GET — serves running order JSON to the admin app
// ============================================================
function doGet(e) {
  try {
    const ss    = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return jsonError('Sheet not found');

    const lastRow = sheet.getLastRow();
    if (lastRow < DATA_START_ROW) return jsonOut({ compName: '', awardOptions: [], rows: [] });

    const numRows = lastRow - DATA_START_ROW + 1;

    // getDisplayValues returns exactly what the cell shows (fixes Date formatting)
    const displayVals = sheet.getRange(DATA_START_ROW, 1, numRows, 6).getDisplayValues();
    // getValues still needed for done (checkbox boolean) and backgrounds
    const rawVals     = sheet.getRange(DATA_START_ROW, 1, numRows, 6).getValues();
    const bgs         = sheet.getRange(DATA_START_ROW, 1, numRows, 6).getBackgrounds();

    // Competition name from D2
    const compName = sheet.getRange(2, 4).getDisplayValue();

    // Award options: read from H5 across until empty (up to 50 cols to be safe)
    const awardRow     = sheet.getRange(5, 8, 1, 50).getDisplayValues()[0];
    const awardOptions = awardRow.filter(v => v && v.toString().trim() !== '');

    const rows = [];

    displayVals.forEach((row, i) => {
      // Columns: A=0 B=1 C=2 D=3 E=4 F=5
      const timeStr   = (row[1] || '').toString().trim();
      const schoolStr = (row[2] || '').toString().trim();
      const teamStr   = (row[3] || '').toString().trim();
      const awardStr  = (row[5] || '').toString().trim();

      // Done comes from raw values (checkbox boolean)
      const doneVal = rawVals[i][4] === true;

      // Background from col C
      const bg = (bgs[i][2] || '').toLowerCase();
      const isWhiteBg = WHITE_COLOURS.indexOf(bg) !== -1;

      // ── Classification ────────────────────────────────────
      // 1. All cells empty → spacer
      if (!timeStr && !schoolStr && !teamStr) {
        rows.push({ rowType: 'spacer', rowIndex: DATA_START_ROW + i });
        return;
      }

      // 2. Team column has content → always standard
      if (teamStr) {
        rows.push({
          rowIndex:  DATA_START_ROW + i,
          rowType:   'standard',
          time:      timeStr,
          school:    schoolStr,
          team:      teamStr,
          done:      doneVal,
          awardText: awardStr
        });
        return;
      }

      // 3 & 4. No team content — special row
      let rowType = null;

      if (!isWhiteBg) {
        rowType = classifyByColour(bg) || classifyByKeyword(schoolStr);
      } else {
        rowType = classifyByKeyword(schoolStr);
      }

      if (!rowType) rowType = 'standard';

      rows.push({
        rowIndex:  DATA_START_ROW + i,
        rowType:   rowType,
        rowColour: isWhiteBg ? null : bg,
        time:      timeStr,
        school:    schoolStr,
        team:      teamStr,
        done:      doneVal,
        awardText: awardStr
      });
    });

    return jsonOut({ compName, awardOptions, rows });

  } catch (err) {
    return jsonError(err.toString());
  }
}

// ============================================================
// POST — receives done/award updates from the admin app
// ============================================================
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const { rowIndex, done, awardText } = payload;

    if (!rowIndex) return jsonError('Missing rowIndex');

    const ss    = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return jsonError('Sheet not found');

    if (typeof done !== 'undefined') {
      sheet.getRange(rowIndex, 5).setValue(done === true);
    }

    // awardText may be a pipe-separated list for multi-award rows
    if (typeof awardText !== 'undefined') {
      sheet.getRange(rowIndex, 6).setValue(awardText);
    }

    return jsonOut({ success: true, rowIndex });

  } catch (err) {
    return jsonError(err.toString());
  }
}

// ============================================================
// Helpers
// ============================================================
function classifyByColour(bg) {
  if (bg === '#f1c232' || bg === '#f3f3f3') return 'award';
  if (bg === '#4a86e8') return 'break';
  if (bg === '#8e7cc3') return 'danceoff';
  return null; // unknown colour — let keyword decide
}

function classifyByKeyword(text) {
  const t = text.toLowerCase();
  if (t.includes('awards') || t.includes('award')) return 'award';
  if (t.includes('lunch')  || t.includes('break')) return 'break';
  if (t.includes('dance off') || t.includes('wildcard')) return 'danceoff';
  return null;
}

function jsonOut(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonError(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}
