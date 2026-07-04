import React from 'react';
import { FilterState, SettingsConfig } from '../types';
import { Calendar, User, Layout, Eye, Clock, AlertTriangle, RefreshCw } from 'lucide-react';

interface DataFiltersProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  settings: SettingsConfig;
  onClearFilters: () => void;
}

export default function DataFilters({
  filters,
  setFilters,
  settings,
  onClearFilters
}: DataFiltersProps) {
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div id="dashboard-filters" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200">
        <h3 className="text-sm font-medium text-slate-800 flex items-center gap-2">
          <span>🔍 ตัวเลือกตัวกรองข้อมูล (Filters)</span>
        </h3>
        <button
          id="clear-filters-btn"
          onClick={onClearFilters}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-blue-50"
        >
          <RefreshCw size={12} />
          ล้างตัวกรองทั้งหมด
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Date Filters */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
            <Calendar size={13} className="text-blue-500" />
            เริ่มวันที่
          </label>
          <input
            id="filter-start-date"
            type="date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
            className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-700 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
            <Calendar size={13} className="text-blue-500" />
            ถึงวันที่
          </label>
          <input
            id="filter-end-date"
            type="date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
            className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-700 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
          />
        </div>

        {/* Staff Filter */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
            <User size={13} className="text-blue-500" />
            เจ้าหน้าที่
          </label>
          <select
            id="filter-staff"
            value={filters.staff}
            onChange={(e) => handleFilterChange('staff', e.target.value)}
            className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-700 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all cursor-pointer"
          >
            <option value="">ทั้งหมด ({settings.staffs.length})</option>
            {settings.staffs.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* Room Filter */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
            <Layout size={13} className="text-blue-500" />
            ห้องตรวจ/เครื่องตรวจ
          </label>
          <select
            id="filter-room"
            value={filters.room}
            onChange={(e) => handleFilterChange('room', e.target.value)}
            className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-700 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all cursor-pointer"
          >
            <option value="">ทั้งหมด ({settings.rooms.length})</option>
            {settings.rooms.map((room) => (
              <option key={room} value={room}>
                {room}
              </option>
            ))}
          </select>
        </div>

        {/* Position Filter */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
            <Eye size={13} className="text-blue-500" />
            Position / ท่าตรวจ
          </label>
          <select
            id="filter-position"
            value={filters.position}
            onChange={(e) => handleFilterChange('position', e.target.value)}
            className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-700 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all cursor-pointer"
          >
            <option value="">ทั้งหมด ({settings.positions.length})</option>
            {settings.positions.map((pos) => (
              <option key={pos} value={pos}>
                {pos}
              </option>
            ))}
          </select>
        </div>

        {/* Shift Filter */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
            <Clock size={13} className="text-blue-500" />
            เวรตรวจ
          </label>
          <select
            id="filter-shift"
            value={filters.shift}
            onChange={(e) => handleFilterChange('shift', e.target.value)}
            className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-700 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all cursor-pointer"
          >
            <option value="">ทั้งหมด ({settings.shifts.length})</option>
            {settings.shifts.map((shift) => (
              <option key={shift} value={shift}>
                {shift}
              </option>
            ))}
          </select>
        </div>

        {/* Cause Filter */}
        <div className="col-span-1 md:col-span-2 space-y-1.5">
          <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
            <AlertTriangle size={13} className="text-blue-500" />
            สาเหตุถ่ายภาพเสีย
          </label>
          <select
            id="filter-cause"
            value={filters.cause}
            onChange={(e) => handleFilterChange('cause', e.target.value)}
            className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-700 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all cursor-pointer"
          >
            <option value="">ทั้งหมด ({settings.causes.length})</option>
            {settings.causes.map((cause) => (
              <option key={cause} value={cause}>
                {cause}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
