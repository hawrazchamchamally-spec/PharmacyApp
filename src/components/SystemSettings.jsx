import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  ShieldCheck, 
  Clock, 
  RotateCcw, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  Lock,
  Zap,
  Users
} from 'lucide-react';
import License from './License';
import UserManagement from './UserManagement';

export default function SystemSettings({ systemSettings, licenseInfo, onUpdateSettings, onRefreshLicense }) {
  const [activeSubTab, setActiveSubTab] = useState('general'); // 'general' or 'security'
  
  const [nearExpiryMonths, setNearExpiryMonths] = useState(
    systemSettings?.near_expiry_months ? String(systemSettings.near_expiry_months) : '9'
  );
  const [returnWindowDays, setReturnWindowDays] = useState(
    systemSettings?.return_window_days ? String(systemSettings.return_window_days) : '90'
  );

  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (systemSettings) {
      setNearExpiryMonths(String(systemSettings.near_expiry_months || '9'));
      setReturnWindowDays(String(systemSettings.return_window_days || '90'));
    }
  }, [systemSettings]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleSaveGeneralSettings = async (e) => {
    e.preventDefault();
    const months = parseInt(nearExpiryMonths, 10);
    const days = parseInt(returnWindowDays, 10);

    if (isNaN(months) || months < 1 || months > 36) {
      alert('يرجى إدخال عدد أشهر صحيح بين 1 و 36 شهراً!');
      return;
    }

    if (isNaN(days) || days < 1 || days > 365) {
      alert('يرجى إدخال عدد أيام صحيح بين 1 و 365 يوماً!');
      return;
    }

    try {
      setSaving(true);
      await onUpdateSettings({
        near_expiry_months: months,
        return_window_days: days
      });
      showToast('✅ تم حفظ إعدادات النظام بنجاح وتحديث معايير الصلاحية والتنبيهات!');
    } catch (err) {
      console.error('Error saving system settings:', err);
      alert('حدث خطأ أثناء حفظ الإعدادات!');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '1050px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div 
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, var(--accent-emerald), #059669)',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '30px',
            fontWeight: 700,
            fontSize: '0.92rem',
            zIndex: 1000,
            boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <Zap size={18} /> {toastMessage}
        </div>
      )}

      {/* Main Top Header & Tab Navigation */}
      <div className="glass-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sliders color="var(--accent-cyan)" size={24} />
              إعدادات النظام والشروط التشغيلية (System Settings)
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '4px' }}>
              تحديد ومدد تنبيهات انتهاء الصلاحية وإرجاع الأدوية، وحماية وتشفير قاعدة البيانات
            </p>
          </div>
        </div>

        {/* System Settings Sub-Tabs Header */}
        <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          <button
            onClick={() => setActiveSubTab('general')}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              background: activeSubTab === 'general' 
                ? 'linear-gradient(135deg, var(--accent-cyan), #0284c7)' 
                : 'rgba(255, 255, 255, 0.05)',
              color: activeSubTab === 'general' ? '#ffffff' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              boxShadow: activeSubTab === 'general' ? '0 4px 15px rgba(6, 182, 212, 0.3)' : 'none'
            }}
          >
            <Sliders size={18} />
            إعدادات عامة (General Settings)
          </button>

          <button
            onClick={() => setActiveSubTab('security')}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              background: activeSubTab === 'security' 
                ? 'linear-gradient(135deg, var(--accent-cyan), #0284c7)' 
                : 'rgba(255, 255, 255, 0.05)',
              color: activeSubTab === 'security' ? '#ffffff' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              boxShadow: activeSubTab === 'security' ? '0 4px 15px rgba(6, 182, 212, 0.3)' : 'none'
            }}
          >
            <ShieldCheck size={18} />
            حماية وتشفير النظام (Security & Encryption)
          </button>

          <button
            onClick={() => setActiveSubTab('users')}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              background: activeSubTab === 'users' 
                ? 'linear-gradient(135deg, var(--accent-cyan), #0284c7)' 
                : 'rgba(255, 255, 255, 0.05)',
              color: activeSubTab === 'users' ? '#ffffff' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              boxShadow: activeSubTab === 'users' ? '0 4px 15px rgba(6, 182, 212, 0.3)' : 'none'
            }}
          >
            <Users size={18} />
            إدارة المستخدمين والصلاحيات (Users & Roles)
          </button>
        </div>
      </div>

      {/* Tab 1: General Settings */}
      {activeSubTab === 'general' && (
        <div className="glass-card" style={{ padding: '28px' }}>
          <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock color="var(--accent-amber)" size={22} />
              معايير ومدد الصلاحية وإرجاع الأدوية
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
              تحكّم في الضوابط والمدد الزمنية التي يتم على أساسها إطلاق التنبيهات في المخزن وفواتير الشراء
            </p>
          </div>

          <form onSubmit={handleSaveGeneralSettings} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            
            {/* Setting Item 1: Near Expiry Period */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <label className="form-label" style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={18} color="var(--accent-amber)" />
                    أ. مدة التنبيه بالأدوية قريبة النفاذ (Near Expiry Period):
                  </label>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '6px', lineHeight: '1.5' }}>
                    تحديد المدة الزمانية بالأشهر التي يعتبر فيها الدواء قريب من انتهاء الصلاحية ويظهر في تنبيهات المخزن.
                  </p>
                </div>

                <div style={{ width: '180px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      className="form-control num"
                      min="1"
                      max="36"
                      required
                      value={nearExpiryMonths}
                      onChange={(e) => setNearExpiryMonths(e.target.value)}
                      style={{ fontSize: '1.1rem', fontWeight: 800, textAlign: 'center', height: '46px', borderColor: 'rgba(245, 158, 11, 0.4)' }}
                    />
                    <span style={{ fontWeight: 700, color: 'var(--accent-amber)', whiteSpace: 'nowrap' }}>أشهر</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Setting Item 2: Supplier Return Period */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <label className="form-label" style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <RotateCcw size={18} color="var(--accent-cyan)" />
                    ب. مدة إرجاع الأدوية للشركات/المذاخر (Supplier Return Period):
                  </label>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '6px', lineHeight: '1.5' }}>
                    تحديد المدة المسموح بها بالأيام لإرجاع المواد للمورد أو الشركة قبل انتهاء صلاحيتها.
                  </p>
                </div>

                <div style={{ width: '180px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      className="form-control num"
                      min="1"
                      max="365"
                      required
                      value={returnWindowDays}
                      onChange={(e) => setReturnWindowDays(e.target.value)}
                      style={{ fontSize: '1.1rem', fontWeight: 800, textAlign: 'center', height: '46px', borderColor: 'rgba(6, 182, 212, 0.4)' }}
                    />
                    <span style={{ fontWeight: 700, color: 'var(--accent-cyan)', whiteSpace: 'nowrap' }}>يوم</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit / Save Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
                style={{
                  padding: '12px 32px',
                  fontSize: '1rem',
                  fontWeight: 800,
                  gap: '10px',
                  background: 'linear-gradient(135deg, var(--accent-emerald), #059669)',
                  boxShadow: '0 4px 20px rgba(16, 185, 129, 0.35)'
                }}
              >
                <Save size={18} />
                {saving ? 'جاري الحفظ...' : 'حفظ إعدادات النظام'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Security & Encryption */}
      {activeSubTab === 'security' && (
        <License 
          licenseInfo={licenseInfo} 
          onRefreshLicense={onRefreshLicense} 
        />
      )}

      {/* Tab 3: User & Roles Management */}
      {activeSubTab === 'users' && (
        <UserManagement />
      )}

    </div>
  );
}
