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
export function parseRejectRecords(rows: string[][]): RejectRecord[] {
  if (rows.length === 0) return [];

  // Find header row (usually row 0, but let's check first 3 rows in case of empty rows or metadata)
  let headerIndex = -1;
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const r = rows[i];
    // A valid header row should contain keywords of our data
    const hasDate = r.some(cell => /วัน|เวลา|date|time/i.test(cell));
    const hasStaff = r.some(cell => /เจ้าหน้าที่|ชื่อ|ผู้ถ่าย|ผู้ตรวจ|staff|name/i.test(cell));
    if (hasDate || hasStaff) {
      headerIndex = i;
      break;
    }
  }

  // If no header found, assume row 0
  if (headerIndex === -1) {
    headerIndex = 0;
  }

  const headers = rows[headerIndex].map(h => h.trim());
  const dataRows = rows.slice(headerIndex + 1);

  // Map header indexes
  const colIndex = {
    date: headers.findIndex(h => /วัน|เวลา|date|time/i.test(h)),
    staff: headers.findIndex(h => /เจ้าหน้าที่|ชื่อ|ผู้ถ่าย|ผู้ตรวจ|staff|name/i.test(h)),
    room: headers.findIndex(h => /ห้อง|room/i.test(h)),
    position: headers.findIndex(h => /ท่า|position|exam|อวัยวะ|body/i.test(h)),
    shift: headers.findIndex(h => /เวร|shift|period/i.test(h)),
    cause: headers.findIndex(h => /สาเหตุ|cause|defect/i.test(h)),
    quantity: headers.findIndex(h => /จำนวน|qty|quantity|count/i.test(h))
  };

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
      // Try to parse Thai / standard date formats
      // Format: DD/MM/YYYY, YYYY-MM-DD etc.
      // Thai dates might have Buddhist year (e.g., +543) or standard Christian year
      // Let's write a simple robust date parser
      parsedDate = rawDate;
      try {
        // Test format DD/MM/YYYY
        const dmyMatch = rawDate.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/);
        if (dmyMatch) {
          let day = parseInt(dmyMatch[1], 10);
          let month = parseInt(dmyMatch[2], 10) - 1;
          let year = parseInt(dmyMatch[3], 10);
          if (year > 2400) year -= 543; // convert Buddhist year to AD
          dateObj = new Date(year, month, day);
          parsedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        } else {
          // Try standard Date parsing
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
      rowIndex: headerIndex + 1 + idx + 1 // 1-based row number for editing in Sheets API
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

  const headers = rows[0].map(h => h.trim());
  const colIndexes = {
    staff: headers.findIndex(h => /เจ้าหน้าที่|ชื่อ|ผู้ตรวจ|staff|user/i.test(h)),
    room: headers.findIndex(h => /ห้อง|room/i.test(h)),
    position: headers.findIndex(h => /ท่า|position|exam|อวัยวะ/i.test(h)),
    shift: headers.findIndex(h => /เวร|shift|period/i.test(h)),
    cause: headers.findIndex(h => /สาเหตุ|cause|defect/i.test(h))
  };

  // Fallbacks if not found by name, map to cols 0, 1, 2, 3, 4
  if (colIndexes.staff === -1) colIndexes.staff = 0;
  if (colIndexes.room === -1) colIndexes.room = 1 < headers.length ? 1 : -1;
  if (colIndexes.position === -1) colIndexes.position = 2 < headers.length ? 2 : -1;
  if (colIndexes.shift === -1) colIndexes.shift = 3 < headers.length ? 3 : -1;
  if (colIndexes.cause === -1) colIndexes.cause = 4 < headers.length ? 4 : -1;

  const dataRows = rows.slice(1);

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
