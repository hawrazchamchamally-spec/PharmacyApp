import React from 'react';
import { Pill, AlertTriangle, TrendingUp, Calendar, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '../services/api';

export default function Dashboard({ medications, batches, expiringAlerts, sales, systemSettings, onNavigate }) {
  const totalMeds = medications.length;
  const expiringCount = expiringAlerts.length;
  const lowStockCount = medications.filter(m => (m.total_stock || 0) <= (m.min_stock || 10)).length;
  const nearExpiryMonths = systemSettings?.near_expiry_months || 9;

  const todaySalesTotal = sales.reduce((sum, s) => sum + (s.final_amount || 0), 0);

  return (
    <div>
      {/* Dynamic Expiry Alert Banner if items trigger criteria */}
      {expiringCount > 0 && (
        <div 
          onClick={() => onNavigate('batches')}
          className="glass-card" 
          style={{ 
            padding: '18px 24px', 
            marginBottom: '28px', 
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(239, 68, 68, 0.1))',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ 
              width: '42px', 
              height: '42px', 
              borderRadius: '10px', 
              background: 'rgba(245, 158, 11, 0.25)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#fbbf24'
            }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <h4 style={{ color: '#fbbf24', fontSize: '1.05rem', fontWeight: 700 }}>
                تنبيه انتهاء الصلاحية خلال {nearExpiryMonths} أشهر!
              </h4>
              <p style={{ color: '#fef08a', fontSize: '0.85rem', marginTop: '2px' }}>
                يوجد {expiringCount} وجبات داروية تنتهي صلاحيتها خلال الأشهر الـ ({nearExpiryMonths}) القادمة أو منتهية الصلاحية. اضغط للمعاينة.
              </p>
            </div>
          </div>
          <div className="btn btn-secondary" style={{ color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
            استعراض الوجبات <ArrowUpRight size={16} />
          </div>
        </div>
      )}

      {/* Grid Stats */}
      <div className="grid-stats">
        <div className="glass-card stat-card">
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>إجمالي الأدوية بالمخزن</span>
            <h2 className="num" style={{ fontSize: '2rem', fontWeight: 800, marginTop: '4px' }}>{totalMeds}</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>عنصر مسجل</span>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)' }}>
            <Pill size={26} />
          </div>
        </div>

        <div className="glass-card stat-card">
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>تنبيهات الانتهاء ({nearExpiryMonths} أشهر)</span>
            <h2 className="num" style={{ fontSize: '2rem', fontWeight: 800, marginTop: '4px', color: '#f59e0b' }}>
              {expiringCount}
            </h2>
            <span style={{ fontSize: '0.75rem', color: '#fbbf24' }}>تستوجب الإجراء</span>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <Calendar size={26} />
          </div>
        </div>

        <div className="glass-card stat-card">
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>الأدوية المنخفضة المخزون</span>
            <h2 className="num" style={{ fontSize: '2rem', fontWeight: 800, marginTop: '4px', color: '#f43f5e' }}>
              {lowStockCount}
            </h2>
            <span style={{ fontSize: '0.75rem', color: '#fda4af' }}>دون حد الأدنى</span>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' }}>
            <AlertTriangle size={26} />
          </div>
        </div>

        <div className="glass-card stat-card">
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>إجمالي المبيعات اليومية</span>
            <h2 className="num" style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '4px', color: 'var(--accent-emerald)' }}>
              {formatCurrency(todaySalesTotal)}
            </h2>
            <span style={{ fontSize: '0.75rem', color: '#6ee7b7' }}>مباشر من الـ POS</span>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)' }}>
            <TrendingUp size={26} />
          </div>
        </div>
      </div>

      {/* Expiring Items Preview */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar size={20} color="#f59e0b" />
            الوجبات القريبة من الانتهاء (حد {nearExpiryMonths} أشهر)
          </h3>
          <button className="btn btn-secondary" onClick={() => onNavigate('batches')} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
            عرض الكل
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>اسم الدواء</th>
                <th>رقم الوجبة (Batch)</th>
                <th>تاريخ الانتهاء</th>
                <th>الكمية M</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {expiringAlerts.slice(0, 5).map((b) => (
                <tr key={b.id}>
                  <td style={{ fontWeight: 600 }}>{b.trade_name}</td>
                  <td className="num">{b.batch_number}</td>
                  <td className="num" style={{ color: '#fbbf24', fontWeight: 600 }}>{b.expiry_date}</td>
                  <td className="num">{b.quantity}</td>
                  <td>
                    {b.is_expired ? (
                      <span className="badge badge-danger">منتهي الصلاحية</span>
                    ) : (
                      <span className="badge badge-alert">تنبيه {nearExpiryMonths} أشهر</span>
                    )}
                  </td>
                </tr>
              ))}
              {expiringAlerts.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                    لا توجد أدوية منتهية الصلاحية أو قريبة من الانتهاء ضمن مهلة {nearExpiryMonths} أشهر 🎉
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
