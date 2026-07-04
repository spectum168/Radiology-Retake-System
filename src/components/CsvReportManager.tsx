import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Trash2, 
  Plus, 
  Calendar, 
  AlertCircle, 
  Clock, 
  FileText, 
  TrendingUp, 
  Activity, 
  PieChart as PieIcon, 
  BarChart2, 
  Maximize2, 
  Minimize2,
  Info,
  Upload,
  CalendarDays,
  Search,
  CheckCircle,
  Eye,
  Filter,
  Check,
  ChevronLeft,
  ChevronRight,
  Database,
  RefreshCw,
  X,
  Lock
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

// Color Palette for charts
const COLORS = [
  '#2563EB', // Blue-600
  '#38BDF8', // Sky-400
  '#34D399', // Emerald-400
  '#F59E0B', // Amber-500
  '#F87171', // Red-400
  '#818CF8', // Indigo-400
  '#F472B6', // Pink-400
  '#2DD4BF', // Teal-400
  '#60A5FA', // Blue-400
  '#FB7185'  // Rose-400
];

export interface CsvRecord {
  id: string;
  dateTimeStr: string; // e.g. "4/4/2025 15:05"
  dateStr: string;     // YYYY-MM-DD
  timeStr: string;     // HH:MM
  patientId: string;
  rejectReason: string;
  cassetteSize: string;
  cassetteBarcode: string;
  bodyPart: string;
  viewPosition: string;
  shift: string;       // Calculated based on time
}

export interface CsvFileSummary {
  studyDateFrom: string;
  studyDateTo: string;
  totalImages: number;
  acceptedImages: number;
  rejectedImages: number;
  rejectPercentage: string;
}

export interface UploadedCsvFile {
  id: string;
  fileName: string;
  uploadDate: string;
  summary: CsvFileSummary | null;
  records: CsvRecord[];
  isActive: boolean;
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
}

// Map shift based on custom rules:
// 8:01-16:00 = เวรเช้า
// 16:01-0:00 = เวรบ่าย
// 0:01-8:00 = เวรดึก
export function getShiftByTime(timeStr: string): string {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{1,2})/);
  if (!match) return 'ไม่ระบุ';
  
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const totalMinutes = hours * 60 + minutes;

  // 0:01 to 8:00
  if (totalMinutes >= 1 && totalMinutes <= 480) {
    return 'เวรดึก';
  } 
  // 8:01 to 16:00
  else if (totalMinutes >= 481 && totalMinutes <= 960) {
    return 'เวรเช้า';
  } 
  // 16:01 to 0:00 (which is 0 or 1440 minutes)
  else {
    return 'เวรบ่าย';
  }
}

// Correctly parse a CSV line, respecting double quotes
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map(s => s.trim().replace(/^"|"$/g, ''));
}

interface CsvReportManagerProps {
  token: string | null;
  onGoogleSignIn: () => Promise<void>;
}

export default function CsvReportManager({ token, onGoogleSignIn }: CsvReportManagerProps) {
  const [files, setFiles] = useState<UploadedCsvFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters State
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Table Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;

  // Chart view selections (bar, pie, radar)
  const [reasonChartType, setReasonChartType] = useState<'bar' | 'pie' | 'radar'>('bar');
  const [bodyPartChartType, setBodyPartChartType] = useState<'bar' | 'pie' | 'radar'>('bar');
  const [shiftChartType, setShiftChartType] = useState<'pie' | 'bar'>('pie');
  const [reasonByShiftChartType, setReasonByShiftChartType] = useState<'stacked' | 'grouped'>('stacked');

  // Fullscreen overlay modal
  const [fullscreenChart, setFullscreenChart] = useState<'reason' | 'bodyPart' | 'shift' | 'reasonByShift' | null>(null);

  // Google Drive states
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([]);
  const [isFetchingDrive, setIsFetchingDrive] = useState(false);
  const [driveSearchQuery, setDriveSearchQuery] = useState('');
  const [driveError, setDriveError] = useState<string | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  // Load from local storage
  useEffect(() => {
    const cached = localStorage.getItem('radiology_uploaded_csv_files');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setFiles(parsed);
        }
      } catch (e) {
        console.error('Error parsing cached CSV files:', e);
      }
    }
  }, []);

  // Save to local storage helper
  const saveFiles = (newFiles: UploadedCsvFile[]) => {
    setFiles(newFiles);
    localStorage.setItem('radiology_uploaded_csv_files', JSON.stringify(newFiles));
  };

  // Drag handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.csv')) {
        await processFile(file);
      } else {
        setErrorMsg('กรุณาเลือกเฉพาะไฟล์สกุล .csv เท่านั้น');
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await processFile(file);
    }
  };

  // Core processing logic
  const parseAndAddCsvContent = (text: string, fileName: string) => {
    const rawLines = text.split(/\r?\n/).map(line => line.trim());
    if (rawLines.length === 0) throw new Error('ไฟล์ว่างเปล่าไม่มีข้อมูล');

    // Extract Summary Section if present at row 1-2
    let summary: CsvFileSummary | null = null;
    let headerRowIndex = -1;

    // Scan first few rows to locate headers and determine format
    for (let i = 0; i < Math.min(10, rawLines.length); i++) {
      const lowerLine = rawLines[i].toLowerCase();
      if (lowerLine.includes('date time') && lowerLine.includes('reject reason')) {
        headerRowIndex = i;
        break;
      }
    }

    // If not found, try a looser check
    if (headerRowIndex === -1) {
      for (let i = 0; i < Math.min(10, rawLines.length); i++) {
        const lowerLine = rawLines[i].toLowerCase();
        if (lowerLine.includes('date') && (lowerLine.includes('reason') || lowerLine.includes('body part'))) {
          headerRowIndex = i;
          break;
        }
      }
    }

    if (headerRowIndex === -1) {
      throw new Error('ไม่พบแถวหัวข้อตาราง เช่น "Date Time" และ "Reject Reason" ในไฟล์ CSV กรุณาตรวจสอบรูปแบบไฟล์');
    }

    // Parse summary if it exists before the header
    if (headerRowIndex >= 2) {
      const r0 = parseCSVLine(rawLines[0]);
      const r1 = parseCSVLine(rawLines[1]);
      if (r0.some(cell => /study\s*date|total\s*images/i.test(cell))) {
        summary = {
          studyDateFrom: r1[0] || '',
          studyDateTo: r1[1] || '',
          totalImages: parseInt(r1[2], 10) || 0,
          acceptedImages: parseInt(r1[3], 10) || 0,
          rejectedImages: parseInt(r1[4], 10) || 0,
          rejectPercentage: r1[5] || '',
        };
      }
    }

    // Parse main header row
    const headerLine = rawLines[headerRowIndex];
    const headers = parseCSVLine(headerLine);

    const colIndex = {
      dateTime: headers.findIndex(h => /date\s*time/i.test(h)),
      patientId: headers.findIndex(h => /patient\s*id/i.test(h)),
      rejectReason: headers.findIndex(h => /reject\s*reason/i.test(h)),
      cassetteSize: headers.findIndex(h => /cassette\s*size/i.test(h)),
      cassetteBarcode: headers.findIndex(h => /cassette\s*barcode/i.test(h)),
      bodyPart: headers.findIndex(h => /body\s*part/i.test(h)),
      viewPosition: headers.findIndex(h => /view\s*position/i.test(h)),
    };

    if (colIndex.dateTime === -1 || colIndex.rejectReason === -1) {
      throw new Error('โครงสร้างคอลัมน์ไม่ถูกต้อง ขาดคอลัมน์ "Date Time" หรือ "Reject Reason"');
    }

    const parsedRecords: CsvRecord[] = [];
    const dataLines = rawLines.slice(headerRowIndex + 1);

    dataLines.forEach((line, idx) => {
      if (!line.trim()) return;
      const cols = parseCSVLine(line);
      if (cols.length === 0 || cols.every(c => !c.trim())) return;

      const getVal = (colIdx: number) => {
        if (colIdx >= 0 && colIdx < cols.length) {
          return cols[colIdx].trim();
        }
        return '';
      };

      const rawDateTime = getVal(colIndex.dateTime);
      if (!rawDateTime) return; // Skip if date empty

      // Parse date and time from "4/4/2025 15:05" or "YYYY-MM-DD HH:MM"
      let dateStr = '';
      let timeStr = '00:00';
      const dateTimeParts = rawDateTime.split(/\s+/);
      if (dateTimeParts.length >= 2) {
        const rawDate = dateTimeParts[0];
        const rawTime = dateTimeParts[1];

        // Date formatting
        const dmyMatch = rawDate.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/);
        if (dmyMatch) {
          const day = parseInt(dmyMatch[1], 10);
          const month = parseInt(dmyMatch[2], 10);
          let year = parseInt(dmyMatch[3], 10);
          if (year > 2400) year -= 543; // Buddhist to AD
          dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        } else {
          const testD = new Date(rawDate);
          if (!isNaN(testD.getTime())) {
            dateStr = testD.toISOString().split('T')[0];
          } else {
            dateStr = rawDate;
          }
        }

        // Time formatting
        timeStr = rawTime;
      } else if (dateTimeParts.length === 1 && rawDateTime) {
        const testD = new Date(rawDateTime);
        if (!isNaN(testD.getTime())) {
          dateStr = testD.toISOString().split('T')[0];
          timeStr = testD.toTimeString().split(' ')[0].substring(0, 5);
        } else {
          dateStr = rawDateTime;
        }
      }

      const shift = getShiftByTime(timeStr);

      // STRICT SECURITY EXCLUSION:
      // Do NOT extract/store User Name, Patient Name, Accession Number.
      parsedRecords.push({
        id: `csv-${idx}-${Date.now()}`,
        dateTimeStr: rawDateTime,
        dateStr,
        timeStr,
        patientId: getVal(colIndex.patientId) || 'ไม่ระบุ',
        rejectReason: getVal(colIndex.rejectReason) || 'ไม่ระบุ',
        cassetteSize: getVal(colIndex.cassetteSize) || '',
        cassetteBarcode: getVal(colIndex.cassetteBarcode) || '',
        bodyPart: getVal(colIndex.bodyPart) || 'ไม่ระบุ',
        viewPosition: getVal(colIndex.viewPosition) || 'ไม่ระบุ',
        shift
      });
    });

    if (parsedRecords.length === 0) {
      throw new Error('ไม่พบข้อมูลบันทึกข้อผิดพลาดในไฟล์นี้');
    }

    const newUploadedFile: UploadedCsvFile = {
      id: `file-${Date.now()}`,
      fileName,
      uploadDate: new Date().toLocaleString('th-TH'),
      summary,
      records: parsedRecords,
      isActive: true
    };

    const updatedFiles = [newUploadedFile, ...files];
    saveFiles(updatedFiles);
    setSuccessMsg(`นำเข้าไฟล์ "${fileName}" สำเร็จ! ตรวจพบข้อมูลเสีย ${parsedRecords.length} รายการ`);

    // Update default date range filters from the new file data
    const dates = parsedRecords.map(r => r.dateStr).filter(d => d && d.match(/^\d{4}-\d{2}-\d{2}$/));
    if (dates.length > 0) {
      const sorted = [...dates].sort();
      if (!startDate || sorted[0] < startDate) setStartDate(sorted[0]);
      if (!endDate || sorted[sorted.length - 1] > endDate) setEndDate(sorted[sorted.length - 1]);
    }
  };

  const processFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) throw new Error('ไม่สามารถอ่านเนื้อหาไฟล์ได้');
        parseAndAddCsvContent(text, file.name);
      } catch (err: any) {
        console.error('CSV Parsing Error:', err);
        setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการแยกวิเคราะห์ข้อมูล CSV กรุณาตรวจสอบว่าข้อมูลถูกต้อง');
      }
    };
    reader.readAsText(file);
  };

  // Google Drive: Fetch files lists
  const fetchGoogleDriveCsvFiles = async (query = '') => {
    if (!token) return;
    setIsFetchingDrive(true);
    setDriveError(null);
    try {
      // Build Google Drive files list API query
      // mimeType = 'text/csv' to find CSV files, not trashed
      let q = "mimeType = 'text/csv' and trashed = false";
      if (query.trim()) {
        const escapedQuery = query.replace(/'/g, "\\'");
        q += ` and name contains '${escapedQuery}'`;
      }
      
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,modifiedTime,size)&pageSize=40`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!res.ok) {
        throw new Error(`เกิดข้อผิดพลาดในการติดต่อ Google Drive: ${res.statusText} (${res.status})`);
      }

      const data = await res.json();
      setDriveFiles(data.files || []);
    } catch (err: any) {
      console.error('Drive files fetch error:', err);
      setDriveError(err.message || 'ไม่สามารถดึงข้อมูลรายการไฟล์รังสีจาก Google Drive ได้');
    } finally {
      setIsFetchingDrive(false);
    }
  };

  // Google Drive: Select and download a specific file
  const handleSelectDriveFile = async (fileId: string, fileName: string) => {
    if (!token) return;
    setDownloadingFileId(fileId);
    setDriveError(null);
    try {
      const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error(`ดาวน์โหลดไฟล์ไม่สำเร็จ: ${res.statusText}`);
      }

      const text = await res.text();
      parseAndAddCsvContent(text, fileName);
      setIsDriveModalOpen(false);
    } catch (err: any) {
      console.error('Drive download error:', err);
      setDriveError(`ดาวน์โหลดไฟล์ "${fileName}" ล้มเหลว: ${err.message}`);
    } finally {
      setDownloadingFileId(null);
    }
  };

  // Trigger loading list when Drive modal is opened
  useEffect(() => {
    if (isDriveModalOpen && token) {
      fetchGoogleDriveCsvFiles();
    }
  }, [isDriveModalOpen, token]);

  const handleDeleteFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const fileToDelete = files.find(f => f.id === id);
    if (!fileToDelete) return;
    const confirmDelete = window.confirm(`คุณแน่ใจที่จะลบรายงานและข้อมูลของไฟล์ "${fileToDelete.fileName}" หรือไม่?`);
    if (!confirmDelete) return;

    const updated = files.filter(f => f.id !== id);
    saveFiles(updated);
    setSuccessMsg('ลบไฟล์นำเข้าและข้อมูลสำเร็จเรียบร้อยแล้ว');
  };

  const handleToggleFileActive = (id: string) => {
    const updated = files.map(f => {
      if (f.id === id) {
        return { ...f, isActive: !f.isActive };
      }
      return f;
    });
    saveFiles(updated);
  };

  // Get aggregated records of active files
  const activeRecords = useMemo(() => {
    return files
      .filter(f => f.isActive)
      .flatMap(f => f.records);
  }, [files]);

  // Aggregate global summary headers
  const aggregatedStats = useMemo(() => {
    let totalScanned = 0;
    let accepted = 0;
    let rejected = 0;
    let hasSummaryData = false;

    files.filter(f => f.isActive).forEach(f => {
      if (f.summary) {
        hasSummaryData = true;
        totalScanned += f.summary.totalImages;
        accepted += f.summary.acceptedImages;
        rejected += f.summary.rejectedImages;
      }
    });

    if (!hasSummaryData) {
      rejected = activeRecords.length;
      return {
        totalScanned: null,
        accepted: null,
        rejected,
        rejectPercentage: null
      };
    }

    const percentage = totalScanned > 0 ? ((rejected / totalScanned) * 100).toFixed(2) + '%' : '0%';
    return {
      totalScanned,
      accepted,
      rejected,
      rejectPercentage: percentage
    };
  }, [files, activeRecords]);

  // Apply filters to active records
  const filteredRecords = useMemo(() => {
    let result = activeRecords;

    // Start date filter
    if (startDate) {
      result = result.filter(r => r.dateStr >= startDate);
    }
    // End date filter
    if (endDate) {
      result = result.filter(r => r.dateStr <= endDate);
    }
    // Text query search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => 
        r.patientId.toLowerCase().includes(q) ||
        r.rejectReason.toLowerCase().includes(q) ||
        r.bodyPart.toLowerCase().includes(q) ||
        r.viewPosition.toLowerCase().includes(q) ||
        r.shift.toLowerCase().includes(q)
      );
    }

    return result;
  }, [activeRecords, startDate, endDate, searchQuery]);

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, searchQuery, files]);

  // Aggregate Reasons Chart Data
  const reasonChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach(r => {
      counts[r.rejectReason] = (counts[r.rejectReason] || 0) + 1;
    });

    const total = filteredRecords.length;
    return Object.entries(counts)
      .map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? parseFloat(((value / total) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredRecords]);

  // Aggregate Body Part Chart Data
  const bodyPartChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach(r => {
      counts[r.bodyPart] = (counts[r.bodyPart] || 0) + 1;
    });

    const total = filteredRecords.length;
    return Object.entries(counts)
      .map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? parseFloat(((value / total) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredRecords]);

  // Aggregate Shift Chart Data
  const shiftChartData = useMemo(() => {
    const counts: Record<string, number> = {
      'เวรเช้า': 0,
      'เวรบ่าย': 0,
      'เวรดึก': 0
    };

    filteredRecords.forEach(r => {
      if (counts[r.shift] !== undefined) {
        counts[r.shift] += 1;
      } else {
        counts['ไม่ระบุ'] = (counts['ไม่ระบุ'] || 0) + 1;
      }
    });

    const total = filteredRecords.length;
    return Object.entries(counts)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? parseFloat(((value / total) * 100).toFixed(1)) : 0
      }));
  }, [filteredRecords]);

  // Aggregate Reason breakdown by Shift (grouped/stacked bar chart)
  const reasonByShiftData = useMemo(() => {
    // Get unique reject reasons from filtered records
    const reasons = Array.from(new Set(filteredRecords.map(r => r.rejectReason))).filter(Boolean);
    
    // For each reason, calculate counts in each shift
    const data = reasons.map(reason => {
      const recordsForReason = filteredRecords.filter(r => r.rejectReason === reason);
      const morning = recordsForReason.filter(r => r.shift === 'เวรเช้า').length;
      const afternoon = recordsForReason.filter(r => r.shift === 'เวรบ่าย').length;
      const night = recordsForReason.filter(r => r.shift === 'เวรดึก').length;
      return {
        name: reason,
        'เวรเช้า': morning,
        'เวรบ่าย': afternoon,
        'เวรดึก': night,
        total: morning + afternoon + night
      };
    });

    // Sort by total rejects descending and take top 6 reasons to avoid clutter
    return data.sort((a, b) => b.total - a.total).slice(0, 6);
  }, [filteredRecords]);

  // Paginated records for table
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRecords, currentPage]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);

  const formatBytes = (bytes?: string | number) => {
    if (!bytes) return '';
    const num = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
    if (isNaN(num)) return '';
    if (num < 1024) return num + ' B';
    if (num < 1048576) return (num / 1024).toFixed(1) + ' KB';
    return (num / 1048576).toFixed(1) + ' MB';
  };

  // Render a specific Recharts component safely
  const renderChart = (
    data: any[], 
    type: 'bar' | 'pie' | 'radar', 
    dataKey: string, 
    nameKey: string, 
    color: string
  ) => {
    if (data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10">
          <Info size={24} className="mb-2 text-slate-300" />
          <p className="text-xs">ไม่มีข้อมูลให้วิเคราะห์สำหรับช่วงเวลานี้</p>
        </div>
      );
    }

    const CustomTooltip = ({ active, payload }: any) => {
      if (active && payload && payload.length) {
        const item = payload[0];
        const displayName = item.payload[nameKey] || item.name;
        return (
          <div className="bg-slate-900 text-white p-3 rounded-xl text-xs shadow-xl border border-slate-800">
            <p className="font-bold mb-1 text-slate-200">{displayName}</p>
            <p className="text-slate-400">
              จำนวนภาพเสีย: <span className="font-bold text-white">{item.value} แผ่น</span>
            </p>
            {item.payload.percentage !== undefined && (
              <p className="text-emerald-400 font-semibold mt-1">
                สัดส่วน: {item.payload.percentage}%
              </p>
            )}
          </div>
        );
      }
      return null;
    };

    switch (type) {
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percentage }) => `${name} (${percentage}%)`}
              outerRadius={75}
              dataKey={dataKey}
              nameKey={nameKey}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        );

      case 'radar':
        return (
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
            <PolarGrid stroke="#E2E8F0" />
            <PolarAngleAxis dataKey={nameKey} tick={{ fontSize: 10, fill: '#64748B' }} />
            <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fontSize: 9 }} />
            <Radar
              name="จำนวนภาพเสีย"
              dataKey={dataKey}
              stroke={color}
              fill={color}
              fillOpacity={0.15}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        );

      case 'bar':
      default:
        return (
          <BarChart data={data.slice(0, 12)} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis dataKey={nameKey} tick={{ fontSize: 9, fill: '#64748B' }} stroke="#CBD5E1" />
            <YAxis tick={{ fontSize: 10, fill: '#64748B' }} stroke="#CBD5E1" />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        );
    }
  };

  const renderShiftStackedChart = (data: any[], isStacked: boolean) => {
    if (data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10">
          <Info size={24} className="mb-2 text-slate-300" />
          <p className="text-xs">ไม่มีข้อมูลให้วิเคราะห์สำหรับช่วงเวลานี้</p>
        </div>
      );
    }

    return (
      <BarChart data={data} margin={{ top: 15, right: 15, left: -25, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
        <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748B' }} stroke="#CBD5E1" />
        <YAxis tick={{ fontSize: 10, fill: '#64748B' }} stroke="#CBD5E1" />
        <Tooltip 
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-slate-900 text-white p-3 rounded-xl text-xs shadow-xl border border-slate-800">
                  <p className="font-bold mb-1 text-slate-200">{payload[0].payload.name}</p>
                  <div className="space-y-1 mt-1.5">
                    <p className="text-blue-400 flex justify-between gap-4 text-[10px]">
                      <span>เวรเช้า:</span> <span className="font-bold text-white">{payload[0].payload['เวรเช้า']} แผ่น</span>
                    </p>
                    <p className="text-amber-400 flex justify-between gap-4 text-[10px]">
                      <span>เวรบ่าย:</span> <span className="font-bold text-white">{payload[0].payload['เวรบ่าย']} แผ่น</span>
                    </p>
                    <p className="text-purple-400 flex justify-between gap-4 text-[10px]">
                      <span>เวรดึก:</span> <span className="font-bold text-white">{payload[0].payload['เวรดึก']} แผ่น</span>
                    </p>
                    <p className="text-slate-300 border-t border-slate-800 pt-1 flex justify-between gap-4 font-bold mt-1 text-[10px]">
                      <span>รวมทั้งหมด:</span> <span>{payload[0].payload.total} แผ่น</span>
                    </p>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
        <Bar dataKey="เวรเช้า" stackId={isStacked ? "a" : undefined} fill="#2563EB" radius={isStacked ? [0, 0, 0, 0] : [3, 3, 0, 0]} />
        <Bar dataKey="เวรบ่าย" stackId={isStacked ? "a" : undefined} fill="#F59E0B" radius={isStacked ? [0, 0, 0, 0] : [3, 3, 0, 0]} />
        <Bar dataKey="เวรดึก" stackId={isStacked ? "a" : undefined} fill="#8B5CF6" radius={isStacked ? [3, 3, 0, 0] : [3, 3, 0, 0]} />
      </BarChart>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* CSV Uploader Zone */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Drop Zone Box */}
        <div className="lg:col-span-2">
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`h-full border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 text-center transition-all min-h-[220px] ${
              dragActive 
                ? 'border-blue-500 bg-blue-50/50' 
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 border border-blue-100">
              <Upload size={24} />
            </div>
            
            <h3 className="text-sm font-bold text-slate-800">
              นำเข้าไฟล์รายงานรังสีวิทยา (.CSV)
            </h3>
            
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              ลากไฟล์ CSV มาวางที่นี่ เลือกจากเครื่อง หรือดึงข้อมูลโดยตรงจาก Google Drive ของคุณ
            </p>

            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Plus size={14} />
                เลือกไฟล์จากเครื่อง
              </button>

              <button
                onClick={() => {
                  if (token) {
                    setIsDriveModalOpen(true);
                  } else {
                    onGoogleSignIn().then(() => {
                      setIsDriveModalOpen(true);
                    }).catch(err => {
                      alert(`ไม่สามารถเชื่อมต่อ Google Drive: ${err.message}`);
                    });
                  }
                }}
                className={`text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer border ${
                  token 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/70' 
                    : 'bg-slate-800 hover:bg-slate-900 text-white border-transparent'
                }`}
              >
                <Database size={14} className={token ? 'text-emerald-600' : 'text-blue-400'} />
                {token ? 'เปิดจาก Google Drive (เชื่อมต่อแล้ว)' : 'เชื่อมต่อ Google Drive'}
              </button>
              
              <button
                onClick={(e) => {
                  e.preventDefault();
                  const demoCsv = `Study Date From,Study Date To,Total Images,Accepted Images,Rejected Images,Reject percentage against Total images scanned\n1/4/2025,4/4/2025,346,305,39,11.34%\n\nDate Time,User Name,Patient ID,Patient Name,Reject Reason,Cassette Size,Cassette Barcode,Accession,Body Part,View Position\n4/4/2025 15:05,xray,52138,นางบัวศรี^มะโนชมภู^,Positioning Error,,,67039618,HIP,AP\n4/4/2025 14:42,xray,11752,นางพรพันธ์^ใจสุขกาศ^,Artifact,,,67039609,ABDOMEN,AP\n4/4/2025 10:43,xray,9723,นายอำนวย^ใจกลางดุก^,Technique,,,67039574,CHEST,AP\n4/4/2025 10:39,xray,72853,นายโฆษิต^เขาทองพันธ์^,Clipped Anatomy,,,67039548,ABDOMEN,AP\n4/4/2025 08:30,xray,39281,นางทองดี^แป้นงาม^,Positioning Error,,,67039500,CHEST,PA\n4/4/2025 04:15,xray,12891,นายแดง^มีชัย^,Patient Motion,,,67039400,HIP,LAT\n4/4/2025 01:05,xray,90123,นางสาวใจดี^รักการเรียน^,Technique,,,67039300,CHEST,AP`;
                  const blob = new Blob([demoCsv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.setAttribute("href", url);
                  link.setAttribute("download", "radiology_retake_demo.csv");
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 bg-white px-3 py-2.5 rounded-xl border border-slate-200 transition-all flex items-center gap-1"
                title="ดาวน์โหลดโครงสร้างไฟล์ตัวอย่าง"
              >
                <FileSpreadsheet size={14} className="text-emerald-600" />
                โหลดตัวอย่าง
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".csv"
              className="hidden"
            />
          </div>
        </div>

        {/* Uploaded File List Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={14} className="text-blue-500" />
                รายการไฟล์ทั้งหมดที่นำเข้า ({files.length})
              </h3>
            </div>

            {files.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 border border-slate-100 rounded-xl bg-slate-50 text-center">
                <FileSpreadsheet size={28} className="text-slate-300 mb-2" />
                <p className="text-xs text-slate-400 font-medium">ยังไม่มีไฟล์ CSV ใดๆ ถูกนำเข้า</p>
                <p className="text-[10px] text-slate-400 mt-0.5">ลากไฟล์เข้ามาเพื่อทดสอบ</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                {files.map(file => (
                  <div
                    key={file.id}
                    onClick={() => handleToggleFileActive(file.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                      file.isActive 
                        ? 'bg-blue-50/40 border-blue-100 hover:bg-blue-50/60' 
                        : 'bg-slate-50 border-slate-100 opacity-60 hover:opacity-80'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className={`mt-0.5 p-1 rounded ${file.isActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
                        {file.isActive ? <Check size={12} /> : <div className="w-3 h-3" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate" title={file.fileName}>
                          {file.fileName}
                        </p>
                        <p className="text-[9px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <span>{file.records.length} เสีย</span>
                          <span>•</span>
                          <span>{file.uploadDate}</span>
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => handleDeleteFile(file.id, e)}
                      className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all"
                      title="ลบไฟล์นี้"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 leading-relaxed flex items-start gap-1">
            <Info size={11} className="shrink-0 text-slate-500 mt-0.5" />
            <span>
              ระบบทำงานเฉพาะบนเบราว์เซอร์ ไฟล์ที่นำเข้าจะจัดเก็บอย่างปลอดภัยในคอมพิวเตอร์ของคุณเท่านั้น และจะไม่ถูกอัปโหลดขึ้นเซิร์ฟเวอร์ใดๆ
            </span>
          </div>
        </div>

      </div>

      {/* Google Drive Picker Modal */}
      <AnimatePresence>
        {isDriveModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl h-[550px] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <Database className="text-emerald-600" size={18} />
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">เลือกไฟล์ CSV จาก Google Drive</h3>
                    <p className="text-[10px] text-slate-400">แสดงเฉพาะไฟล์ CSV (.csv) ใน Google Drive ของคุณ</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDriveModalOpen(false)}
                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Search Bar / Controls */}
              <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={driveSearchQuery}
                    onChange={(e) => setDriveSearchQuery(e.target.value)}
                    placeholder="ค้นหาชื่อไฟล์รังสีวิทยาในไดรฟ์..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') fetchGoogleDriveCsvFiles(driveSearchQuery);
                    }}
                  />
                </div>
                <button
                  onClick={() => fetchGoogleDriveCsvFiles(driveSearchQuery)}
                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-sm"
                  title="ค้นหา"
                >
                  <Search size={14} />
                  ค้นหา
                </button>
                <button
                  onClick={() => fetchGoogleDriveCsvFiles(driveSearchQuery)}
                  className="p-2 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                  title="รีเฟรชข้อมูล"
                >
                  <RefreshCw size={14} className={isFetchingDrive ? 'animate-spin' : ''} />
                </button>
              </div>

              {/* Main files listing content */}
              <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                {isFetchingDrive ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500">
                    <RefreshCw className="animate-spin text-blue-500 mb-3" size={24} />
                    <p className="text-xs font-semibold">กำลังเชื่อมต่อและโหลดรายชื่อไฟล์ใน Google Drive...</p>
                  </div>
                ) : driveError ? (
                  <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-xs text-red-700 flex flex-col gap-2 m-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      <span>{driveError}</span>
                    </div>
                    <button
                      onClick={() => fetchGoogleDriveCsvFiles(driveSearchQuery)}
                      className="text-xs font-semibold underline text-red-800 self-start hover:text-red-950 mt-1"
                    >
                      ลองใหม่อีกครั้ง
                    </button>
                  </div>
                ) : driveFiles.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                    <FileSpreadsheet size={32} className="text-slate-300 mb-2" />
                    <p className="text-xs font-semibold text-slate-600">ไม่พบไฟล์รายงานรังสีวิทยา (.csv) ใน Google Drive ของคุณ</p>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
                      กรุณาตรวจสอบว่ามีไฟล์ CSV บันทึกสถิติภาพเสียถูกเก็บไว้ และลองค้นหาด้วยคำสำคัญในช่องค้นหาด้านบน
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {driveFiles.map(file => {
                      const isDownloading = downloadingFileId === file.id;
                      return (
                        <div
                          key={file.id}
                          onClick={() => !isDownloading && handleSelectDriveFile(file.id, file.name)}
                          className={`p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/20 transition-all flex items-center justify-between cursor-pointer ${
                            isDownloading ? 'opacity-70 pointer-events-none border-blue-200 bg-blue-50/10' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                              <FileSpreadsheet size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-700 truncate" title={file.name}>
                                {file.name}
                              </p>
                              <p className="text-[9px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                                <span>ขนาด: {formatBytes(file.size) || 'ไม่ระบุ'}</span>
                                <span>•</span>
                                <span>แก้ไขล่าสุด: {file.modifiedTime ? new Date(file.modifiedTime).toLocaleString('th-TH') : 'ไม่ระบุ'}</span>
                              </p>
                            </div>
                          </div>

                          <div>
                            {isDownloading ? (
                              <RefreshCw className="animate-spin text-blue-500" size={14} />
                            ) : (
                              <span className="text-[10px] font-bold text-blue-600 hover:underline">
                                นำเข้าข้อมูล
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50 text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Lock size={12} className="text-emerald-600" /> Secure Sandbox Connection
                </span>
                <span>พบทั้งหมด {driveFiles.length} รายการ</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Operation Messages Notifications */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle size={16} className="shrink-0 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Analysis Section */}
      {activeRecords.length > 0 && (
        <div className="space-y-6">
          
          {/* Section Heading & Stats Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Activity size={16} className="text-blue-600" />
                แผงวิเคราะห์สถิติจากไฟล์ CSV นำเข้า
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                ประมวลผลข้อมูลจากไฟล์ที่เลือกจำนวน {files.filter(f => f.isActive).length} ไฟล์ (ทั้งหมด {activeRecords.length} ภาพเสีย)
              </p>
            </div>

            {/* Date Range Filtering Panel */}
            <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm text-xs">
              <span className="text-slate-400 px-2 font-semibold">ช่วงเวลา:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:border-blue-500"
              />
              <span className="text-slate-400 font-semibold">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:border-blue-500"
              />
              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="px-2 py-1 text-slate-500 hover:text-rose-600 font-bold hover:bg-rose-50 rounded-lg"
                >
                  ล้างตัวกรอง
                </button>
              )}
            </div>
          </div>

          {/* Aggregated Metadata Stats Cards */}
          {aggregatedStats.totalScanned !== null && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase">จำนวนฟิล์มตรวจทั้งหมด</p>
                <p className="text-lg font-bold text-slate-800 mt-1">{aggregatedStats.totalScanned.toLocaleString()} แผ่น</p>
                <div className="h-1 w-full bg-slate-100 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase">ภาพรังสีปกติ (Accepted)</p>
                <p className="text-lg font-bold text-slate-800 mt-1">{aggregatedStats.accepted?.toLocaleString()} แผ่น</p>
                <div className="h-1 w-full bg-slate-100 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${aggregatedStats.totalScanned > 0 ? (aggregatedStats.accepted! / aggregatedStats.totalScanned) * 100 : 0}%` }}></div>
                </div>
              </div>

              <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase">ภาพรังสีเสียทั้งหมด (Rejected)</p>
                <p className="text-lg font-bold text-rose-600 mt-1">{aggregatedStats.rejected.toLocaleString()} แผ่น</p>
                <div className="h-1 w-full bg-slate-100 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-rose-500" style={{ width: `${aggregatedStats.totalScanned > 0 ? (aggregatedStats.rejected / aggregatedStats.totalScanned) * 100 : 0}%` }}></div>
                </div>
              </div>

              <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase">ร้อยละของฟิล์มเสีย (Reject Rate)</p>
                <p className="text-lg font-bold text-amber-600 mt-1">{aggregatedStats.rejectPercentage}</p>
                <div className="h-1 w-full bg-slate-100 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${parseFloat(aggregatedStats.rejectPercentage || '0') * 4}%` }}></div>
                </div>
              </div>
            </div>
          )}

          {/* Visual Charts Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Chart 1: Reject Reason Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col h-[350px]">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Activity size={14} className="text-blue-500" />
                    สาเหตุการถ่ายภาพเสีย (Reject Reason)
                  </h4>
                  <p className="text-[10px] text-slate-400">แสดงสัดส่วนสาเหตุและสถิติฟิล์มเสียหลัก</p>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <div className="flex bg-slate-100 rounded-lg p-0.5">
                    {(['bar', 'pie', 'radar'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => setReasonChartType(type)}
                        className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold capitalize transition-all ${
                          reasonChartType === type
                            ? 'bg-white text-slate-800 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setFullscreenChart('reason')}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-all border border-slate-100"
                    title="ขยายใหญ่เต็มจอ"
                  >
                    <Maximize2 size={12} />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  {renderChart(reasonChartData, reasonChartType, 'value', 'name', '#2563EB')}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Body Part Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col h-[350px]">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <TrendingUp size={14} className="text-blue-500" />
                    อวัยวะหรือท่าตรวจเสีย (Body Part)
                  </h4>
                  <p className="text-[10px] text-slate-400">จัดสัดส่วนอวัยวะหรือท่าตรวจที่ถ่ายเสียบ่อยสุด</p>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <div className="flex bg-slate-100 rounded-lg p-0.5">
                    {(['bar', 'pie', 'radar'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => setBodyPartChartType(type)}
                        className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold capitalize transition-all ${
                          bodyPartChartType === type
                            ? 'bg-white text-slate-800 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setFullscreenChart('bodyPart')}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-all border border-slate-100"
                    title="ขยายใหญ่เต็มจอ"
                  >
                    <Maximize2 size={12} />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  {renderChart(bodyPartChartData, bodyPartChartType, 'value', 'name', '#34D399')}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Shift Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col h-[350px]">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock size={14} className="text-blue-500" />
                    แยกตามเวรและเวลา (Calculated Shifts)
                  </h4>
                  <p className="text-[10px] text-slate-400">เช้า (8:01-16:00), บ่าย (16:01-0:00), ดึก (0:01-8:00)</p>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <div className="flex bg-slate-100 rounded-lg p-0.5">
                    {(['pie', 'bar'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => setShiftChartType(type)}
                        className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold capitalize transition-all ${
                          shiftChartType === type
                            ? 'bg-white text-slate-800 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setFullscreenChart('shift')}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-all border border-slate-100"
                    title="ขยายใหญ่เต็มจอ"
                  >
                    <Maximize2 size={12} />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  {renderChart(shiftChartData, shiftChartType, 'value', 'name', '#F59E0B')}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 4: Reject Reasons by Work Shift */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col h-[350px]">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock size={14} className="text-blue-500" />
                    เปรียบเทียบสาเหตุเสียแยกตามเวร (Reasons by Shift)
                  </h4>
                  <p className="text-[10px] text-slate-400">สัดส่วนสาเหตุถ่ายฟิล์มเสียจำแนกตามแต่ละเวรทำงาน</p>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <div className="flex bg-slate-100 rounded-lg p-0.5">
                    {(['stacked', 'grouped'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => setReasonByShiftChartType(type)}
                        className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold capitalize transition-all ${
                          reasonByShiftChartType === type
                            ? 'bg-white text-slate-800 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {type === 'stacked' ? 'ซ้อนกัน' : 'เรียงกัน'}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setFullscreenChart('reasonByShift')}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-all border border-slate-100"
                    title="ขยายใหญ่เต็มจอ"
                  >
                    <Maximize2 size={12} />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  {renderShiftStackedChart(reasonByShiftData, reasonByShiftChartType === 'stacked')}
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Fullscreen Overlays for CSV Charts */}
          {fullscreenChart && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 transition-all duration-300">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col p-6 relative animate-in fade-in zoom-in-95 duration-150">
                
                {/* Header */}
                <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      {fullscreenChart === 'reason' && <><Activity size={18} className="text-blue-600" /> สาเหตุการถ่ายภาพเสีย (Reject Reason)</>}
                      {fullscreenChart === 'bodyPart' && <><TrendingUp size={18} className="text-blue-600" /> ส่วนของร่างกายที่ถ่ายตรวจเสีย (Body Part)</>}
                      {fullscreenChart === 'shift' && <><Clock size={18} className="text-blue-600" /> แบ่งตามเวรการทำงาน (Shift Breakdown)</>}
                      {fullscreenChart === 'reasonByShift' && <><Clock size={18} className="text-blue-600" /> เปรียบเทียบสาเหตุเสียแยกตามเวร (Reasons by Shift)</>}
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {fullscreenChart === 'reason' && 'แสดงสัดส่วนสาเหตุและสถิติข้อผิดพลาดหลัก'}
                      {fullscreenChart === 'bodyPart' && 'จัดสัดส่วนอวัยวะหรือท่าตรวจที่ถ่ายเสียบ่อยที่สุด'}
                      {fullscreenChart === 'shift' && 'แสดงการแจกแจงแบ่งกลุ่มเวลากะงานเช้า บ่าย และดึก'}
                      {fullscreenChart === 'reasonByShift' && 'เปรียบเทียบสัดส่วนสาเหตุการถ่ายฟิล์มเสียจำแนกตามแต่ละเวรทำงาน'}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {fullscreenChart === 'reason' && (
                      <div className="flex bg-slate-100 rounded-lg p-0.5 mr-2">
                        {(['bar', 'pie', 'radar'] as const).map(type => (
                          <button
                            key={type}
                            onClick={() => setReasonChartType(type)}
                            className={`text-xs px-2.5 py-1 rounded-md font-semibold capitalize transition-all ${
                              reasonChartType === type
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {fullscreenChart === 'bodyPart' && (
                      <div className="flex bg-slate-100 rounded-lg p-0.5 mr-2">
                        {(['bar', 'pie', 'radar'] as const).map(type => (
                          <button
                            key={type}
                            onClick={() => setBodyPartChartType(type)}
                            className={`text-xs px-2.5 py-1 rounded-md font-semibold capitalize transition-all ${
                              bodyPartChartType === type
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    )}

                    {fullscreenChart === 'shift' && (
                      <div className="flex bg-slate-100 rounded-lg p-0.5 mr-2">
                        {(['pie', 'bar'] as const).map(type => (
                          <button
                            key={type}
                            onClick={() => setShiftChartType(type)}
                            className={`text-xs px-2.5 py-1 rounded-md font-semibold capitalize transition-all ${
                              shiftChartType === type
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    )}

                    {fullscreenChart === 'reasonByShift' && (
                      <div className="flex bg-slate-100 rounded-lg p-0.5 mr-2">
                        {(['stacked', 'grouped'] as const).map(type => (
                          <button
                            key={type}
                            onClick={() => setReasonByShiftChartType(type)}
                            className={`text-xs px-2.5 py-1 rounded-md font-semibold capitalize transition-all ${
                              reasonByShiftChartType === type
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            {type === 'stacked' ? 'ซ้อนกัน' : 'เรียงกัน'}
                          </button>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => setFullscreenChart(null)}
                      className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-all flex items-center gap-1 text-xs font-semibold border border-slate-200 shadow-sm cursor-pointer"
                    >
                      <Minimize2 size={14} />
                      <span>ย่อหน้าจอ</span>
                    </button>
                  </div>
                </div>

                {/* Content Container */}
                <div className="flex-1 w-full min-h-0 bg-slate-50 rounded-xl p-4 md:p-6 border border-slate-100">
                  <ResponsiveContainer width="100%" height="100%">
                    {fullscreenChart === 'reason' && renderChart(reasonChartData, reasonChartType, 'value', 'name', '#2563EB')}
                    {fullscreenChart === 'bodyPart' && renderChart(bodyPartChartData, bodyPartChartType, 'value', 'name', '#34D399')}
                    {fullscreenChart === 'shift' && renderChart(shiftChartData, shiftChartType, 'value', 'name', '#F59E0B')}
                    {fullscreenChart === 'reasonByShift' && renderShiftStackedChart(reasonByShiftData, reasonByShiftChartType === 'stacked')}
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Clean Interactive Data Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <FileText size={14} className="text-emerald-500" />
                  ตารางบันทึกความผิดพลาด (CSV Log)
                </h3>
                <p className="text-[10px] text-slate-400">
                  คัดกรองข้อมูลภาพเสียที่นำเข้าตามความต้องการ และระบบไม่บันทึก Patient Name, Accession และ User Name เพื่อความปลอดภัย
                </p>
              </div>

              {/* Text search input */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหา (ID, ท่า, สาเหตุ, เวร)..."
                  className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-5 py-3">วัน-เวลาเกิดเหตุ</th>
                    <th className="px-5 py-3">Patient ID</th>
                    <th className="px-5 py-3">สาเหตุภาพเสีย (Reason)</th>
                    <th className="px-5 py-3">อวัยวะตรวจ (Body Part)</th>
                    <th className="px-5 py-3">ท่าตรวจ (View)</th>
                    <th className="px-5 py-3">ขนาด cassette</th>
                    <th className="px-5 py-3 text-right">เวรทำงาน (Shift)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {paginatedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        <Info size={20} className="mx-auto text-slate-300 mb-2" />
                        <span className="font-medium text-xs">ไม่พบรายการข้อมูลบันทึกตามตัวกรองปัจจุบัน</span>
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-slate-600">{record.dateTimeStr}</td>
                        <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">{record.patientId}</td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                            {record.rejectReason}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-slate-800">{record.bodyPart}</td>
                        <td className="px-5 py-3.5 text-slate-500 font-mono">{record.viewPosition}</td>
                        <td className="px-5 py-3.5 text-slate-400">{record.cassetteSize || '-'}</td>
                        <td className="px-5 py-3.5 text-right font-medium">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] ${
                            record.shift === 'เวรเช้า' 
                              ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                              : record.shift === 'เวรบ่าย' 
                                ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                                : 'bg-purple-50 text-purple-700 border border-purple-100'
                          }`}>
                            {record.shift}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
                <span>
                  แสดงหน้า {currentPage} จากทั้งหมด {totalPages} หน้า (ทั้งหมด {filteredRecords.length} รายการ)
                </span>
                <div className="flex gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
