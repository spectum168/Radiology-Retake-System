import { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import {
  initAuth,
  googleSignIn,
  logout,
  fetchSheetRange,
  updateSheetRange,
  appendSheetRows,
  SPREADSHEET_ID
} from './googleAuth';
import {
  RejectRecord,
  SettingsConfig,
  FilterState,
  parseRejectRecords,
  parseSettingsConfig,
  formatSettingsConfig
} from './types';
import DataFilters from './components/DataFilters';
import DashboardCharts from './components/DashboardCharts';
import RecordTable from './components/RecordTable';
import SettingsManager from './components/SettingsManager';
import {
  Activity,
  Settings,
  Database,
  Lock,
  LogOut,
  ExternalLink,
  ShieldCheck,
  Play,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';

// Gorgeous default medical radiology mock data for instantly usable Preview Mode
const DEMO_SETTINGS: SettingsConfig = {
  staffs: [
    'จนท.กุ้ง',
    'จนท.จรัล',
    'จนท.ตุ้ม',
    'จนท.เต่า',
    'จนท.ทรง',
    'จนท.บอย',
    'จนท.บี',
    'จนท.ปอ',
    'จนท.แม็ก',
    'จนท.เอ็ม',
    'เจ้าพนักงานรังสีการแพทย์',
    'นักรังสีเทคนิค',
    'พนักงานการแพทย์และรังสีเทคนิค'
  ],
  rooms: ['เครื่องเอกซเรย์', 'เครื่องPortable'],
  positions: [
    'Chest PA Upright',
    'Chest AP',
    'Chest Supine',
    'Skull AP',
    'Skull Lat',
    'Skull water\'s',
    'Skull Towne',
    'Abdomen Upright',
    'Abdomen Supine',
    'KUB',
    'Pelvis AP',
    'Hip AP',
    'Hip Lat',
    'L-S spine AP',
    'L-S spine Lat',
    'T-L spine AP',
    'T-L spine Lat',
    'C-spine AP',
    'C-spine Lat',
    'Shoulder AP',
    'Shoulder Lat',
    'Shoulder Tran'
  ],
  shifts: ['เช้า', 'บ่าย', 'ดึก'],
  causes: [
    'มีโลหะ มีรอย ในภาพ',
    'คนไข้ขยับ',
    'ผิดคน',
    'ผิดข้าง',
    'ผิดตำแหน่ง',
    'ภาพขาวไป',
    'ภาพดำไป',
    'ภาพขาดขอบ',
    'จัดท่าไม่ถูก',
    'เครื่อง CR ไม่โหลดภาพ',
    'อื่นๆ',
    'mark ไม่ถึงบอร์ด x-ray',
    'ขาดซ้าย ขวา บน ล่าง',
    'เก็บเคส สำหรับ จนท.ใหม่'
  ]
};

const DEMO_RECORDS: RejectRecord[] = [
  { id: 'row-1', date: '2026-06-15', dateObj: new Date('2026-06-15'), staff: 'จนท.กุ้ง', room: 'เครื่องเอกซเรย์', position: 'Chest PA Upright', shift: 'เช้า', cause: 'คนไข้ขยับ', quantity: 1, rawRow: [], rowIndex: 1 },
  { id: 'row-2', date: '2026-06-15', dateObj: new Date('2026-06-15'), staff: 'จนท.จรัล', room: 'เครื่องเอกซเรย์', position: 'Chest AP', shift: 'เช้า', cause: 'จัดท่าไม่ถูก', quantity: 2, rawRow: [], rowIndex: 2 },
  { id: 'row-3', date: '2026-06-16', dateObj: new Date('2026-06-16'), staff: 'จนท.ตุ้ม', room: 'เครื่องPortable', position: 'Skull AP', shift: 'บ่าย', cause: 'มีโลหะ มีรอย ในภาพ', quantity: 1, rawRow: [], rowIndex: 3 },
  { id: 'row-4', date: '2026-06-16', dateObj: new Date('2026-06-16'), staff: 'จนท.เต่า', room: 'เครื่องเอกซเรย์', position: 'Abdomen Upright', shift: 'บ่าย', cause: 'ภาพขาวไป', quantity: 1, rawRow: [], rowIndex: 4 },
  { id: 'row-5', date: '2026-06-17', dateObj: new Date('2026-06-17'), staff: 'จนท.ทรง', room: 'เครื่องPortable', position: 'Pelvis AP', shift: 'ดึก', cause: 'อื่นๆ', quantity: 1, rawRow: [], rowIndex: 5 },
  { id: 'row-6', date: '2026-06-18', dateObj: new Date('2026-06-18'), staff: 'จนท.กุ้ง', room: 'เครื่องเอกซเรย์', position: 'Chest PA Upright', shift: 'เช้า', cause: 'คนไข้ขยับ', quantity: 1, rawRow: [], rowIndex: 6 },
  { id: 'row-7', date: '2026-06-19', dateObj: new Date('2026-06-19'), staff: 'จนท.บอย', room: 'เครื่องPortable', position: 'KUB', shift: 'ดึก', cause: 'ภาพขาดขอบ', quantity: 1, rawRow: [], rowIndex: 7 },
  { id: 'row-8', date: '2026-06-20', dateObj: new Date('2026-06-20'), staff: 'จนท.บี', room: 'เครื่องเอกซเรย์', position: 'Hip AP', shift: 'เช้า', cause: 'ผิดคน', quantity: 1, rawRow: [], rowIndex: 8 },
  { id: 'row-9', date: '2026-06-21', dateObj: new Date('2026-06-21'), staff: 'จนท.ปอ', room: 'เครื่องPortable', position: 'Abdomen Supine', shift: 'บ่าย', cause: 'คนไข้ขยับ', quantity: 1, rawRow: [], rowIndex: 9 },
  { id: 'row-10', date: '2026-06-22', dateObj: new Date('2026-06-22'), staff: 'จนท.แม็ก', room: 'เครื่องเอกซเรย์', position: 'Chest PA Upright', shift: 'ดึก', cause: 'เครื่อง CR ไม่โหลดภาพ', quantity: 1, rawRow: [], rowIndex: 10 },
  { id: 'row-11', date: '2026-06-23', dateObj: new Date('2026-06-23'), staff: 'จนท.เอ็ม', room: 'เครื่องเอกซเรย์', position: 'Shoulder AP', shift: 'เช้า', cause: 'มีโลหะ มีรอย ในภาพ', quantity: 1, rawRow: [], rowIndex: 11 },
  { id: 'row-12', date: '2026-06-24', dateObj: new Date('2026-06-24'), staff: 'เจ้าพนักงานรังสีการแพทย์', room: 'เครื่องPortable', position: 'Chest PA Upright', shift: 'บ่าย', cause: 'คนไข้ขยับ', quantity: 1, rawRow: [], rowIndex: 12 },
  { id: 'row-13', date: '2026-06-25', dateObj: new Date('2026-06-25'), staff: 'นักรังสีเทคนิค', room: 'เครื่องPortable', position: 'L-S spine AP', shift: 'เช้า', cause: 'จัดท่าไม่ถูก', quantity: 2, rawRow: [], rowIndex: 13 },
  { id: 'row-14', date: '2026-06-26', dateObj: new Date('2026-06-26'), staff: 'พนักงานการแพทย์และรังสีเทคนิค', room: 'เครื่องเอกซเรย์', position: 'Chest PA Upright', shift: 'ดึก', cause: 'ภาพขาวไป', quantity: 1, rawRow: [], rowIndex: 14 }
];

export default function App() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Sheets data state
  const [records, setRecords] = useState<RejectRecord[]>(DEMO_RECORDS);
  const [settings, setSettings] = useState<SettingsConfig>(DEMO_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // App UI state
  const [activeView, setActiveView] = useState<'dashboard' | 'records' | 'settings'>('dashboard');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isAddingRecord, setIsAddingRecord] = useState(false);

  // Filters State
  const [filters, setFilters] = useState<FilterState>({
    startDate: '',
    endDate: '',
    staff: '',
    room: '',
    position: '',
    shift: '',
    cause: ''
  });

  // Listen to Auth State on boot
  useEffect(() => {
    initAuth(
      (currentUser, cachedToken) => {
        setUser(currentUser);
        setToken(cachedToken);
        setAuthInitialized(true);
      },
      () => {
        setUser(null);
        setToken(null);
        setAuthInitialized(true);
      }
    );
  }, []);

  // Fetch from Google Sheets when we have an active token
  const fetchLiveSheetData = async (accessToken: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      // 1. Fetch dropdown settings configs first
      const rawSettingsRows = await fetchSheetRange('Settings!A1:E200', accessToken);
      const parsedSettings = parseSettingsConfig(rawSettingsRows);

      // Resolve final settings to use for value-based matching and UI state
      const finalSettings = (
        parsedSettings.staffs.length === 0 &&
        parsedSettings.rooms.length === 0 &&
        parsedSettings.positions.length === 0 &&
        parsedSettings.causes.length === 0
      ) ? DEMO_SETTINGS : parsedSettings;

      setSettings(finalSettings);

      // 2. Fetch reject entries using finalSettings for value matching
      const rawRejectRows = await fetchSheetRange('ข้อมูลการถ่ายภาพรังสีเสีย!A1:G1000', accessToken);
      const parsedRecords = parseRejectRecords(rawRejectRows, finalSettings);

      setRecords(parsedRecords);
    } catch (err: any) {
      console.error('Error fetching sheets data:', err);
      setErrorMsg(
        err.message || 'ไม่สามารถดึงข้อมูลจาก Google Sheets ได้ กรุณาตรวจสอบว่ามีสิทธิ์เปิดไฟล์ หรือสลับเข้าโหมดพรีวิว'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Run sheet fetching whenever token changes
  useEffect(() => {
    if (token) {
      fetchLiveSheetData(token);
    } else {
      // Clear live data and restore demo data when logged out
      setRecords(DEMO_RECORDS);
      setSettings(DEMO_SETTINGS);
    }
  }, [token]);

  // Google Login click
  const handleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMsg(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMsg('การลงชื่อเข้าใช้ด้วย Google มีปัญหา กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Sign out click
  const handleLogout = async () => {
    const confirmLogout = window.confirm('คุณต้องการลงชื่อออกจากระบบวิเคราะห์นี้หรือไม่?');
    if (!confirmLogout) return;

    try {
      await logout();
      setUser(null);
      setToken(null);
      setActiveView('dashboard');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // Add new reject row to Google Sheet
  const handleAddRecord = async (
    newRec: Omit<RejectRecord, 'id' | 'rawRow' | 'rowIndex' | 'dateObj'>
  ) => {
    if (!token) {
      // In demo mode, append locally to stay interactive!
      const mockRec: RejectRecord = {
        ...newRec,
        id: `row-${Date.now()}`,
        dateObj: new Date(newRec.date),
        rawRow: [],
        rowIndex: records.length + 2
      };
      setRecords(prev => [mockRec, ...prev]);
      return;
    }

    setIsAddingRecord(true);
    try {
      // Headers of "ข้อมูลการถ่ายภาพรังสีเสีย"
      // Date, Staff, Room, Position, Shift, Cause, Qty
      const valuesToAppend = [
        [
          newRec.date,
          newRec.staff,
          newRec.room,
          newRec.position,
          newRec.shift,
          newRec.cause,
          String(newRec.quantity)
        ]
      ];

      // Append row to Google Sheet
      await appendSheetRows('ข้อมูลการถ่ายภาพรังสีเสีย!A2:G', valuesToAppend, token);

      // Re-fetch to display updated list
      await fetchLiveSheetData(token);
    } catch (err: any) {
      console.error('Error adding record to sheet:', err);
      throw new Error(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลฟิล์มเสีย');
    } finally {
      setIsAddingRecord(false);
    }
  };

  // Save Settings list changes back to spreadsheet
  const handleSaveSettings = async (updatedSettings: SettingsConfig) => {
    const confirmed = window.confirm(
      'คุณแน่ใจที่จะเขียนทับการตั้งค่าตัวเลือกต่างๆ ลงใน Google Sheets หน้า "Settings"? การดำเนินการนี้จะเปลี่ยนตัวเลือกดร็อปดาวน์ทั้งหมดของคุณ'
    );
    if (!confirmed) return;

    if (!token) {
      // In demo mode, save locally to keep it interactive!
      setSettings(updatedSettings);
      alert('บันทึกการตั้งค่าตัวเลือกจำลอง (Demo Settings) เรียบร้อยแล้ว!');
      return;
    }

    setIsSavingSettings(true);
    try {
      const rows = formatSettingsConfig(updatedSettings);

      // 1. Clear existing settings values up to E200
      await updateSheetRange('Settings!A1:E200', Array(200).fill(['', '', '', '', '']), token);

      // 2. Write new rows
      await updateSheetRange('Settings!A1', rows, token);

      setSettings(updatedSettings);
      alert('ปรับแต่งและจัดเก็บข้อมูลการตั้งค่าลง Google Sheet สำเร็จแล้ว!');
    } catch (err: any) {
      console.error('Error saving settings config:', err);
      alert(`ไม่สามารถจัดเก็บข้อมูลลงสเปรดชีตได้: ${err.message || err}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Filtered records calculations
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // Date filter
      if (filters.startDate) {
        if (r.date < filters.startDate) return false;
      }
      if (filters.endDate) {
        if (r.date > filters.endDate) return false;
      }
      // Dropdown filters
      if (filters.staff && r.staff !== filters.staff) return false;
      if (filters.room && r.room !== filters.room) return false;
      if (filters.position && r.position !== filters.position) return false;
      if (filters.shift && r.shift !== filters.shift) return false;
      if (filters.cause && r.cause !== filters.cause) return false;

      return true;
    });
  }, [records, filters]);

  // Clear filters
  const handleClearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      staff: '',
      room: '',
      position: '',
      shift: '',
      cause: ''
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-blue-100">
      {/* Header Bar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm">
              R
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-tight tracking-tight flex items-center gap-1.5">
                Radiology <span className="text-blue-600">Retake System</span>
                <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                  v1.2
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">
                ระบบจัดการและวิเคราะห์สถิติข้อมูลการถ่ายภาพรังสีเสียแบบเรียลไทม์
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Link to spreadsheet */}
            <a
              href={`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-500 hover:text-blue-600 font-medium flex items-center gap-1 bg-white hover:bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 transition-all"
            >
              <FileSpreadsheet size={14} className="text-emerald-600" />
              <span>เปิด Google Sheet หลัก</span>
              <ExternalLink size={11} />
            </a>

            {/* Auth Management Button */}
            {!authInitialized ? (
              <div className="h-9 w-28 bg-slate-100 animate-pulse rounded-xl" />
            ) : user ? (
              <div className="flex items-center gap-3">
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-[11px] font-bold text-slate-800 truncate max-w-[150px]">
                    {user.displayName || 'ผู้ดูแลระบบ'}
                  </span>
                  <span className="text-[9px] text-emerald-600 font-semibold flex items-center gap-0.5 justify-end">
                    <ShieldCheck size={10} />
                    เชื่อมต่อฐานข้อมูลชีตแล้ว
                  </span>
                </div>
                <button
                  id="btn-logout"
                  onClick={handleLogout}
                  className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all border border-slate-200 cursor-pointer"
                  title="ลงชื่อออก"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button
                id="btn-google-login"
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                <Lock size={13} />
                {isLoggingIn ? 'กำลังลงชื่อเข้าใช้...' : 'เชื่อมต่อ Google Sheets'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Body Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Connection Notification alert */}
        {!user && authInitialized && (
          <div className="bg-gradient-to-r from-amber-50 to-amber-50/20 border border-amber-200/60 rounded-2xl p-5 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-xl text-amber-700 shrink-0">
                <AlertCircle size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-800">
                  ⚠️ อยู่ในโหมดพรีวิวข้อมูลจำลอง (Preview Mode with Demo Data)
                </h4>
                <p className="text-[11px] text-amber-700/80 mt-0.5">
                  ระบบได้แสดงข้อมูลสถิติและตัวเลือกตัวกรองจำลองเพื่อให้คุณสามารถทดสอบสถิติและหน้าวิเคราะห์ได้ทันที
                  หากต้องการเชื่อมต่อกับ Google Sheet บัญชีผู้ใช้จริง กรุณาคลิกเชื่อมต่อเพื่ออนุญาตสิทธิ์เข้าถึง
                </p>
              </div>
            </div>
            <button
              onClick={handleLogin}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all self-start md:self-center shrink-0 shadow-sm cursor-pointer"
            >
              <Play size={13} />
              เปิดใช้งานข้อมูลชีตจริง
            </button>
          </div>
        )}

        {/* Display Error Message */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs flex items-center gap-2 mb-6">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="bg-blue-50/50 border border-blue-200/60 text-blue-700 p-4 rounded-xl text-xs flex items-center gap-2.5 mb-6 animate-pulse">
            <Database size={16} className="animate-spin text-blue-500 shrink-0" />
            <span>กำลังเรียกค้นข้อมูลล่าสุดจาก Google Sheets สำเร็จ... กรุณารอสักครู่</span>
          </div>
        )}

        {/* View Navigation Tabs */}
        <div className="flex border-b border-slate-200 mb-6 gap-2">
          <button
            id="nav-tab-dashboard"
            onClick={() => setActiveView('dashboard')}
            className={`px-4 py-3 text-xs font-semibold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeView === 'dashboard'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Activity size={15} />
            แผงวิเคราะห์และสถิติภาพรวม
          </button>
          <button
            id="nav-tab-records"
            onClick={() => setActiveView('records')}
            className={`px-4 py-3 text-xs font-semibold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeView === 'records'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Database size={15} />
            ตารางและบันทึกประวัติฟิล์มเสีย
          </button>
          <button
            id="nav-tab-settings"
            onClick={() => setActiveView('settings')}
            className={`px-4 py-3 text-xs font-semibold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeView === 'settings'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Settings size={15} />
            จัดการตัวเลือกรายการ (Settings)
          </button>
        </div>

        {/* Animated Sub Views rendering */}
        <AnimatePresence mode="wait">
          {activeView === 'dashboard' && (
            <motion.div
              key="dashboard-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
              className="space-y-6"
            >
              {/* Dynamic Filters component */}
              <DataFilters
                filters={filters}
                setFilters={setFilters}
                settings={settings}
                onClearFilters={handleClearFilters}
              />

              {/* Rich Visual Charts */}
              <DashboardCharts records={filteredRecords} />
            </motion.div>
          )}

          {activeView === 'records' && (
            <motion.div
              key="records-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
            >
              <RecordTable
                records={filteredRecords}
                settings={settings}
                onAddRecord={handleAddRecord}
                isAdding={isAddingRecord}
              />
            </motion.div>
          )}

          {activeView === 'settings' && (
            <motion.div
              key="settings-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
            >
              <SettingsManager
                initialSettings={settings}
                onSaveSettings={handleSaveSettings}
                isSaving={isSavingSettings}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer credits */}
      <footer className="mt-20 border-t border-slate-200 bg-white py-10 px-6 text-center text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="text-left">
            <span className="font-semibold text-slate-600 block">X-Ray Reject Management Software</span>
            <span className="text-[10px] text-slate-400 mt-1 block">
              จัดทำร่วมกับระบบ Google Workspace APIs & Google Sheets API v4 เพื่อความโปร่งใสในข้อมูลเวชระเบียน
            </span>
          </div>
          <div className="text-right text-[11px] font-medium text-slate-400">
            © 2026 X-Ray Radiology Quality Assurance Division. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
