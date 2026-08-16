import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Calendar, 
  AlertTriangle, 
  Edit3, 
  Trash2, 
  X, 
  Check, 
  Layers, 
  Filter,
  Printer,
  QrCode
} from 'lucide-react';
import { formatCurrency } from '../services/api';

// Code 128-B SVG Barcode Generator (High-precision & Crisp Printing)
const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112"
];

function generateCode128Bars(text) {
  const clean = String(text || '12345678').trim();
  const codes = [104]; // Start B
  let checkSum = 104;

  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i);
    const code = charCode >= 32 && charCode <= 126 ? charCode - 32 : 0;
    codes.push(code);
    checkSum += code * (i + 1);
  }

  codes.push(checkSum % 103);
  codes.push(106); // Stop pattern

  const bars = [];
  let currentX = 10; // Left quiet zone

  codes.forEach(c => {
    const pattern = CODE128_PATTERNS[c] || CODE128_PATTERNS[0];
    let isBar = true;
    for (let i = 0; i < pattern.length; i++) {
      const width = parseInt(pattern[i], 10) * 1.5;
      if (isBar) {
        bars.push({ x: currentX, width });
      }
      currentX += width;
      isBar = !isBar;
    }
  });

  const totalWidth = currentX + 10; // Right quiet zone
  return { bars, totalWidth };
}

function BarcodeSvg({ text, height = 44 }) {
  const { bars, totalWidth } = generateCode128Bars(text);

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${height}`}
      style={{ width: '100%', height: `${height}px`, display: 'block', margin: '0 auto' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width={totalWidth} height={height} fill="#ffffff" />
      {bars.map((bar, i) => (
        <rect key={i} x={bar.x} y={0} width={bar.width} height={height} fill="#000000" />
      ))}
    </svg>
  );
}

export default function Batches({ batches, medications, suppliers = [], expiringAlerts, systemSettings, onAddBatch, onUpdateBatch, onDeleteBatch }) {

  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL', 'ALERT_ALL', 'EXPIRED', 'NEAR_EXPIRY'
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);

  // Barcode Printing Modal State
  const [barcodePrintModal, setBarcodePrintModal] = useState({
    isOpen: false,
    batch: null,
    showPrice: true,
    copies: 1
  });

  const handleOpenBarcodePrintModal = (batch) => {
    setBarcodePrintModal({
      isOpen: true,
      batch,
      showPrice: true,
      copies: 1
    });
  };

  const handleCloseBarcodePrintModal = () => {
    setBarcodePrintModal({
      isOpen: false,
      batch: null,
      showPrice: true,
      copies: 1
    });
  };

  const nearExpiryMonths = systemSettings?.near_expiry_months || 9;
  const returnWindowDays = systemSettings?.return_window_days || 90;

  // Dynamic Expiry Analytics
  const expiringStockValue = expiringAlerts.reduce((sum, b) => sum + (b.sell_price * b.quantity), 0);
  const expiredCount = expiringAlerts.filter(b => b.is_expired || new Date(b.expiry_date) < new Date()).length;
  const warningCount = expiringAlerts.length - expiredCount;

  // Unique categories gathered from stored medications & batches
  const uniqueCategories = Array.from(
    new Set([
      ...medications.map(m => m.category),
      ...batches.map(b => b.category)
    ].filter(Boolean))
  );

  const displayBatches = batches.filter(batch => {
    const isExpired = batch.is_expired || (new Date(batch.expiry_date) < new Date());
    const alertIds = expiringAlerts.map(a => a.id);
    const isAlert = alertIds.includes(batch.id);

    if (filterMode === 'ALERT_ALL') {
      if (!isAlert) return false;
    } else if (filterMode === 'EXPIRED') {
      if (!isExpired) return false;
    } else if (filterMode === 'NEAR_EXPIRY') {
      if (!isAlert || isExpired) return false;
    }

    const term = searchTerm.toLowerCase();
    return (
      (batch.trade_name && batch.trade_name.toLowerCase().includes(term)) ||
      (batch.generic_name && batch.generic_name.toLowerCase().includes(term)) ||
      (batch.batch_number && batch.batch_number.toLowerCase().includes(term)) ||
      (batch.category && batch.category.toLowerCase().includes(term)) ||
      (batch.supplier_name && batch.supplier_name.toLowerCase().includes(term))
    );
  });

  const handleOpenAddModal = () => {
    setEditingBatch(null);
    setFormData({
      medication_id: medications[0]?.id || '',
      supplier_id: suppliers[0]?.id || '',
      category: medications[0]?.category || 'مسكنات وآلام',
      batch_number: '',
      expiry_date: '',
      buy_price: '',
      sell_price: '',
      quantity: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (batch) => {
    setEditingBatch(batch);
    setFormData({
      medication_id: batch.medication_id,
      supplier_id: batch.supplier_id || suppliers[0]?.id || '',
      category: batch.category || 'مسكنات وآلام',
      batch_number: batch.batch_number || '',
      expiry_date: batch.expiry_date || '',
      buy_price: batch.buy_price || '',
      sell_price: batch.sell_price || '',
      quantity: batch.quantity || ''
    });
    setIsModalOpen(true);
  };

  const handleOpenModal = (batch = null) => {
    if (batch) {
      handleOpenEditModal(batch);
    } else {
      handleOpenAddModal();
    }
  };

  const [formData, setFormData] = useState({
    medication_id: medications[0]?.id || '',
    supplier_id: suppliers[0]?.id || '',
    category: medications[0]?.category || 'مسكنات وآلام',
    batch_number: '',
    expiry_date: '',
    buy_price: '',
    sell_price: '',
    quantity: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.medication_id || !(formData.category || '').trim() || !formData.expiry_date || !formData.sell_price || !formData.quantity) {
      alert('يرجى ملء جميع الحقول المطلوبة بشكل صحيح!');
      return;
    }

    const payload = {
      ...formData,
      batch_number: formData.batch_number || formData.category || `B-${Date.now().toString().substring(7)}`
    };

    try {
      if (editingBatch) {
        await onUpdateBatch(editingBatch.id, payload);
        alert('تم تحديث بيانات الدواء بنجاح في قاعدة البيانات!');
      } else {
        await onAddBatch(payload);
        alert('تمت إضافة الدواء الجديد وحفظه في قاعدة البيانات وتحديث المخزون بنجاح!');
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save batch:', err);
      alert('حدث خطأ أثناء حفظ الدواء في قاعدة البيانات: ' + (err.message || 'خطأ غير معروف'));
    }
  };

  return (
    <div>
      {/* Analytics Metrics Cards (Interactive Filter Grid) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        
        {/* Card 1: Total Expiring Alert */}
        <div 
          className={`glass-card stat-card-clickable ${filterMode === 'ALERT_ALL' ? 'active' : ''}`}
          onClick={() => setFilterMode(filterMode === 'ALERT_ALL' ? 'ALL' : 'ALERT_ALL')}
          style={{ 
            padding: '18px 20px', 
            borderRadius: '14px', 
            background: filterMode === 'ALERT_ALL' ? 'rgba(245, 158, 11, 0.22)' : 'rgba(245, 158, 11, 0.08)', 
            border: filterMode === 'ALERT_ALL' ? '2px solid #f59e0b' : '1px solid rgba(245, 158, 11, 0.3)',
            boxShadow: filterMode === 'ALERT_ALL' ? '0 0 20px rgba(245, 158, 11, 0.3)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>إجمالي الأدوية تحت التنبيه ({nearExpiryMonths} أشهر)</span>
            <div className="num" style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fbbf24', marginTop: '4px' }}>
              {expiringAlerts.length} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>وجبات</span>
            </div>
            {filterMode === 'ALERT_ALL' && (
              <span style={{ fontSize: '0.72rem', color: '#fbbf24', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                <Check size={12} /> الفلتر نشط (اضغط للإلغاء)
              </span>
            )}
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={22} />
          </div>
        </div>

        {/* Card 2: Expired Completely */}
        <div 
          className={`glass-card stat-card-clickable ${filterMode === 'EXPIRED' ? 'active' : ''}`}
          onClick={() => setFilterMode(filterMode === 'EXPIRED' ? 'ALL' : 'EXPIRED')}
          style={{ 
            padding: '18px 20px', 
            borderRadius: '14px', 
            background: filterMode === 'EXPIRED' ? 'rgba(244, 63, 94, 0.22)' : 'rgba(244, 63, 94, 0.08)', 
            border: filterMode === 'EXPIRED' ? '2px solid #f43f5e' : '1px solid rgba(244, 63, 94, 0.3)',
            boxShadow: filterMode === 'EXPIRED' ? '0 0 20px rgba(244, 63, 94, 0.3)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>أدوية منتهية الصلاحية</span>
            <div className="num" style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f87171', marginTop: '4px' }}>
              {expiredCount} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>وجبة</span>
            </div>
            {filterMode === 'EXPIRED' && (
              <span style={{ fontSize: '0.72rem', color: '#f87171', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                <Check size={12} /> الفلتر نشط (اضغط للإلغاء)
              </span>
            )}
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.2)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={22} />
          </div>
        </div>

        {/* Card 3: Near Expiry / Return Window */}
        <div 
          className={`glass-card stat-card-clickable ${filterMode === 'NEAR_EXPIRY' ? 'active' : ''}`}
          onClick={() => setFilterMode(filterMode === 'NEAR_EXPIRY' ? 'ALL' : 'NEAR_EXPIRY')}
          style={{ 
            padding: '18px 20px', 
            borderRadius: '14px', 
            background: filterMode === 'NEAR_EXPIRY' ? 'rgba(6, 182, 212, 0.22)' : 'rgba(6, 182, 212, 0.08)', 
            border: filterMode === 'NEAR_EXPIRY' ? '2px solid #06b6d4' : '1px solid rgba(6, 182, 212, 0.3)',
            boxShadow: filterMode === 'NEAR_EXPIRY' ? '0 0 20px rgba(6, 182, 212, 0.3)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>أدوية تنتهي قريباً ({returnWindowDays} يوم)</span>
            <div className="num" style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '4px' }}>
              {warningCount} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>وجبة</span>
            </div>
            {filterMode === 'NEAR_EXPIRY' && (
              <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                <Check size={12} /> الفلتر نشط (اضغط للإلغاء)
              </span>
            )}
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.2)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={22} />
          </div>
        </div>

        {/* Card 4: Financial Value (Non-interactive) */}
        <div 
          className="glass-card"
          style={{ 
            padding: '18px 20px', 
            borderRadius: '14px', 
            background: 'rgba(16, 185, 129, 0.08)', 
            border: '1px solid rgba(16, 185, 129, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>القيمة المالية المخزنية المعرضة</span>
            <div className="num" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '4px' }}>
              {formatCurrency(expiringStockValue)}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              إجمالي قيمة وجبات التنبيه
            </span>
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={22} />
          </div>
        </div>

      </div>

      {/* Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '300px' }}>
          <div style={{ position: 'relative', width: '360px' }}>
            <Search size={18} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="بحث باسم الدواء أو التصنيف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingRight: '42px', width: '100%' }}
            />
          </div>

          {filterMode !== 'ALL' && (
            <div 
              onClick={() => setFilterMode('ALL')}
              className="badge" 
              style={{ 
                cursor: 'pointer', 
                padding: '8px 14px', 
                fontSize: '0.82rem',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                color: '#fbbf24',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              title="إلغاء الفلتر وعرض جميع المواد"
            >
              <Filter size={14} />
              <span>
                تصفية: {
                  filterMode === 'ALERT_ALL' ? `كافة التنبيهات (${nearExpiryMonths} أشهر)` :
                  filterMode === 'EXPIRED' ? 'منتهية الصلاحية فقط' :
                  'تنتهي قريباً فقط'
                }
              </span>
              <X size={14} />
            </div>
          )}
        </div>

        <button className="btn btn-primary" onClick={() => handleOpenAddModal()}>
          <Plus size={18} /> إضـافة دواء جديد للمخزن
        </button>
      </div>

      {/* Batches Table Card */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>اسم الدواء</th>
                <th>التصنيف</th>
                <th>تاريخ الانتهاء</th>
                <th>سعر الشراء (د.ع)</th>
                <th>سعر البيع (د.ع)</th>
                <th>الكمية المتاحة</th>
                <th>حالة الصلاحية</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {displayBatches.map((b, index) => {
                const isAlert9M = expiringAlerts.some(a => a.id === b.id);
                const isExpired = b.is_expired || (new Date(b.expiry_date) < new Date());

                return (
                  <tr key={b.id} style={isAlert9M ? { background: 'rgba(245, 158, 11, 0.05)' } : {}}>
                    <td className="num">{index + 1}</td>
                    <td style={{ fontWeight: 700 }}>{b.trade_name}</td>
                    <td style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{b.category || 'عام'}</td>
                    <td className="num" style={{ fontWeight: 700, color: isAlert9M ? '#f59e0b' : 'var(--text-main)' }}>
                      {b.expiry_date}
                    </td>
                    {/* Financial Values explicitly formatted with 'د.ع' without parentheses */}
                    <td className="num" style={{ color: 'var(--text-muted)' }}>{formatCurrency(b.buy_price)}</td>
                    <td className="num" style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>{formatCurrency(b.sell_price)}</td>
                    <td className="num" style={{ fontWeight: 700 }}>{b.quantity} قطعة</td>
                    <td>
                      {isExpired ? (
                        <span className="badge badge-danger">منتهي الصلاحية</span>
                      ) : isAlert9M ? (
                        <span className="badge badge-alert">تنبيه 9 أشهر</span>
                      ) : (
                        <span className="badge badge-good">صالح ومضمون</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '6px', color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.4)' }} 
                          title="طباعة ملصق الباركود" 
                          onClick={() => handleOpenBarcodePrintModal(b)}
                        >
                          <Printer size={15} color="#fbbf24" />
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '6px' }} title="تعديل" onClick={() => handleOpenModal(b)}>
                          <Edit3 size={15} color="var(--accent-cyan)" />
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '6px' }} title="حذف" onClick={() => onDeleteBatch(b.id)}>
                          <Trash2 size={15} color="var(--accent-rose)" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {displayBatches.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                    لا توجد أدوية مسجلة تطابق فلتر العرض
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Batch Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Layers color="var(--accent-cyan)" size={22} />
                {editingBatch ? 'تعديل بيانات الدواء' : 'تسجيل دواء جديد بالمخزن'}
              </h3>
              <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">اختر المستحضر / الدواء</label>
                  <select
                    className="form-control"
                    required
                    value={formData.medication_id}
                    onChange={(e) => setFormData({ ...formData, medication_id: e.target.value })}
                  >
                    {medications.map(m => (
                      <option key={m.id} value={m.id}>{m.trade_name} ({m.generic_name})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">المورد التابع له الشحنة</label>
                  <select
                    className="form-control"
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                  >
                    <option value="">-- بدون مورد (غير محدد) --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.company_name || 'مذخر'})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">التصنيف (Category)</label>
                  <input
                    type="text"
                    list="batches-category-list"
                    className="form-control"
                    required
                    placeholder="اختر أو اكتب التصنيف..."
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                  <datalist id="batches-category-list">
                    {uniqueCategories.map((cat, idx) => (
                      <option key={idx} value={cat} />
                    ))}
                  </datalist>
                </div>

                <div className="form-group">
                  <label className="form-label">تاريخ انتهاء الصلاحية</label>
                  <input
                    type="date"
                    className="form-control num"
                    required
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">سعر الشراء (د.ع)</label>
                  <input
                    type="number"
                    className="form-control num"
                    required
                    step="250"
                    placeholder="5000"
                    value={formData.buy_price}
                    onChange={(e) => setFormData({ ...formData, buy_price: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">سعر البيع (د.ع)</label>
                  <input
                    type="number"
                    className="form-control num"
                    required
                    step="250"
                    placeholder="7500"
                    value={formData.sell_price}
                    onChange={(e) => setFormData({ ...formData, sell_price: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">الكمية المسجلة</label>
                  <input
                    type="number"
                    className="form-control num"
                    required
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary">
                  <Check size={18} /> {editingBatch ? 'تحديث الوجبة' : 'حفظ الوجبة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Barcode Modal */}
      {barcodePrintModal.isOpen && barcodePrintModal.batch && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleCloseBarcodePrintModal(); }}>
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Printer color="var(--accent-cyan)" size={20} />
                طباعة ملصق الباركود - ({barcodePrintModal.batch.trade_name})
              </h3>
              <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={handleCloseBarcodePrintModal}>
                <X size={18} />
              </button>
            </div>

            {/* Print Configuration Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '18px', padding: '14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              
              {/* Checkbox: Show Selling Price */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={barcodePrintModal.showPrice}
                  onChange={(e) => setBarcodePrintModal({ ...barcodePrintModal, showPrice: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                  إظهار سعر البيع على الملصق ({formatCurrency(barcodePrintModal.batch.sell_price)})
                </span>
              </label>

              {/* Number of Copies */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '10px' }}>
                <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>عدد النسخ المطلوب طباعتها:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className="form-control num"
                    value={barcodePrintModal.copies}
                    onChange={(e) => {
                      const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                      setBarcodePrintModal({ ...barcodePrintModal, copies: val });
                    }}
                    style={{ width: '80px', textAlign: 'center', padding: '6px 8px', fontWeight: 700 }}
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ملصق</span>
                </div>
              </div>
            </div>

            {/* Label Visual Live Preview (Screen View) */}
            <div style={{ marginBottom: '20px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                معاينة شكل الملصق الحراري (Live Sticker Preview):
              </span>

              <div style={{ display: 'flex', justifyContent: 'center', padding: '16px', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                {/* Single Sticker Card Preview */}
                <div
                  style={{
                    width: '240px',
                    padding: '10px 12px',
                    background: '#ffffff',
                    color: '#000000',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    fontFamily: 'system-ui, sans-serif'
                  }}
                >
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#444', marginBottom: '2px' }}>
                    صيدلية الرواد النموذجية
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#000', lineHeight: 1.25, maxHeight: '2.5em', overflow: 'hidden' }}>
                    {barcodePrintModal.batch.trade_name}
                  </div>
                  <div style={{ margin: '6px 0', width: '100%' }}>
                    <BarcodeSvg text={barcodePrintModal.batch.barcode || barcodePrintModal.batch.batch_number || '12345678'} height={40} />
                    <span className="num" style={{ fontSize: '0.82rem', fontWeight: 700, letterSpacing: '1px', color: '#000', display: 'block', marginTop: '2px' }}>
                      {barcodePrintModal.batch.barcode || barcodePrintModal.batch.batch_number}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.72rem', fontWeight: 700, borderTop: '1px dashed #bbb', paddingTop: '4px', marginTop: '2px' }}>
                    {barcodePrintModal.showPrice ? (
                      <span style={{ color: '#000', fontWeight: 800 }}>
                        {formatCurrency(barcodePrintModal.batch.sell_price)}
                      </span>
                    ) : (
                      <span style={{ color: '#666' }}>{barcodePrintModal.batch.category || 'عام'}</span>
                    )}
                    <span className="num" style={{ color: '#444' }}>
                      EXP: {barcodePrintModal.batch.expiry_date || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Print-only sheet container with exact 'copies' count rendered */}
            <div className="barcode-print-sheet" style={{ display: 'none' }}>
              {Array.from({ length: barcodePrintModal.copies || 1 }).map((_, idx) => (
                <div
                  key={idx}
                  className="barcode-label-item"
                  style={{
                    width: '210px',
                    padding: '8px 10px',
                    background: '#ffffff',
                    color: '#000000',
                    borderRadius: '4px',
                    border: '1px dashed #999',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    margin: '4px',
                    fontFamily: 'system-ui, sans-serif'
                  }}
                >
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#333' }}>صيدلية الرواد النموذجية</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#000', lineHeight: 1.2, margin: '2px 0' }}>{barcodePrintModal.batch.trade_name}</div>
                  <div style={{ width: '100%', margin: '4px 0' }}>
                    <BarcodeSvg text={barcodePrintModal.batch.barcode || barcodePrintModal.batch.batch_number || '12345678'} height={38} />
                    <span className="num" style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '1px', display: 'block', color: '#000' }}>
                      {barcodePrintModal.batch.barcode || barcodePrintModal.batch.batch_number}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.7rem', fontWeight: 700, borderTop: '1px dashed #aaa', paddingTop: '3px' }}>
                    {barcodePrintModal.showPrice ? (
                      <span style={{ color: '#000', fontWeight: 800 }}>{formatCurrency(barcodePrintModal.batch.sell_price)}</span>
                    ) : (
                      <span style={{ color: '#666' }}>{barcodePrintModal.batch.category || 'عام'}</span>
                    )}
                    <span className="num" style={{ color: '#444' }}>EXP: {barcodePrintModal.batch.expiry_date || 'N/A'}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleCloseBarcodePrintModal}>
                إلغاء
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                onClick={() => window.print()}
              >
                <Printer size={18} /> طباعة {barcodePrintModal.copies} {barcodePrintModal.copies > 1 ? 'نسخ' : 'نسخة'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
