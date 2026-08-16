import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  Boxes, 
  Calendar, 
  RefreshCw, 
  Building2, 
  ShoppingCart, 
  ArrowUpRight, 
  Search,
  Filter,
  Coins,
  Clock,
  PackageX,
  Info,
  X,
  AlertTriangle
} from 'lucide-react';
import { formatCurrency, api } from '../services/api';

export default function AccountsReports({ suppliers }) {
  // Tab State
  const [activeTab, setActiveTab] = useState('sales'); // 'sales' or 'inventory'

  // Time Filter State
  const [salesPeriod, setSalesPeriod] = useState('monthly'); // 'daily', 'weekly', 'monthly', 'yearly', 'custom'
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  // Financial Report Data State
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Search filter inside tables
  const [salesSearch, setSalesSearch] = useState('');
  const [stockSearch, setStockSearch] = useState('');

  // Stagnant Medications Tab State
  const [stagnantData, setStagnantData] = useState(null);
  const [stagnantLoading, setStagnantLoading] = useState(false);
  const [stagnantSearch, setStagnantSearch] = useState('');
  const [stagnantDays, setStagnantDays] = useState('90');
  const [selectedStagnantMed, setSelectedStagnantMed] = useState(null);

  const fetchStagnantData = useCallback(async () => {
    setStagnantLoading(true);
    try {
      const data = await api.getStagnantMedications(stagnantDays);
      setStagnantData(data);
    } catch (err) {
      console.error('Failed to fetch stagnant medications:', err);
    } finally {
      setStagnantLoading(false);
    }
  }, [stagnantDays]);

  useEffect(() => {
    if (activeTab === 'stagnant') {
      fetchStagnantData();
    }
  }, [activeTab, fetchStagnantData]);

  // Fetch Unified Financial Report Data
  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getUnifiedFinancialReport({
        period: salesPeriod,
        startDate: customStartDate,
        endDate: customEndDate
      });
      setReportData(data);
    } catch (err) {
      console.error('Failed to load unified financial report:', err);
    } finally {
      setLoading(false);
    }
  }, [salesPeriod, customStartDate, customEndDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleApplyCustomDate = (e) => {
    e.preventDefault();
    fetchReport();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Navigation Tabs Header */}
      <div 
        style={{ 
          display: 'flex', 
          gap: '12px', 
          borderBottom: '2px solid var(--border-color)', 
          paddingBottom: '8px' 
        }}
      >
        <button
          onClick={() => setActiveTab('sales')}
          style={{
            padding: '12px 24px',
            borderRadius: '10px 10px 0 0',
            border: 'none',
            background: activeTab === 'sales' ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(15, 23, 42, 0.9))' : 'rgba(15, 23, 42, 0.4)',
            color: activeTab === 'sales' ? 'var(--accent-cyan)' : 'var(--text-muted)',
            fontWeight: activeTab === 'sales' ? 800 : 600,
            fontSize: '1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            borderBottom: activeTab === 'sales' ? '3px solid var(--accent-cyan)' : '3px solid transparent',
            transition: 'all 0.2s ease'
          }}
        >
          <TrendingUp size={20} />
          حسابات المبيعات
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          style={{
            padding: '12px 24px',
            borderRadius: '10px 10px 0 0',
            border: 'none',
            background: activeTab === 'inventory' ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(15, 23, 42, 0.9))' : 'rgba(15, 23, 42, 0.4)',
            color: activeTab === 'inventory' ? 'var(--accent-emerald)' : 'var(--text-muted)',
            fontWeight: activeTab === 'inventory' ? 800 : 600,
            fontSize: '1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            borderBottom: activeTab === 'inventory' ? '3px solid var(--accent-emerald)' : '3px solid transparent',
            transition: 'all 0.2s ease'
          }}
        >
          <Boxes size={20} />
          حسابات المتوفرات بالصيدلية
        </button>

        <button
          onClick={() => setActiveTab('stagnant')}
          style={{
            padding: '12px 24px',
            borderRadius: '10px 10px 0 0',
            border: 'none',
            background: activeTab === 'stagnant' ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(15, 23, 42, 0.9))' : 'rgba(15, 23, 42, 0.4)',
            color: activeTab === 'stagnant' ? '#f87171' : 'var(--text-muted)',
            fontWeight: activeTab === 'stagnant' ? 800 : 600,
            fontSize: '1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            borderBottom: activeTab === 'stagnant' ? '3px solid #f87171' : '3px solid transparent',
            transition: 'all 0.2s ease'
          }}
        >
          <PackageX size={20} />
          أدوية راكدة
        </button>
      </div>


      {/* Main Content Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* TAB 1: SALES ACCOUNTS */}
        {activeTab === 'sales' && (
          <>
            {/* Time Filter Toolbar */}
            <div 
              className="glass-card" 
              style={{ 
                padding: '18px 24px', 
                display: 'flex', 
                alignItems: 'center', 
                justifySpaceBetween: 'space-between', 
                flexWrap: 'wrap', 
                gap: '16px',
                background: 'rgba(15, 23, 42, 0.85)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Calendar size={20} color="var(--accent-cyan)" />
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                  تحديد الفترة الزمانية لتقرير المبيعات:
                </span>
              </div>

              {/* Filter Preset Buttons */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { key: 'daily', label: 'يومي (اليوم)' },
                  { key: 'weekly', label: 'أسبوعي (7 أيام)' },
                  { key: 'monthly', label: 'شهري (هذا الشهر)' },
                  { key: 'yearly', label: 'سنوي (هذه السنة)' },
                  { key: 'custom', label: 'تحديد مدة (من / إلى)' }
                ].map(item => (
                  <button
                    key={item.key}
                    onClick={() => setSalesPeriod(item.key)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: salesPeriod === item.key ? 'var(--accent-cyan)' : 'var(--border-color)',
                      background: salesPeriod === item.key ? 'rgba(6, 182, 212, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                      color: salesPeriod === item.key ? 'var(--accent-cyan)' : 'var(--text-muted)',
                      fontWeight: salesPeriod === item.key ? 700 : 500,
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Range Picker */}
              {salesPeriod === 'custom' && (
                <form onSubmit={handleApplyCustomDate} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '10px', width: '100%', borderTop: '1px dashed var(--border-color)', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>من تاريخ:</label>
                    <input
                      type="date"
                      className="form-control num"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>إلى تاريخ:</label>
                    <input
                      type="date"
                      className="form-control num"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
                    <Filter size={14} /> تطبيق التصفية
                  </button>
                </form>
              )}
            </div>

            {/* Financial Summary Cards for Sales */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
              
              {/* Total Sales */}
              <div 
                className="glass-card" 
                style={{ 
                  padding: '22px', 
                  background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(15, 23, 42, 0.9))', 
                  border: '1px solid rgba(6, 182, 212, 0.35)' 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    إجمالي المبيعات الصافية
                  </span>
                  <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.2)', color: 'var(--accent-cyan)' }}>
                    <TrendingUp size={22} />
                  </div>
                </div>
                <div className="num" style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '8px' }}>
                  {reportData ? reportData.formatted_total_sales : '0 د.ع'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                  إجمالي إيراد الفواتير للفترة المحددة ({reportData ? reportData.invoice_count : 0} فاتورة)
                </div>
              </div>

              {/* Total Cost */}
              <div 
                className="glass-card" 
                style={{ 
                  padding: '22px', 
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(15, 23, 42, 0.9))', 
                  border: '1px solid rgba(245, 158, 11, 0.3)' 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    إجمالي التكلفة الشرائية للمباع
                  </span>
                  <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}>
                    <ShoppingCart size={22} />
                  </div>
                </div>
                <div className="num" style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fbbf24', marginTop: '8px' }}>
                  {reportData ? reportData.formatted_total_cost : '0 د.ع'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                  مجموع بسعر الشراء للأدوية المباعة (<code className="num" style={{ color: '#fbbf24' }}>buy_price × quantity</code>)
                </div>
              </div>

              {/* Net Profit Card */}
              <div 
                className="glass-card" 
                style={{ 
                  padding: '22px', 
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(6, 78, 59, 0.85))', 
                  border: '2px solid #10b981',
                  boxShadow: '0 8px 32px rgba(16, 185, 129, 0.2)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.9rem', color: '#ffffff', fontWeight: 800 }}>
                    صافي الأرباح (Net Profit)
                  </span>
                  <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.2)', color: '#ffffff' }}>
                    <ArrowUpRight size={24} />
                  </div>
                </div>
                <div className="num" style={{ fontSize: '2.1rem', fontWeight: 900, color: '#ffffff', marginTop: '8px', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                  {reportData ? reportData.formatted_net_profit : '0 د.ع'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.9)', marginTop: '6px', fontWeight: 600 }}>
                  المعادلة: (إجمالي المبيعات - إجمالي التكلفة - الخصومات)
                </div>
              </div>

            </div>

            {/* Table: Supplier Sales Breakdown */}
            <div className="glass-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Building2 color="var(--accent-cyan)" size={22} />
                    تفكيك المبيعات حسب الموردين (Supplier Sales Breakdown)
                  </h3>
                  <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    تحليل مالي يوضح حصة مبيعات كل مورد بناءً على وجبات الأدوية المباعة للفترة المحددة
                  </p>
                </div>

                <div style={{ position: 'relative', width: '260px' }}>
                  <Search size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ابحث باسم المورد أو المذخر..."
                    value={salesSearch}
                    onChange={(e) => setSalesSearch(e.target.value)}
                    style={{ paddingRight: '36px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>اسم المورد / الشركة</th>
                      <th>اسم المذخر / المكتب</th>
                      <th>إجمالي المبيعات (د.ع)</th>
                      <th>نسبة المساهمة (%)</th>
                      <th>الكمية المباعة</th>
                      <th>تكلفة الشراء (د.ع)</th>
                      <th>صافي الربح للمورد (د.ع)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData && reportData.supplier_sales_breakdown && reportData.supplier_sales_breakdown
                      .filter(s => 
                        s.supplier_name.toLowerCase().includes(salesSearch.toLowerCase()) ||
                        s.company_name.toLowerCase().includes(salesSearch.toLowerCase())
                      )
                      .map((item, index) => {
                        const totalSalesVal = reportData.total_sales || 1;
                        const percentage = ((item.supplier_sales_total / totalSalesVal) * 100).toFixed(1);

                        return (
                          <tr key={item.supplier_id || index}>
                            <td className="num">{index + 1}</td>
                            <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{item.supplier_name}</td>
                            <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{item.company_name}</td>
                            <td className="num" style={{ fontWeight: 800, color: 'var(--accent-cyan)', fontSize: '0.95rem' }}>
                              {item.formatted_sales}
                            </td>
                            <td style={{ minWidth: '150px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                  <div 
                                    style={{ 
                                      height: '100%', 
                                      width: `${Math.min(100, Math.max(0, percentage))}%`, 
                                      background: 'linear-gradient(90deg, var(--accent-cyan), #0284c7)', 
                                      borderRadius: '4px' 
                                    }} 
                                  />
                                </div>
                                <span className="num" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                                  {percentage}%
                                </span>
                              </div>
                            </td>
                            <td className="num" style={{ fontWeight: 700 }}>{item.total_units_sold} قطعة</td>
                            <td className="num" style={{ color: 'var(--text-muted)' }}>{item.formatted_cost}</td>
                            <td className="num" style={{ fontWeight: 800, color: 'var(--accent-emerald)' }}>
                              {item.formatted_profit}
                            </td>
                          </tr>
                        );
                      })}

                    {(!reportData || !reportData.supplier_sales_breakdown || reportData.supplier_sales_breakdown.length === 0) && (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                          لا توجد مبيعات مسجلة خلال الفترة الزمانية المحددة
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* TAB 2: INVENTORY & STOCK ACCOUNTS */}
        {activeTab === 'inventory' && (
          <>
            {/* Inventory Summary Card */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '18px' }}>
              <div 
                className="glass-card" 
                style={{ 
                  padding: '24px', 
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(15, 23, 42, 0.9))', 
                  border: '1px solid rgba(168, 85, 247, 0.3)' 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                    قيمة الموجودات الحالية المتبقية بالمخزون
                  </span>
                  <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' }}>
                    <Boxes size={26} />
                  </div>
                </div>
                <div className="num" style={{ fontSize: '2.2rem', fontWeight: 900, color: '#c084fc', marginTop: '10px' }}>
                  {reportData ? reportData.formatted_inventory_value : '0 د.ع'}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                  القيمة الإجمالية بسعر الشراء لكافة المواد بالرفوف (بسعر البيع الكلي: <span className="num" style={{ color: '#c084fc', fontWeight: 700 }}>{reportData ? reportData.formatted_inventory_sell_value : '0 د.ع'}</span>)
                </div>
              </div>
            </div>

            {/* Table: Stock Value Per Supplier Breakdown */}
            <div className="glass-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Boxes color="var(--accent-emerald)" size={22} />
                    تفكيك الموجودات والمخزون حسب الموردين (Stock Value Per Supplier)
                  </h3>
                  <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    جدول تفصيلي يوضح القيمة المالية الشاملة للأدوية المتوفرة حالياً بالرفوف والمخزن التابعة لكل مورد على حدة
                  </p>
                </div>

                <div style={{ position: 'relative', width: '260px' }}>
                  <Search size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ابحث باسم المورد أو المذخر..."
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                    style={{ paddingRight: '36px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>اسم المورد / الشركة</th>
                      <th>اسم المذخر / المكتب</th>
                      <th>القيمة بسعر الشراء (د.ع)</th>
                      <th>القيمة بسعر البيع (د.ع)</th>
                      <th>الأرباح المتوقعة عند البيع (د.ع)</th>
                      <th>الكمية بالرفوف</th>
                      <th>عدد الوجبات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData && reportData.supplier_stock_breakdown && reportData.supplier_stock_breakdown
                      .filter(s => 
                        s.supplier_name.toLowerCase().includes(stockSearch.toLowerCase()) ||
                        s.company_name.toLowerCase().includes(stockSearch.toLowerCase())
                      )
                      .map((item, index) => (
                        <tr key={item.supplier_id || index}>
                          <td className="num">{index + 1}</td>
                          <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{item.supplier_name}</td>
                          <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{item.company_name}</td>
                          <td className="num" style={{ fontWeight: 800, color: '#fbbf24', fontSize: '0.95rem' }}>
                            {item.formatted_buy_value}
                          </td>
                          <td className="num" style={{ fontWeight: 800, color: 'var(--accent-emerald)', fontSize: '0.95rem' }}>
                            {item.formatted_sell_value}
                          </td>
                          <td className="num" style={{ fontWeight: 800, color: 'var(--accent-cyan)', fontSize: '0.95rem' }}>
                            {item.formatted_profit}
                          </td>
                          <td className="num" style={{ fontWeight: 700 }}>{item.current_stock_qty} قطعة</td>
                          <td className="num" style={{ color: 'var(--text-muted)' }}>{item.batch_count} وجبة</td>
                        </tr>
                      ))}

                    {(!reportData || !reportData.supplier_stock_breakdown || reportData.supplier_stock_breakdown.length === 0) && (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                          لا توجد أدوية أو وجبات متاحة في المخزن حالياً
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* TAB 3: STAGNANT MEDICATIONS & SUPPLIERS SUMMARY */}
        {activeTab === 'stagnant' && (
          <>
            {/* Stagnant KPI Header Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              
              {/* Card 1: Total Stagnant Value */}
              <div 
                className="glass-card" 
                style={{ 
                  padding: '20px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '16px',
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(15, 23, 42, 0.8))',
                  border: '1px solid rgba(239, 68, 68, 0.3)'
                }}
              >
                <div style={{ padding: '14px', borderRadius: '14px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}>
                  <Coins size={28} />
                </div>
                <div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block' }}>إجمالي قيمة الأدوية الراكدة بالمخزن</span>
                  <div className="num" style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f87171', marginTop: '2px' }}>
                    {stagnantData ? stagnantData.formatted_total_stagnant_value : '0 د.ع'}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                    تكلفة رأس المال المعطل بغير مبيعات
                  </span>
                </div>
              </div>

              {/* Card 2: Stagnant Items Count */}
              <div 
                className="glass-card" 
                style={{ 
                  padding: '20px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '16px',
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(15, 23, 42, 0.8))',
                  border: '1px solid rgba(245, 158, 11, 0.3)'
                }}
              >
                <div style={{ padding: '14px', borderRadius: '14px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}>
                  <PackageX size={28} />
                </div>
                <div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block' }}>عدد المواد والأدوية الراكدة</span>
                  <div className="num" style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fbbf24', marginTop: '2px' }}>
                    {stagnantData ? stagnantData.total_stagnant_count : 0} مواد
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                    أدوية متوفرة لم تُباع منذ {stagnantDays} يوماً
                  </span>
                </div>
              </div>

              {/* Card 3: Affected Suppliers Count */}
              <div 
                className="glass-card" 
                style={{ 
                  padding: '20px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '16px',
                  background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12), rgba(15, 23, 42, 0.8))',
                  border: '1px solid rgba(6, 182, 212, 0.3)'
                }}
              >
                <div style={{ padding: '14px', borderRadius: '14px', background: 'rgba(6, 182, 212, 0.2)', color: 'var(--accent-cyan)' }}>
                  <Building2 size={28} />
                </div>
                <div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block' }}>عدد المذاخر والموردين المتأثرين</span>
                  <div className="num" style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-cyan)', marginTop: '2px' }}>
                    {stagnantData && stagnantData.suppliers_summary ? stagnantData.suppliers_summary.length : 0} مذاخر
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                    مصادر توريد المواد الراكدة الحالية
                  </span>
                </div>
              </div>

            </div>

            {/* Section 1: جدول الأدوية الراكدة الإجمالي */}
            <div className="glass-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <AlertTriangle color="#f87171" size={20} />
                    جدول الأدوية الراكدة الإجمالي بالصيدلية
                  </h3>
                  <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    قائمة المواد والأدوية المتاحة بالمخزن والتي لم يُسجل لها كشف مبيعات منذ {stagnantDays} يوماً أو أكثر
                  </p>
                </div>

                {/* Filter Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>فترة الركود:</span>
                    <select
                      className="form-control"
                      value={stagnantDays}
                      onChange={(e) => setStagnantDays(e.target.value)}
                      style={{ width: '170px', fontSize: '0.85rem' }}
                    >
                      <option value="30">شهر واحد (30 يوماً)</option>
                      <option value="90">3 أشهر (90 يوماً)</option>
                      <option value="180">6 أشهر (180 يوماً)</option>
                      <option value="365">سنة كاملة (365 يوماً)</option>
                    </select>
                  </div>

                  <div style={{ position: 'relative', width: '240px' }}>
                    <Search size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="form-control"
                      placeholder="ابحث باسم المادة أو الباركوم..."
                      value={stagnantSearch}
                      onChange={(e) => setStagnantSearch(e.target.value)}
                      style={{ paddingRight: '36px', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              </div>

              {stagnantLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--accent-cyan)' }}>
                  <RefreshCw className="spin" size={26} style={{ marginBottom: '10px' }} />
                  <div>جاري تحليل وحساب حركة المخزون والأدوية الراكدة...</div>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>اسم المادة (التجاري والعلمي)</th>
                        <th>الفئة / الباركوم</th>
                        <th>الكمية الراكدة بالمخزن</th>
                        <th>سعر التكلفة / الشراء الفردي</th>
                        <th>الإجمالي الكلي (الكمية × التكلفة)</th>
                        <th>تاريخ آخر مبيعات</th>
                        <th>التفاصيل ومساهمات المذاخر</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stagnantData && stagnantData.stagnant_medications && stagnantData.stagnant_medications
                        .filter(m => 
                          m.trade_name?.toLowerCase().includes(stagnantSearch.toLowerCase()) ||
                          m.generic_name?.toLowerCase().includes(stagnantSearch.toLowerCase()) ||
                          m.barcode?.includes(stagnantSearch) ||
                          m.category?.toLowerCase().includes(stagnantSearch.toLowerCase())
                        )
                        .map((med, idx) => (
                          <tr key={med.medication_id || idx}>
                            <td className="num">{idx + 1}</td>
                            <td>
                              <div style={{ fontWeight: 800, color: '#ffffff' }}>{med.trade_name}</div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{med.generic_name}</div>
                            </td>
                            <td>
                              <span className="badge badge-secondary" style={{ fontSize: '0.78rem' }}>{med.category || 'عام'}</span>
                              {med.barcode && <span className="num" style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>{med.barcode}</span>}
                            </td>
                            <td className="num" style={{ fontWeight: 800, color: '#fbbf24', fontSize: '1rem' }}>
                              {med.total_stagnant_qty} قطعة
                            </td>
                            <td className="num" style={{ color: 'var(--text-main)' }}>
                              {formatCurrency(med.avg_buy_price)}
                            </td>
                            <td className="num" style={{ fontWeight: 900, color: '#f87171', fontSize: '1.05rem' }}>
                              {med.formatted_total_cost}
                            </td>
                            <td className="num" style={{ fontSize: '0.82rem', color: med.last_sale_date ? 'var(--text-muted)' : '#f87171' }}>
                              {med.last_sale_date ? med.last_sale_date.split('T')[0] : 'لم تُباع مطلقاً'}
                            </td>
                            <td>
                              <button 
                                className="btn btn-secondary" 
                                style={{ 
                                  padding: '6px 12px', 
                                  fontSize: '0.8rem', 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '6px',
                                  color: 'var(--accent-cyan)',
                                  borderColor: 'rgba(6, 182, 212, 0.4)'
                                }}
                                onClick={() => setSelectedStagnantMed(med)}
                              >
                                <Info size={14} /> تفاصيل المذاخر
                              </button>
                            </td>
                          </tr>
                        ))}

                      {(!stagnantData || !stagnantData.stagnant_medications || stagnantData.stagnant_medications.length === 0) && (
                        <tr>
                          <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                            🎉 ممتاز! لا توجد أدوية أو مواد راكدة في الصيدلية تطابق شروط البحث لم يمضِ عليها مبيعات منذ {stagnantDays} يوماً.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Section 2: قسم ملخص المذاخر (Suppliers Stagnant Summary) */}
            <div className="glass-card" style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Building2 color="var(--accent-cyan)" size={20} />
                  قسم ملخص المذاخر والموردين للأدوية الراكدة (Suppliers Stagnant Summary)
                </h3>
                <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  كشف مجمع لكل مذخر يوضح عدد المواد الراكدة التابعة له وإجمالي قيمتها المالية بالدينار العراقي
                </p>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>اسم المذخر / المورد</th>
                      <th>عدد المواد الراكدة التابعة له</th>
                      <th>الكمية الإجمالية بالقطعة</th>
                      <th>إجمالي قيمة الأدوية الراكدة (د.ع)</th>
                      <th>نسبة المساهمة من إجمالي ركود المخزون</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stagnantData && stagnantData.suppliers_summary && stagnantData.suppliers_summary.map((supp, index) => {
                      const totalVal = stagnantData.total_stagnant_value || 1;
                      const sharePercent = ((supp.stagnant_total_cost / totalVal) * 100).toFixed(1);
                      return (
                        <tr key={supp.supplier_id || index}>
                          <td className="num">{index + 1}</td>
                          <td style={{ fontWeight: 800, color: 'var(--accent-cyan)', fontSize: '0.98rem' }}>
                            {supp.supplier_name}
                          </td>
                          <td className="num" style={{ fontWeight: 700 }}>
                            <span className="badge badge-alert" style={{ fontSize: '0.82rem' }}>
                              {supp.stagnant_items_count} مواد راكدة
                            </span>
                          </td>
                          <td className="num" style={{ fontWeight: 700, color: '#fbbf24' }}>
                            {supp.stagnant_total_qty} قطعة
                          </td>
                          <td className="num" style={{ fontWeight: 900, color: '#f87171', fontSize: '1.05rem' }}>
                            {supp.formatted_total_cost}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ flex: 1, background: 'rgba(255, 255, 255, 0.1)', borderRadius: '6px', height: '8px', overflow: 'hidden' }}>
                                <div 
                                  style={{ 
                                    width: `${Math.min(100, Math.max(2, parseFloat(sharePercent)))}%`, 
                                    background: 'linear-gradient(90deg, #f87171, #fbbf24)', 
                                    height: '100%' 
                                  }} 
                                />
                              </div>
                              <span className="num" style={{ fontWeight: 800, fontSize: '0.85rem', color: '#f87171', minWidth: '45px' }}>
                                {sharePercent}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {(!stagnantData || !stagnantData.suppliers_summary || stagnantData.suppliers_summary.length === 0) && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                          لا يوجد ملخص مذاخر للأدوية الراكدة حالياً
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal: تفاصيل المذاخر لمادة راكدة معينة (Supplier Breakdown Modal for Selected Medication) */}
            {selectedStagnantMed && (
              <div className="modal-overlay" style={{ zIndex: 1100 }}>
                <div className="modal-content" style={{ maxWidth: '680px', border: '1px solid var(--accent-cyan)' }}>
                  <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Building2 size={22} color="var(--accent-cyan)" />
                      تفاصيل وتوزيع المذاخر للمادة الراكدة: ({selectedStagnantMed.trade_name})
                    </h3>
                    <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => setSelectedStagnantMed(null)}>
                      <X size={18} />
                    </button>
                  </div>

                  <div style={{ padding: '16px 0' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', background: 'rgba(255, 255, 255, 0.04)', padding: '14px', borderRadius: '10px', marginBottom: '16px' }}>
                      <div>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>الاسم العلمي:</span>
                        <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffffff' }}>{selectedStagnantMed.generic_name}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>إجمالي الكمية الراكدة:</span>
                        <span className="num" style={{ fontSize: '1rem', fontWeight: 800, color: '#fbbf24' }}>{selectedStagnantMed.total_stagnant_qty} قطعة</span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>متوسط سعر التكلفة/الشراء:</span>
                        <span className="num" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>{selectedStagnantMed.formatted_unit_price}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>إجمالي القيمة الراكدة للمادة:</span>
                        <span className="num" style={{ fontSize: '1.05rem', fontWeight: 900, color: '#f87171' }}>{selectedStagnantMed.formatted_total_cost}</span>
                      </div>
                    </div>

                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '10px' }}>
                      كشف المذاخر الموردة لهذه المادة والنسبة المئوية % لكل مذخر:
                    </h4>

                    <div className="table-container" style={{ maxHeight: '260px', overflowY: 'auto' }}>
                      <table>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>اسم المذخر / المورد</th>
                            <th>الكمية التابعة للمذخر</th>
                            <th>النسبة المئوية % للمساهمة</th>
                            <th>تاريخ وكمية آخر وجبة</th>
                            <th>إجمالي التكلفة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedStagnantMed.suppliers_breakdown && selectedStagnantMed.suppliers_breakdown.map((supp, index) => (
                            <tr key={supp.supplier_id || index}>
                              <td className="num">{index + 1}</td>
                              <td style={{ fontWeight: 800, color: 'var(--accent-cyan)' }}>{supp.supplier_name}</td>
                              <td className="num" style={{ fontWeight: 700 }}>{supp.quantity} قطعة</td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ flex: 1, background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                                    <div 
                                      style={{ 
                                        width: `${Math.min(100, Math.max(3, parseFloat(supp.percentage)))}%`, 
                                        background: 'linear-gradient(90deg, var(--accent-cyan), #fbbf24)', 
                                        height: '100%' 
                                      }} 
                                    />
                                  </div>
                                  <span className="num" style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--accent-cyan)' }}>
                                    {supp.percentage}%
                                  </span>
                                </div>
                              </td>
                              <td className="num" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {supp.last_purchase_date} ({supp.last_purchase_qty} قطعة)
                              </td>
                              <td className="num" style={{ fontWeight: 800, color: '#f87171' }}>
                                {supp.formatted_cost}
                              </td>
                            </tr>
                          ))}
                          {(!selectedStagnantMed.suppliers_breakdown || selectedStagnantMed.suppliers_breakdown.length === 0) && (
                            <tr>
                              <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                                لا تتوفّر بيانات مذاخر مفصلة لهذه المادة
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                    <button className="btn btn-primary" style={{ padding: '8px 24px' }} onClick={() => setSelectedStagnantMed(null)}>
                      إغلاق
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}