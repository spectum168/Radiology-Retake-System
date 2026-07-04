export interface RejectRecord {
  id: string;
  date: string;       // YYYY-MM-DD or raw string
  dateObj: Date | null;
  staff: string;      // ชื่อเจ้าหน้าที่
  room: string;       // ชื่อห้อง
  position: string;   // Position / ท่าตรวจ / อวัยวะ
  shift: string;      // เวร (เช้า, บ่าย, ดึก)
  cause: string;      // สาเหตุถ่ายภาพเสีย
  quantity: number;   // จำนวน
  rawRow: string[];   // For backup and reference
  rowIndex: number;   // The row number in Google Sheet (0-based or 1-based for editing)
}

export interface SettingsConfig {
  staffs: string[];
  rooms: string[];
  positions: string[];
  shifts: string[];
  causes: string[];
}

export type ChartType = 'bar' | 'pie' | 'line' | 'area' | 'radar';

export interface FilterState {
  startDate: string;
  endDate: string;
  staff: string;
  room: string;
  position: string;
  shift: string;
  cause: string;
}

/**
 * Detect headers and map columns dynamically
 */
export function parseRejectRecords(rows: string[][], settings?: SettingsConfig): RejectRecord[] {
  if (rows.length === 0) return [];

  // Filter out completely empty rows at the top first to locate header properly
  const cleanRows = rows.filter(row => row.length > 0 && row.some(cell => cell.trim() !== ''));
  if (cleanRows.length === 0) return [];

  // Find header row (usually row 0, but check first few rows)
  let headerIndex = -1;
  for (let i = 0; i < Math.min(5, cleanRows.length); i++) {
    const r = cleanRows[i];
    const hasDate = r.some(cell => /วัน|เวลา|date|time/i.test(cell));
    const hasStaff = r.some(cell => /เจ้าหน้าที่|ชื่อ|ผู้ถ่าย|ผู้ตรวจ|staff|name/i.test(cell));
    if (hasDate || hasStaff) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    headerIndex = 0;
  }

  const headers = cleanRows[headerIndex].map(h => h.trim());
  const dataRows = cleanRows.slice(headerIndex + 1);

  // Map header indexes using regex
  const colIndex = {
    date: headers.findIndex(h => /วัน|เวลา|date|time/i.test(h)),
    staff: headers.findIndex(h => /เจ้าหน้าที่|ผู้ถ่าย|ผู้ตรวจ|staff|name/i.test(h) || (/ชื่อ/i.test(h) && !/ห้อง|เครื่อง|ท่า|สาเหตุ|position|cause|room|machine|device/i.test(h))),
    room: headers.findIndex(h => /ห้อง|เครื่อง|room|machine|device/i.test(h)),
    position: headers.findIndex(h => /ท่า|position|exam|อวัยวะ|body/i.test(h)),
    shift: headers.findIndex(h => /เวร|shift|period/i.test(h)),
    cause: headers.findIndex(h => /สาเหตุ|cause|defect/i.test(h)),
    quantity: headers.findIndex(h => /จำนวน|qty|quantity|count/i.test(h))
  };

  // If settings are available, run a heuristic to resolve or verify column mappings by values
  if (settings && dataRows.length > 0) {
    const sampleRows = dataRows.slice(0, 30); // inspect first 30 rows
    const numCols = Math.max(...sampleRows.map(r => r.length), headers.length);
    
    const scores = Array.from({ length: numCols }, () => ({
      staff: 0,
      room: 0,
      position: 0,
      shift: 0,
      cause: 0,
      date: 0,
      quantity: 0
    }));

    sampleRows.forEach(row => {
      row.forEach((cell, cIdx) => {
        const val = cell.trim();
        if (!val) return;

        // 1. Test Date
        if (/^\d{4}-\d{2}-\d{2}$/.test(val) || /^\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}$/.test(val)) {
          scores[cIdx].date += 2;
        }

        // 2. Test Quantity
        if (/^\d+$/.test(val) && parseInt(val, 10) < 50) {
          scores[cIdx].quantity += 1.5;
        }

        // 3. Match against Settings lists
        const lowerVal = val.toLowerCase();
        if (settings.staffs.some(s => {
          const lowerS = s.toLowerCase();
          return lowerS === lowerVal || lowerVal.includes(lowerS) || lowerS.includes(lowerVal);
        })) {
          scores[cIdx].staff += 3;
        }
        if (settings.rooms.some(r => {
          const lowerR = r.toLowerCase();
          return lowerR === lowerVal || lowerVal.includes(lowerR) || lowerR.includes(lowerVal);
        })) {
          scores[cIdx].room += 3;
        }
        if (settings.positions.some(p => {
          const lowerP = p.toLowerCase();
          return lowerP === lowerVal || lowerVal.includes(lowerP) || lowerP.includes(lowerVal);
        })) {
          scores[cIdx].position += 3;
        }
        if (settings.shifts.some(s => {
          const lowerS = s.toLowerCase();
          return lowerS === lowerVal || lowerVal.includes(lowerS) || lowerS.includes(lowerVal);
        })) {
          scores[cIdx].shift += 3;
        }
        if (settings.causes.some(c => {
          const lowerC = c.toLowerCase();
          return lowerC === lowerVal || lowerVal.includes(lowerC) || lowerC.includes(lowerVal);
        })) {
          scores[cIdx].cause += 3;
        }
      });
    });

    const findBestCol = (category: keyof typeof scores[0]) => {
      let bestIdx = -1;
      let maxScore = 0;
      scores.forEach((sc, idx) => {
        if (sc[category] > maxScore) {
          maxScore = sc[category];
          bestIdx = idx;
        }
      });
      return { index: bestIdx, score: maxScore };
    };

    // Override matched columns if scoring gives a clear winner
    const bestDate = findBestCol('date');
    if (bestDate.score >= 4) colIndex.date = bestDate.index;

    const bestStaff = findBestCol('staff');
    if (bestStaff.score >= 4) colIndex.staff = bestStaff.index;

    const bestRoom = findBestCol('room');
    if (bestRoom.score >= 4) colIndex.room = bestRoom.index;

    const bestPosition = findBestCol('position');
    if (bestPosition.score >= 4) colIndex.position = bestPosition.index;

    const bestShift = findBestCol('shift');
    if (bestShift.score >= 4) colIndex.shift = bestShift.index;

    const bestCause = findBestCol('cause');
    if (bestCause.score >= 4) colIndex.cause = bestCause.index;

    const bestQty = findBestCol('quantity');
    if (bestQty.score >= 4) colIndex.quantity = bestQty.index;
  }

  // Fallbacks if columns are not matched (by index)
  if (colIndex.date === -1) colIndex.date = 0;
  if (colIndex.staff === -1) colIndex.staff = 1 < headers.length ? 1 : 0;
  if (colIndex.room === -1) colIndex.room = 2 < headers.length ? 2 : 0;
  if (colIndex.position === -1) colIndex.position = 3 < headers.length ? 3 : 0;
  if (colIndex.shift === -1) colIndex.shift = 4 < headers.length ? 4 : 0;
  if (colIndex.cause === -1) colIndex.cause = 5 < headers.length ? 5 : 0;
  if (colIndex.quantity === -1) colIndex.quantity = 6 < headers.length ? 6 : -1;

  const records: RejectRecord[] = [];

  dataRows.forEach((row, idx) => {
    // Skip empty rows
    if (row.length === 0 || row.every(cell => !cell || cell.trim() === '')) return;

    const getCell = (colIdx: number, defaultVal = '') => {
      if (colIdx >= 0 && colIdx < row.length) {
        return row[colIdx].trim();
      }
      return defaultVal;
    };

    const rawDate = getCell(colIndex.date);
    let parsedDate = '';
    let dateObj: Date | null = null;

    if (rawDate) {
      parsedDate = rawDate;
      try {
        const dmyMatch = rawDate.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/);
        if (dmyMatch) {
          let day = parseInt(dmyMatch[1], 10);
          let month = parseInt(dmyMatch[2], 10) - 1;
          let year = parseInt(dmyMatch[3], 10);
          if (year > 2400) year -= 543; // convert Buddhist year to AD
          dateObj = new Date(year, month, day);
          parsedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        } else {
          const testD = new Date(rawDate);
          if (!isNaN(testD.getTime())) {
            dateObj = testD;
            parsedDate = testD.toISOString().split('T')[0];
          }
        }
      } catch (e) {
        console.warn('Error parsing date:', rawDate, e);
      }
    }

    const qtyStr = getCell(colIndex.quantity);
    let quantity = 1;
    if (qtyStr) {
      const parsedQty = parseInt(qtyStr, 10);
      if (!isNaN(parsedQty)) {
        quantity = parsedQty;
      }
    }

    records.push({
      id: `row-${headerIndex + 1 + idx + 1}`,
      date: parsedDate || rawDate,
      dateObj,
      staff: getCell(colIndex.staff) || 'ไม่ระบุ',
      room: getCell(colIndex.room) || 'ไม่ระบุ',
      position: getCell(colIndex.position) || 'ไม่ระบุ',
      shift: getCell(colIndex.shift) || 'ไม่ระบุ',
      cause: getCell(colIndex.cause) || 'ไม่ระบุ',
      quantity,
      rawRow: row,
      rowIndex: headerIndex + 1 + idx + 1
    });
  });

  return records;
}

/**
 * Parses settings columns from Sheet A1:Z100
 * Assumes column headers represent setting lists
 */
export function parseSettingsConfig(rows: string[][]): SettingsConfig {
  const config: SettingsConfig = {
    staffs: [],
    rooms: [],
    positions: [],
    shifts: [],
    causes: []
  };

  if (rows.length === 0) return config;

  // Filter out completely empty rows
  const cleanRows = rows.filter(row => row.length > 0 && row.some(cell => cell.trim() !== ''));
  if (cleanRows.length === 0) return config;

  // Find actual header row with high confidence
  let headerIndex = -1;
  for (let i = 0; i < Math.min(10, cleanRows.length); i++) {
    const r = cleanRows[i].map(c => c.trim());
    const nonCount = r.filter(c => c !== '').length;
    
    const hasStaff = r.some(cell => /เจ้าหน้าที่|ชื่อ|staff|user|name/i.test(cell));
    const hasRoom = r.some(cell => /ห้อง|เครื่อง|room|machine|device/i.test(cell));
    const hasPos = r.some(cell => /ท่า|position|exam|อวัยวะ/i.test(cell));
    const hasShift = r.some(cell => /เวร|shift|period/i.test(cell));
    const hasCause = r.some(cell => /สาเหตุ|cause|defect/i.test(cell));

    const matchCount = [hasStaff, hasRoom, hasPos, hasShift, hasCause].filter(Boolean).length;
    if (matchCount >= 2 || (nonCount >= 3 && headerIndex === -1)) {
      headerIndex = i;
      if (matchCount >= 3) {
        break;
      }
    }
  }

  if (headerIndex === -1) {
    headerIndex = 0;
  }

  const headers = cleanRows[headerIndex].map(h => h.trim());
  const maxRowLength = Math.max(...cleanRows.map(r => r.length), 5);

  const colIndexes = {
    staff: headers.findIndex(h => /เจ้าหน้าที่|ผู้ตรวจ|staff|user/i.test(h) || (/ชื่อ/i.test(h) && !/ห้อง|เครื่อง|ท่า|สาเหตุ|position|cause|room|machine|device/i.test(h))),
    room: headers.findIndex(h => /ห้อง|เครื่อง|room|machine|device/i.test(h)),
    position: headers.findIndex(h => /ท่า|position|exam|อวัยวะ/i.test(h)),
    shift: headers.findIndex(h => /เวร|shift|period/i.test(h)),
    cause: headers.findIndex(h => /สาเหตุ|cause|defect/i.test(h))
  };

  // Fallbacks if not found by name, map to cols 0, 1, 2, 3, 4
  if (colIndexes.staff === -1) colIndexes.staff = 0;
  if (colIndexes.room === -1) colIndexes.room = 1 < maxRowLength ? 1 : -1;
  if (colIndexes.position === -1) colIndexes.position = 2 < maxRowLength ? 2 : -1;
  if (colIndexes.shift === -1) colIndexes.shift = 3 < maxRowLength ? 3 : -1;
  if (colIndexes.cause === -1) colIndexes.cause = 4 < maxRowLength ? 4 : -1;

  const dataRows = cleanRows.slice(headerIndex + 1);

  const getColList = (idx: number): string[] => {
    if (idx === -1) return [];
    return dataRows
      .map(row => (idx < row.length ? row[idx].trim() : ''))
      .filter(val => val !== '');
  };

  config.staffs = getColList(colIndexes.staff);
  config.rooms = getColList(colIndexes.room);
  config.positions = getColList(colIndexes.position);
  config.shifts = getColList(colIndexes.shift);
  config.causes = getColList(colIndexes.cause);

  return config;
}

/**
 * Format a settings config into spreadsheet rows (A1:E100 format)
 */
export function formatSettingsConfig(config: SettingsConfig): string[][] {
  const headers = ['ชื่อเจ้าหน้าที่', 'ชื่อห้องตรวจ', 'Position / ท่าตรวจ', 'เวร', 'สาเหตุถ่ายภาพเสีย'];
  const maxLen = Math.max(
    config.staffs.length,
    config.rooms.length,
    config.positions.length,
    config.shifts.length,
    config.causes.length
  );

  const rows: string[][] = [headers];

  for (let i = 0; i < maxLen; i++) {
    rows.push([
      config.staffs[i] || '',
      config.rooms[i] || '',
      config.positions[i] || '',
      config.shifts[i] || '',
      config.causes[i] || ''
    ]);
  }

  return rows;
}
