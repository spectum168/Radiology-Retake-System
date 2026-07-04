import React, { useState, useEffect } from 'react';
import { SettingsConfig } from '../types';
import {
  User,
  Layout,
  Eye,
  Clock,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  Save,
  Check,
  X,
  ExternalLink,
  Info
} from 'lucide-react';

interface SettingsManagerProps {
  initialSettings: SettingsConfig;
  onSaveSettings: (updated: SettingsConfig) => Promise<void>;
  isSaving: boolean;
}

type SettingTab = 'staffs' | 'rooms' | 'positions' | 'shifts' | 'causes';

export default function SettingsManager({
  initialSettings,
  onSaveSettings,
  isSaving
}: SettingsManagerProps) {
  const [activeTab, setActiveTab] = useState<SettingTab>('staffs');
  const [tempSettings, setTempSettings] = useState<SettingsConfig>({
    staffs: [],
    rooms: [],
    positions: [],
    shifts: [],
    causes: []
  });

  // Keep tracking what is being edited
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [newValue, setNewValue] = useState<string>('');

  // Sync state with initialSettings when they load
  useEffect(() => {
    setTempSettings(JSON.parse(JSON.stringify(initialSettings)));
  }, [initialSettings]);

  const activeList = tempSettings[activeTab];

  // Helper to add item
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanValue = newValue.trim();
    if (!cleanValue) return;

    if (activeList.includes(cleanValue)) {
      alert('รายการนี้มีอยู่แล้วในระบบ');
      return;
    }

    setTempSettings(prev => {
      const updated = { ...prev };
      updated[activeTab] = [...updated[activeTab], cleanValue];
      return updated;
    });
    setNewValue('');
  };

  // Helper to delete item
  const handleDeleteItem = (index: number) => {
    const itemToDelete = activeList[index];
    const confirmDelete = window.confirm(`คุณแน่ใจหรือไม่ที่จะลบ "${itemToDelete}" ออกจากรายการตั้งค่า?`);
    if (!confirmDelete) return;

    setTempSettings(prev => {
      const updated = { ...prev };
      updated[activeTab] = updated[activeTab].filter((_, i) => i !== index);
      return updated;
    });

    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  // Helper to start edit mode
  const startEdit = (index: number, val: string) => {
    setEditingIndex(index);
    setEditingValue(val);
  };

  // Helper to save edit
  const saveEdit = (index: number) => {
    const cleanVal = editingValue.trim();
    if (!cleanVal) return;

    setTempSettings(prev => {
      const updated = { ...prev };
      const currentList = [...updated[activeTab]];
      currentList[index] = cleanVal;
      updated[activeTab] = currentList;
      return updated;
    });
    setEditingIndex(null);
  };

  // Save changes to Google Sheet callback
  const handleSaveToSheet = () => {
    onSaveSettings(tempSettings);
  };

  const tabsInfo = [
    { id: 'staffs', label: 'รายชื่อเจ้าหน้าที่', icon: <User size={16} /> },
    { id: 'rooms', label: 'รายชื่อห้องตรวจ', icon: <Layout size={16} /> },
    { id: 'positions', label: 'Position / ท่าตรวจ', icon: <Eye size={16} /> },
    { id: 'shifts', label: 'เวรปฏิบัติงาน', icon: <Clock size={16} /> },
    { id: 'causes', label: 'สาเหตุถ่ายภาพเสีย', icon: <AlertTriangle size={16} /> }
  ];

  return (
    <div id="settings-manager-panel" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Settings Header */}
      <div className="bg-slate-50 border-b border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            ⚙️ จัดการระบบแผงควบคุมหลัก (Real-time Settings Manager)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            ปรับปรุงรายการเจ้าหน้าที่ ห้องตรวจ ท่า และสาเหตุฟิล์มเสีย ได้จากระบบโดยตรง
          </p>
        </div>
        <div className="flex gap-2.5">
          <a
            href="https://docs.google.com/spreadsheets/d/1m0z3oeFlxez6Mf7l5ZuTCfZhwsnab_6XwQiVcivDfZk/edit?gid=1870103233#gid=1870103233"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-white text-slate-600 hover:text-blue-600 border border-slate-200 px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm font-medium"
          >
            เปิด Google Sheets (Settings)
            <ExternalLink size={13} />
          </a>
          <button
            id="btn-save-settings-sheet"
            onClick={handleSaveToSheet}
            disabled={isSaving}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={14} />
            {isSaving ? 'กำลังจัดเก็บไฟล์...' : 'บันทึกลง Google Sheets'}
          </button>
        </div>
      </div>

      {/* Settings Tabs & Interface */}
      <div className="grid grid-cols-1 md:grid-cols-4 min-h-[450px]">
        {/* Left Side: Tabs */}
        <div className="bg-slate-50/50 border-r border-slate-200 p-4 space-y-1">
          {tabsInfo.map(tab => (
            <button
              key={tab.id}
              id={`tab-btn-${tab.id}`}
              onClick={() => {
                setActiveTab(tab.id as SettingTab);
                setEditingIndex(null);
                setNewValue('');
              }}
              className={`w-full text-xs font-semibold px-4 py-3 rounded-xl flex items-center gap-2.5 transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.icon}
              {tab.label}
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200/60 text-slate-600 font-bold">
                {tempSettings[tab.id as SettingTab].length}
              </span>
            </button>
          ))}

          <div className="pt-8 px-2 text-[11px] text-slate-400 space-y-2">
            <div className="flex gap-1.5">
              <Info size={14} className="text-slate-300 shrink-0 mt-0.5" />
              <span>การแก้ไขหรือเพิ่มข้อมูลตรงนี้ จะอัปเดตลงใน Google Sheet หน้า Settings โดยอัตโนมัติ</span>
            </div>
            <p>เมื่ออัปเดตแล้ว ตัวเลือกดรอปดาวน์ในแดชบอร์ดและหน้ากรองข้อมูลจะเปลี่ยนตามเรียลไทม์ทันที</p>
          </div>
        </div>

        {/* Right Side: List Editor */}
        <div className="md:col-span-3 p-6 flex flex-col h-full justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 capitalize">
                {tabsInfo.find(t => t.id === activeTab)?.label}
              </h3>
            </div>

            {/* Form to Add Item */}
            <form onSubmit={handleAddItem} className="flex gap-2 mb-6">
              <input
                id="input-new-setting"
                type="text"
                placeholder={`เพิ่มข้อมูลใน ${tabsInfo.find(t => t.id === activeTab)?.label}...`}
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                className="flex-1 text-xs px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              />
              <button
                id="btn-add-setting"
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 rounded-xl flex items-center gap-1 transition-all shadow-sm font-semibold"
              >
                <Plus size={14} />
                เพิ่มในรายการ
              </button>
            </form>

            {/* List of values */}
            {activeList.length === 0 ? (
              <div className="text-center py-10 text-slate-400 border border-dashed border-slate-200 rounded-xl">
                <AlertTriangle size={24} className="mx-auto mb-2 text-slate-300" />
                <p className="text-xs">ยังไม่มีข้อมูลในรายการนี้</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-200 max-h-[280px] overflow-y-auto">
                {activeList.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 text-xs text-slate-700 hover:bg-slate-50 transition-colors">
                    {editingIndex === idx ? (
                      <div className="flex items-center gap-2 w-full">
                        <input
                          id={`edit-setting-input-${idx}`}
                          type="text"
                          value={editingValue}
                          onChange={e => setEditingValue(e.target.value)}
                          className="flex-1 text-xs px-2.5 py-1 border border-blue-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          id={`btn-save-edit-${idx}`}
                          onClick={() => saveEdit(idx)}
                          className="p-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg"
                          title="บันทึก"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          id={`btn-cancel-edit-${idx}`}
                          onClick={() => setEditingIndex(null)}
                          className="p-1 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-lg"
                          title="ยกเลิก"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium text-slate-700">{item}</span>
                        <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                          <button
                            id={`btn-start-edit-${idx}`}
                            onClick={() => startEdit(idx, item)}
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="แก้ไข"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            id={`btn-delete-setting-${idx}`}
                            onClick={() => handleDeleteItem(idx)}
                            className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                            title="ลบ"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 text-[11px] text-slate-400 flex items-center justify-between">
            <span>สามารถปรับปรุงรายชื่อได้ในหน้านี้ และอย่าลืมบันทึกลงในสเปรดชีต</span>
            <span className="font-semibold text-slate-500">จำนวนทั้งหมด: {activeList.length} รายการ</span>
          </div>
        </div>
      </div>
    </div>
  );
}
