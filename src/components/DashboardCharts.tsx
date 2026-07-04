import { useState, useMemo } from 'react';
import { RejectRecord, ChartType } from '../types';
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
  LineChart,
  Line,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { AlertCircle, Users, Activity, Layers, Calendar, BarChart2, PieChart as PieIcon, TrendingUp, Maximize2, Minimize2 } from 'lucide-react';

interface DashboardChartsProps {
  records: RejectRecord[];
}

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

export default function DashboardCharts({ records }: DashboardChartsProps) {
  // Chart type selections
  const [trendChartType, setTrendChartType] = useState<ChartType>('area');
  const [causeChartType, setCauseChartType] = useState<ChartType>('pie');
  const [staffChartType, setStaffChartType] = useState<ChartType>('bar');
  const [roomChartType, setRoomChartType] = useState<ChartType>('bar');
  const [positionChartType, setPositionChartType] = useState<ChartType>('bar');
  const [shiftChartType, setShiftChartType] = useState<ChartType>('pie');

  // Fullscreen chart tracking
  const [fullscreenChart, setFullscreenChart] = useState<'trend' | 'causes' | 'staff' | 'room' | 'position' | 'shift' | null>(null);

  // KPI Calculations
  const metrics = useMemo(() => {
    const totalRejects = records.reduce((sum, r) => sum + r.quantity, 0);

    // Most common cause
    const causeCounts: Record<string, number> = {};
    const staffCounts: Record<string, number> = {};
    const shiftCounts: Record<string, number> = {};

    records.forEach(r => {
      causeCounts[r.cause] = (causeCounts[r.cause] || 0) + r.quantity;
      staffCounts[r.staff] = (staffCounts[r.staff] || 0) + r.quantity;
      shiftCounts[r.shift] = (shiftCounts[r.shift] || 0) + r.quantity;
    });

    let mainCause = 'N/A';
    let maxCauseCount = 0;
    Object.entries(causeCounts).forEach(([cause, count]) => {
      if (count > maxCauseCount) {
        maxCauseCount = count;
        mainCause = cause;
      }
    });

    let peakShift = 'N/A';
    let maxShiftCount = 0;
    Object.entries(shiftCounts).forEach(([shift, count]) => {
      if (count > maxShiftCount) {
        maxShiftCount = count;
        peakShift = shift;
      }
    });

    const activeStaffCount = Object.keys(staffCounts).length;

    return {
      totalRejects,
      mainCause,
      mainCausePercentage: totalRejects > 0 ? ((maxCauseCount / totalRejects) * 100).toFixed(1) : '0',
      peakShift,
      peakShiftCount: maxShiftCount,
      activeStaffCount
    };
  }, [records]);

  // Data preps
  const trendData = useMemo(() => {
    const dailyMap: Record<string, number> = {};
    records.forEach(r => {
      const dateStr = r.date || 'ไม่ระบุวันที่';
      dailyMap[dateStr] = (dailyMap[dateStr] || 0) + r.quantity;
    });

    return Object.entries(dailyMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [records]);

  const causeData = useMemo(() => {
    const causeMap: Record<string, number> = {};
    records.forEach(r => {
      causeMap[r.cause] = (causeMap[r.cause] || 0) + r.quantity;
    });

    const total = records.reduce((sum, r) => sum + r.quantity, 0);

    return Object.entries(causeMap)
      .map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? parseFloat(((value / total) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.value - a.value);
  }, [records]);

  const staffData = useMemo(() => {
    const staffMap: Record<string, number> = {};
    records.forEach(r => {
      staffMap[r.staff] = (staffMap[r.staff] || 0) + r.quantity;
    });

    return Object.entries(staffMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [records]);

  const roomData = useMemo(() => {
    const roomMap: Record<string, number> = {};
    records.forEach(r => {
      roomMap[r.room] = (roomMap[r.room] || 0) + r.quantity;
    });

    return Object.entries(roomMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [records]);

  const positionData = useMemo(() => {
    const posMap: Record<string, number> = {};
    records.forEach(r => {
      posMap[r.position] = (posMap[r.position] || 0) + r.quantity;
    });

    return Object.entries(posMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 positions
  }, [records]);

  const shiftData = useMemo(() => {
    const shiftMap: Record<string, number> = {};
    records.forEach(r => {
      shiftMap[r.shift] = (shiftMap[r.shift] || 0) + r.quantity;
    });

    const total = records.reduce((sum, r) => sum + r.quantity, 0);

    return Object.entries(shiftMap)
      .map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? parseFloat(((value / total) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.value - a.value);
  }, [records]);

  // Generic Chart Renderer
  const renderChart = (
    data: any[],
    type: ChartType,
    dataKey: string,
    nameKey: string,
    color = '#4F46E5'
  ) => {
    if (data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
          <AlertCircle size={28} className="mb-2 text-slate-300" />
          <span className="text-xs">ไม่มีข้อมูลพอกระจายบนแผนภูมิ</span>
        </div>
      );
    }

    const CustomTooltip = ({ active, payload }: any) => {
      if (active && payload && payload.length) {
        const item = payload[0];
        const displayName = item.payload[nameKey] || item.name;
        return (
          <div className="bg-slate-900 text-white p-3 rounded-lg text-xs shadow-xl border border-slate-800">
            <p className="font-bold mb-1.5 text-slate-200">{displayName}</p>
            <p className="text-slate-400">
              จำนวน: <span className="font-bold text-white">{item.value} ฟิล์ม</span>
            </p>
            {item.payload.percentage !== undefined && (
              <p className="text-emerald-400 font-semibold mt-1">
                ร้อยละ: {item.payload.percentage}%
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
              outerRadius={80}
              fill="#8884d8"
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

      case 'line':
        return (
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis dataKey={nameKey} tick={{ fontSize: 10, fill: '#64748B' }} stroke="#CBD5E1" />
            <YAxis tick={{ fontSize: 10, fill: '#64748B' }} stroke="#CBD5E1" />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2.5}
              activeDot={{ r: 6 }}
              name="จำนวนถ่ายเสีย"
            />
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={color} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis dataKey={nameKey} tick={{ fontSize: 10, fill: '#64748B' }} stroke="#CBD5E1" />
            <YAxis tick={{ fontSize: 10, fill: '#64748B' }} stroke="#CBD5E1" />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorArea)"
              name="จำนวนถ่ายเสีย"
            />
          </AreaChart>
        );

      case 'radar':
        return (
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
            <PolarGrid stroke="#E2E8F0" />
            <PolarAngleAxis dataKey={nameKey} tick={{ fontSize: 10, fill: '#64748B' }} />
            <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fontSize: 9 }} />
            <Radar
              name="จำนวนถ่ายเสีย"
              dataKey={dataKey}
              stroke={color}
              fill={color}
              fillOpacity={0.2}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        );

      case 'bar':
      default:
        return (
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis dataKey={nameKey} tick={{ fontSize: 10, fill: '#64748B' }} stroke="#CBD5E1" />
            <YAxis tick={{ fontSize: 10, fill: '#64748B' }} stroke="#CBD5E1" />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} name="จำนวนถ่ายเสีย">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Rejects */}
        <div id="kpi-total-rejects" className="bg-white rounded-2xl border border-slate-200 border-l-4 border-l-red-400 p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ฟิล์มเสียสะสม</span>
            <div className="p-2 bg-red-50 rounded-lg text-red-500">
              <Activity size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-slate-900">{metrics.totalRejects} <span className="text-xs font-normal text-slate-400">เคส</span></h3>
            <p className="text-[11px] text-slate-500 mt-1">จำนวนภาพรังสีที่ถูกปฏิเสธ/ถ่ายเสีย</p>
          </div>
        </div>

        {/* Most Common Cause */}
        <div id="kpi-main-cause" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">สาเหตุเสียหลัก</span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-500">
              <AlertCircle size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-bold text-slate-900 truncate" title={metrics.mainCause}>
              {metrics.mainCause}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              คิดเป็นร้อยละ <span className="font-bold text-slate-700">{metrics.mainCausePercentage}%</span>
            </p>
          </div>
        </div>

        {/* Active Staff */}
        <div id="kpi-active-staff" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">เจ้าหน้าที่ถ่ายเสีย</span>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Users size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-900">{metrics.activeStaffCount} <span className="text-xs font-medium text-slate-500">คน</span></h3>
            <p className="text-[11px] text-slate-500 mt-1">จำนวนรังสีเทคนิคที่ระบุในประวัติเสีย</p>
          </div>
        </div>

        {/* Peak Shift */}
        <div id="kpi-peak-shift" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">เวรที่ถ่ายเสียสูงสุด</span>
            <div className="p-2 bg-cyan-50 rounded-lg text-cyan-600">
              <Layers size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-900">{metrics.peakShift}</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              ยอดรวมเวรนี้ <span className="font-semibold text-slate-700">{metrics.peakShiftCount} ภาพ</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Overall */}
        <div id="chart-trend" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[380px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <TrendingUp size={16} className="text-blue-600" />
                กราฟแนวโน้มภาพรวมรายวัน (Overall Daily Trend)
              </h4>
              <p className="text-xs text-slate-400">แสดงจำนวนภาพรังสีเสียจำแนกตามรายวัน</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 rounded-lg p-0.5">
                {(['area', 'line', 'bar'] as ChartType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setTrendChartType(type)}
                    className={`text-[10px] px-2 py-1 rounded-md font-semibold capitalize transition-all ${
                      trendChartType === type
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {type === 'area' ? 'Area' : type === 'line' ? 'Line' : 'Bar'}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setFullscreenChart('trend')}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all border border-slate-100 shadow-sm"
                title="ขยายเต็มจอ (Full Screen)"
              >
                <Maximize2 size={14} />
              </button>
            </div>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart(trendData, trendChartType, 'count', 'date', '#2563EB')}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Causes Percentage */}
        <div id="chart-causes" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[380px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <AlertCircle size={16} className="text-blue-600" />
                กราฟแยกตามสาเหตุเสีย & ร้อยละ (Causes Breakdown)
              </h4>
              <p className="text-xs text-slate-400">แสดงสัดส่วนร้อยละของแต่ละสาเหตุถ่ายภาพรังสีเสีย</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 rounded-lg p-0.5">
                {(['pie', 'bar', 'radar'] as ChartType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setCauseChartType(type)}
                    className={`text-[10px] px-2 py-1 rounded-md font-semibold capitalize transition-all ${
                      causeChartType === type
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {type === 'pie' ? 'Pie' : type === 'bar' ? 'Bar' : 'Radar'}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setFullscreenChart('causes')}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all border border-slate-100 shadow-sm"
                title="ขยายเต็มจอ (Full Screen)"
              >
                <Maximize2 size={14} />
              </button>
            </div>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart(causeData, causeChartType, 'value', 'name', '#34D399')}
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Main Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Staff Comparison */}
        <div id="chart-staff" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[380px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <Users size={16} className="text-blue-600" />
                กราฟเปรียบเทียบรายบุคคล (Individual Comparison)
              </h4>
              <p className="text-xs text-slate-400">เปรียบเทียบจำนวนการทำภาพเสียของเจ้าหน้าที่แต่ละคน</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 rounded-lg p-0.5">
                {(['bar', 'radar', 'pie'] as ChartType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setStaffChartType(type)}
                    className={`text-[10px] px-2 py-1 rounded-md font-semibold capitalize transition-all ${
                      staffChartType === type
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {type === 'bar' ? 'Bar' : type === 'radar' ? 'Radar' : 'Pie'}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setFullscreenChart('staff')}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all border border-slate-100 shadow-sm"
                title="ขยายเต็มจอ (Full Screen)"
              >
                <Maximize2 size={14} />
              </button>
            </div>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart(staffData, staffChartType, 'value', 'name', '#2563EB')}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Room Comparison */}
        <div id="chart-room" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[380px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <Layers size={16} className="text-blue-600" />
                กราฟแยกตามชื่อห้อง/เครื่องรังสี (Room Comparison)
              </h4>
              <p className="text-xs text-slate-400">เปรียบเทียบฟิล์มเสียของแต่ละห้องหรือเครื่องตรวจ</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 rounded-lg p-0.5">
                {(['bar', 'pie'] as ChartType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setRoomChartType(type)}
                    className={`text-[10px] px-2 py-1 rounded-md font-semibold capitalize transition-all ${
                      roomChartType === type
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {type === 'bar' ? 'Bar' : 'Pie'}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setFullscreenChart('room')}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all border border-slate-100 shadow-sm"
                title="ขยายเต็มจอ (Full Screen)"
              >
                <Maximize2 size={14} />
              </button>
            </div>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart(roomData, roomChartType, 'value', 'name', '#38BDF8')}
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3 breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Position Comparison */}
        <div id="chart-position" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[380px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <Activity size={16} className="text-blue-600" />
                กราฟแยกตาม Position / ท่าตรวจ (Top 10)
              </h4>
              <p className="text-xs text-slate-400">แสดงสัดส่วนความถี่ท่าตรวจหรืออวัยวะที่ถ่ายเสียสูงสุด</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 rounded-lg p-0.5">
                {(['bar', 'radar'] as ChartType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setPositionChartType(type)}
                    className={`text-[10px] px-2 py-1 rounded-md font-semibold capitalize transition-all ${
                      positionChartType === type
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {type === 'bar' ? 'Bar' : 'Radar'}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setFullscreenChart('position')}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all border border-slate-100 shadow-sm"
                title="ขยายเต็มจอ (Full Screen)"
              >
                <Maximize2 size={14} />
              </button>
            </div>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart(positionData, positionChartType, 'value', 'name', '#818CF8')}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Shift Comparison */}
        <div id="chart-shift" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[380px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <Calendar size={16} className="text-blue-600" />
                กราฟแยกตามเวรปฏิบัติงาน (Shift Breakdown)
              </h4>
              <p className="text-xs text-slate-400">เปรียบเทียบสัดส่วนและจำนวนฟิล์มเสียจำแนกตามกะหรือเวร</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 rounded-lg p-0.5">
                {(['pie', 'bar'] as ChartType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setShiftChartType(type)}
                    className={`text-[10px] px-2 py-1 rounded-md font-semibold capitalize transition-all ${
                      shiftChartType === type
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {type === 'pie' ? 'Pie' : 'Bar'}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setFullscreenChart('shift')}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all border border-slate-100 shadow-sm"
                title="ขยายเต็มจอ (Full Screen)"
              >
                <Maximize2 size={14} />
              </button>
            </div>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart(shiftData, shiftChartType, 'value', 'name', '#F59E0B')}
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Fullscreen Overlay Modal */}
      {fullscreenChart && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 transition-all duration-300">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col p-6 relative animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
              <div>
                <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  {fullscreenChart === 'trend' && <><TrendingUp size={20} className="text-blue-600" /> กราฟแนวโน้มภาพรวมรายวัน (Overall Daily Trend)</>}
                  {fullscreenChart === 'causes' && <><AlertCircle size={20} className="text-blue-600" /> กราฟแยกตามสาเหตุเสีย & ร้อยละ (Causes Breakdown)</>}
                  {fullscreenChart === 'staff' && <><Users size={20} className="text-blue-600" /> กราฟเปรียบเทียบรายบุคคล (Individual Comparison)</>}
                  {fullscreenChart === 'room' && <><Layers size={20} className="text-blue-600" /> กราฟแยกตามชื่อห้อง/เครื่องรังสี (Room Comparison)</>}
                  {fullscreenChart === 'position' && <><Activity size={20} className="text-blue-600" /> กราฟแยกตาม Position / ท่าตรวจ (Top 10)</>}
                  {fullscreenChart === 'shift' && <><Calendar size={20} className="text-blue-600" /> กราฟแยกตามเวรปฏิบัติงาน (Shift Breakdown)</>}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  {fullscreenChart === 'trend' && 'แสดงจำนวนภาพรังสีเสียจำแนกตามรายวัน'}
                  {fullscreenChart === 'causes' && 'แสดงสัดส่วนร้อยละของแต่ละสาเหตุถ่ายภาพรังสีเสีย'}
                  {fullscreenChart === 'staff' && 'เปรียบเทียบจำนวนการทำภาพเสียของเจ้าหน้าที่แต่ละคน'}
                  {fullscreenChart === 'room' && 'เปรียบเทียบฟิล์มเสียของแต่ละห้องหรือเครื่องตรวจ'}
                  {fullscreenChart === 'position' && 'แสดงสัดส่วนความถี่ท่าตรวจหรืออวัยวะที่ถ่ายเสียสูงสุด'}
                  {fullscreenChart === 'shift' && 'เปรียบเทียบสัดส่วนและจำนวนฟิล์มเสียจำแนกตามกะหรือเวร'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Embedded controls inside modal */}
                {fullscreenChart === 'trend' && (
                  <div className="flex bg-slate-100 rounded-lg p-0.5 mr-2">
                    {(['area', 'line', 'bar'] as ChartType[]).map(type => (
                      <button
                        key={type}
                        onClick={() => setTrendChartType(type)}
                        className={`text-xs px-2.5 py-1 rounded-md font-semibold capitalize transition-all ${
                          trendChartType === type
                            ? 'bg-white text-slate-800 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {type === 'area' ? 'Area' : type === 'line' ? 'Line' : 'Bar'}
                      </button>
                    ))}
                  </div>
                )}
                {fullscreenChart === 'causes' && (
                  <div className="flex bg-slate-100 rounded-lg p-0.5 mr-2">
                    {(['pie', 'bar', 'radar'] as ChartType[]).map(type => (
                      <button
                        key={type}
                        onClick={() => setCauseChartType(type)}
                        className={`text-xs px-2.5 py-1 rounded-md font-semibold capitalize transition-all ${
                          causeChartType === type
                            ? 'bg-white text-slate-800 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {type === 'pie' ? 'Pie' : type === 'bar' ? 'Bar' : 'Radar'}
                      </button>
                    ))}
                  </div>
                )}
                {fullscreenChart === 'staff' && (
                  <div className="flex bg-slate-100 rounded-lg p-0.5 mr-2">
                    {(['bar', 'radar', 'pie'] as ChartType[]).map(type => (
                      <button
                        key={type}
                        onClick={() => setStaffChartType(type)}
                        className={`text-xs px-2.5 py-1 rounded-md font-semibold capitalize transition-all ${
                          staffChartType === type
                            ? 'bg-white text-slate-800 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {type === 'bar' ? 'Bar' : type === 'radar' ? 'Radar' : 'Pie'}
                      </button>
                    ))}
                  </div>
                )}
                {fullscreenChart === 'room' && (
                  <div className="flex bg-slate-100 rounded-lg p-0.5 mr-2">
                    {(['bar', 'pie'] as ChartType[]).map(type => (
                      <button
                        key={type}
                        onClick={() => setRoomChartType(type)}
                        className={`text-xs px-2.5 py-1 rounded-md font-semibold capitalize transition-all ${
                          roomChartType === type
                            ? 'bg-white text-slate-800 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {type === 'bar' ? 'Bar' : 'Pie'}
                      </button>
                    ))}
                  </div>
                )}
                {fullscreenChart === 'position' && (
                  <div className="flex bg-slate-100 rounded-lg p-0.5 mr-2">
                    {(['bar', 'radar'] as ChartType[]).map(type => (
                      <button
                        key={type}
                        onClick={() => setPositionChartType(type)}
                        className={`text-xs px-2.5 py-1 rounded-md font-semibold capitalize transition-all ${
                          positionChartType === type
                            ? 'bg-white text-slate-800 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {type === 'bar' ? 'Bar' : 'Radar'}
                      </button>
                    ))}
                  </div>
                )}
                {fullscreenChart === 'shift' && (
                  <div className="flex bg-slate-100 rounded-lg p-0.5 mr-2">
                    {(['pie', 'bar'] as ChartType[]).map(type => (
                      <button
                        key={type}
                        onClick={() => setShiftChartType(type)}
                        className={`text-xs px-2.5 py-1 rounded-md font-semibold capitalize transition-all ${
                          shiftChartType === type
                            ? 'bg-white text-slate-800 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {type === 'pie' ? 'Pie' : 'Bar'}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setFullscreenChart(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-all flex items-center gap-1 text-xs font-semibold border border-slate-200 shadow-sm"
                  title="ย่อกลับ (Exit Full Screen)"
                >
                  <Minimize2 size={16} />
                  <span className="hidden sm:inline">ย่อหน้าจอ</span>
                </button>
              </div>
            </div>

            {/* Content Chart Container */}
            <div className="flex-1 w-full min-h-0 bg-slate-50 rounded-xl p-4 md:p-6 border border-slate-100">
              <ResponsiveContainer width="100%" height="100%">
                {fullscreenChart === 'trend' && renderChart(trendData, trendChartType, 'count', 'date', '#2563EB')}
                {fullscreenChart === 'causes' && renderChart(causeData, causeChartType, 'value', 'name', '#34D399')}
                {fullscreenChart === 'staff' && renderChart(staffData, staffChartType, 'value', 'name', '#2563EB')}
                {fullscreenChart === 'room' && renderChart(roomData, roomChartType, 'value', 'name', '#38BDF8')}
                {fullscreenChart === 'position' && renderChart(positionData, positionChartType, 'value', 'name', '#818CF8')}
                {fullscreenChart === 'shift' && renderChart(shiftData, shiftChartType, 'value', 'name', '#F59E0B')}
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
