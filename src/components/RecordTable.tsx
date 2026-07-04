import React, { useState } from 'react';
import { RejectRecord, SettingsConfig } from '../types';
import { Calendar, User, Layout, Eye, Clock, AlertTriangle, ChevronLeft, ChevronRight, Plus, Search, Filter, HelpCircle, FileSpreadsheet } from 'lucide-react';

interface RecordTableProps {
  records: RejectRecord[];
  settings: SettingsConfig;
  onAddRecord: (newRecord: Omit<RejectRecord, 'id' | 'rawRow' | 'rowIndex' | 'dateObj'>) => Promise<void>;
  isAdding: boolean;
}

export default function RecordTable({
  records,
  settings,
  onAddRecord,
  isAdding
}: RecordTableProps) {
  // Search & Pagination States
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Form States for adding a new record
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRecord, setNewRecord] = useState({
    date: new Date().toISOString().split('T')[0],
    staff: '',
    room: '',
    position: '',
    shift: '',
    cause: '',
    quantity: 1
  });

  // Pre-fill form dropdowns on show
  const handleToggleAddForm = () => {
    if (!showAddForm) {
      setNewRecord({
        date: new Date().toISOString().split('T')[0],
        staff: settings.staffs[0] || '',
        room: settings.rooms[0] || '',
        position: settings.positions[0] || '',
        shift: settings.shifts[0] || '',
        cause: settings.causes[0] || '',
        quantity: 1
      });
    }
    setShowAddForm(!showAddForm);
  };

  // Handle record submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecord.staff || !newRecord.room || !newRecord.position || !newRecord.shift || !newRecord.cause) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    const confirmed = window.confirm(
      `คุณกำลังจะบันทึกรายการฟิล์มเสียลงใน Google Sheets ของเจ้าหน้าที่ "${newRecord.staff}" สาเหตุ "${newRecord.cause}" ใช่หรือไม่?`
    );
    if (!confirmed) return;

    try {
      await onAddRecord(newRecord);
      setShowAddForm(false);
      alert('บันทึกข้อมูลฟิล์มเสียลง Google Sheet สำเร็จแล้ว!');
    } catch (err: any) {
      alert(`ไม่สามารถบันทึกข้อมูลได้: ${err.message || err}`);
    }
  };

  // Filter records based on search term
  const filteredRecords = records.filter(r => {
    const term = searchTerm.toLowerCase();
    return (
      r.staff.toLowerCase().includes(term) ||
      r.room.toLowerCase().includes(term) ||
      r.position.toLowerCase().includes(term) ||
      r.shift.toLowerCase().includes(term) ||
      r.cause.toLowerCase().includes(term) ||
      r.date.includes(term)
    );
  });

  // Pagination calculations
  const totalItems = filteredRecords.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + itemsPerPage);

  const goToPrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  return (
    <div className="space-y-6">
      {/* Search & Add Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            id="table-search-input"
            type="text"
            placeholder="ค้นหาตามชื่อเจ้าหน้าที่, ท่าตรวจ, ห้องตรวจ หรือสาเหตุเสีย..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-xs rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
          />
        </div>

        <button
          id="btn-toggle-add-record-form"
          onClick={handleToggleAddForm}
          className={`text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-sm font-semibold cursor-pointer ${
            showAddForm
              ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {showAddForm ? 'ปิดแบบฟอร์ม' : <><Plus size={15} />บันทึกข้อมูลฟิล์มเสียใหม่</>}
        </button>
      </div>

      {/* Add New Record Form */}
      {showAddForm && (
        <form
          id="form-add-reject-record"
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 animate-fadeIn"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <FileSpreadsheet size={15} />
              แบบฟอร์มบันทึกรายการถ่ายภาพรังสีเสีย (Add New Reject Entry)
            </h4>
            <span className="text-[10px] bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-bold">
              บันทึกสดลงชีตโดยตรง
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <Calendar size={13} className="text-blue-500" />
                วันที่เกิดเหตุ
              </label>
              <input
                id="input-record-date"
                type="date"
                required
                value={newRecord.date}
                onChange={(e) => setNewRecord(p => ({ ...p, date: e.target.value }))}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white text-slate-700 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Staff Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <User size={13} className="text-blue-500" />
                เจ้าหน้าที่ (Staff)
              </label>
              <select
                id="input-record-staff"
                required
                value={newRecord.staff}
                onChange={(e) => setNewRecord(p => ({ ...p, staff: e.target.value }))}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white text-slate-700 focus:border-blue-500 outline-none"
              >
                <option value="">-- เลือกเจ้าหน้าที่ --</option>
                {settings.staffs.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            {/* Room Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <Layout size={13} className="text-blue-500" />
                ห้องตรวจ (Room)
              </label>
              <select
                id="input-record-room"
                required
                value={newRecord.room}
                onChange={(e) => setNewRecord(p => ({ ...p, room: e.target.value }))}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white text-slate-700 focus:border-blue-500 outline-none"
              >
                <option value="">-- เลือกห้องตรวจ --</option>
                {settings.rooms.map(room => (
                  <option key={room} value={room}>{room}</option>
                ))}
              </select>
            </div>

            {/* Shift Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <Clock size={13} className="text-blue-500" />
                เวรปฏิบัติงาน (Shift)
              </label>
              <select
                id="input-record-shift"
                required
                value={newRecord.shift}
                onChange={(e) => setNewRecord(p => ({ ...p, shift: e.target.value }))}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white text-slate-700 focus:border-blue-500 outline-none"
              >
                <option value="">-- เลือกเวร --</option>
                {settings.shifts.map(shift => (
                  <option key={shift} value={shift}>{shift}</option>
                ))}
              </select>
            </div>

            {/* Position Dropdown */}
            <div className="col-span-1 md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <Eye size={13} className="text-blue-500" />
                Position / ท่าตรวจ
              </label>
              <select
                id="input-record-position"
                required
                value={newRecord.position}
                onChange={(e) => setNewRecord(p => ({ ...p, position: e.target.value }))}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white text-slate-700 focus:border-blue-500 outline-none"
              >
                <option value="">-- เลือกท่าตรวจ --</option>
                {settings.positions.map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>

            {/* Cause Dropdown */}
            <div className="col-span-1 md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <AlertTriangle size={13} className="text-blue-500" />
                สาเหตุถ่ายภาพเสีย
              </label>
              <select
                id="input-record-cause"
                required
                value={newRecord.cause}
                onChange={(e) => setNewRecord(p => ({ ...p, cause: e.target.value }))}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white text-slate-700 focus:border-blue-500 outline-none"
              >
                <option value="">-- เลือกสาเหตุเสีย --</option>
                {settings.causes.map(cause => (
                  <option key={cause} value={cause}>{cause}</option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">จำนวนฟิล์มเสีย</label>
              <input
                id="input-record-qty"
                type="number"
                min="1"
                required
                value={newRecord.quantity}
                onChange={(e) => setNewRecord(p => ({ ...p, quantity: parseInt(e.target.value, 10) || 1 }))}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white text-slate-700 focus:border-blue-500 outline-none"
              />
            </div>

            <div className="flex items-end justify-end md:col-span-3">
              <button
                id="btn-submit-add-record"
                type="submit"
                disabled={isAdding}
                className="w-full md:w-auto text-xs bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAdding ? 'กำลังเพิ่มประวัติเสีย...' : 'ส่งข้อมูลฟิล์มเสียเข้าระบบ'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Records Table Card */}
      <div id="records-table-container" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
            📜 ตารางประวัติภาพรังสีเสียทั้งหมด ({totalItems} รายการ)
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="py-3.5 px-6 text-xs font-semibold text-slate-500">วันที่</th>
                <th className="py-3.5 px-4 text-xs font-semibold text-slate-500">เจ้าหน้าที่</th>
                <th className="py-3.5 px-4 text-xs font-semibold text-slate-500">ห้องตรวจ</th>
                <th className="py-3.5 px-4 text-xs font-semibold text-slate-500">Position / ท่าตรวจ</th>
                <th className="py-3.5 px-4 text-xs font-semibold text-slate-500">เวร</th>
                <th className="py-3.5 px-4 text-xs font-semibold text-slate-500">สาเหตุ</th>
                <th className="py-3.5 px-6 text-xs font-semibold text-slate-500 text-right">จำนวนเสีย (ฟิล์ม)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                    <AlertTriangle size={24} className="mx-auto mb-2 text-slate-300" />
                    ไม่พบรายการข้อมูลตามตัวกรองที่ระบุ
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-6 text-xs text-slate-600 font-medium">{r.date}</td>
                    <td className="py-3 px-4 text-xs text-slate-800 font-semibold">{r.staff}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">{r.room}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">{r.position}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.shift === 'เช้า' || r.shift === 'Morning' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                        r.shift === 'บ่าย' || r.shift === 'Afternoon' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {r.shift}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 font-medium">
                      <span className="text-slate-700" title={r.cause}>{r.cause}</span>
                    </td>
                    <td className="py-3 px-6 text-xs font-bold text-red-600 text-right">{r.quantity}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination footer */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              แสดง {startIndex + 1} ถึง {Math.min(startIndex + itemsPerPage, totalItems)} จากทั้งหมด {totalItems} รายการ
            </span>
            <div className="flex items-center gap-1">
              <button
                id="btn-prev-page"
                onClick={goToPrevPage}
                disabled={currentPage === 1}
                className="p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-semibold text-slate-700 px-3">
                หน้า {currentPage} / {totalPages}
              </span>
              <button
                id="btn-next-page"
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className="p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
