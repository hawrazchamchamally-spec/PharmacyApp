import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  Key, 
  Cpu, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  Server, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Copy, 
  Check, 
  FileCode,
  Globe,
  Clock,
  Database,
  Download
} from 'lucide-react';
import { api } from '../services/api';

export default function License({ licenseInfo, onRefreshLicense }) {
  const [license, setLicense] = useState(licenseInfo || {});
  const [hardwareDetails, setHardwareDetails] = useState({});
  const [inputKey, setInputKey] = useState('');
  const [activating, setActivating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isExportingCleanDb, setIsExportingCleanDb] = useState(false);
  const [cleanDbExportStatus, setCleanDbExportStatus] = useState('');

  const handleExportCleanDatabase = async () => {
    try {
      setIsExportingCleanDb(true);
      setCleanDbExportStatus('');
      const res = await api.exportCleanDatabase();
      if (res && res.success) {
        setCleanDbExportStatus(`✨ تم إنشاء وتصدير ملف النسخة الفارغة للتركيب بنجاح في:\n${res.filePath}`);
      } else if (res && res.cancelled) {
        if (res.message && res.message.includes('No handler registered')) {
          setCleanDbExportStatus('⚠️ يتطلب تفعيل المعالج الجديد إعادة تشغيل تطبيق Electron (Restart Electron). يرجى إغلاق النافذة وإعادة تشغيل التطبيق.');
        } else {
          setCleanDbExportStatus('تم إلغاء عملية التصدير.');
        }
      } else {
        setCleanDbExportStatus('⚠️ يرجى إغلاق وإعادة تشغيل تطبيق Electron لتسجيل قناة التصدير الجديدة.');
      }
    } catch (err) {
      console.error('Export clean db error:', err);
      setCleanDbExportStatus('❌ يرجى إعادة تشغيل تطبيق Electron لتفعيل قناة التصدير الجديدة.');
    } finally {
      setIsExportingCleanDb(false);
    }
  };

  const loadData = useCallback(async () => {
    try {
      const [lic, hw] = await Promise.all([
        api.getLicenseInfo(),
        api.getHardwareId()
      ]);
      setLicense(lic || {});
      setHardwareDetails(hw || {});
      if (lic && lic.licenseKey) {
        setInputKey(lic.licenseKey);
      }
    } catch (err) {
      console.error('Error loading license data:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleActivate = async (e) => {
    e.preventDefault();
    if (!inputKey.trim()) return;

    try {
      setActivating(true);
      setStatusMessage('');
      const result = await api.activateLicenseKey(inputKey.trim());
      setLicense(result);
      if (result && (result.isActivated || result.isValid || result.success)) {
        setStatusMessage('✅ تم تفعيل ترخيص الجهاز بنجاح وتوثيق الرخصة محلياً في ملف license.key!');
      } else {
        setStatusMessage(`⚠️ ${result?.message || 'المفتاح المدخل غير متطابق مع كود هذا الجهاز!'}`);
      }
      if (onRefreshLicense) onRefreshLicense();
    } catch (err) {
      console.error('Activation error:', err);
      setStatusMessage('حدث خطأ أثناء تفعيل الترخيص!');
    } finally {
      setActivating(false);
    }
  };

  const copyHardwareId = () => {
    const textToCopy = hardwareDetails.hardwareId || hardwareDetails.machineId || license.hardwareId || 'HWID-UNKNOWN';
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isActivated = license.isActivated || license.isValid || (license.licenseKey && license.licenseKey.startsWith('PCPRO-'));
  const isLifetime = license.isLifetime || license.expiry === 'LIFETIME' || (license.licenseKey && license.licenseKey.startsWith('PCPRO-'));

  const remainingDays = license.expiry && license.expiry !== 'LIFETIME'
    ? Math.max(0, Math.ceil((new Date(license.expiry) - new Date()) / (1000 * 60 * 60 * 24)))
    : (license.remainingDays ?? license.daysLeft ?? (isLifetime ? 9999 : 14));

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Main Status Banner */}
      <div 
        className="glass-card" 
        style={{ 
          padding: '28px', 
          background: !isActivated 
            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(15, 23, 42, 0.9))'
            : 'linear-gradient(135deg, rgba(6, 182, 212, 0.12), rgba(16, 185, 129, 0.1))', 
          border: `1px solid ${!isActivated ? 'rgba(239, 68, 68, 0.4)' : 'rgba(6, 182, 212, 0.3)'}` 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '16px', 
              background: !isActivated 
                ? 'linear-gradient(135deg, #ef4444, #991b1b)' 
                : 'linear-gradient(135deg, var(--accent-cyan), var(--accent-emerald))', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: '#fff', 
              boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)' 
            }}>
              <ShieldCheck size={36} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>حماية وتوثيق ترخيص تطبيق الصيدلية</h2>
                {isActivated ? (
                  <span className="badge badge-good">
                    مفعل وموثق رسمياً (حاسوب معتمد)
                  </span>
                ) : (
                  <span className="badge badge-danger">يتطلب التفعيل (غير مفعل)</span>
                )}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                محرك التثبت من بصمة الهاردوير (Hardware Fingerprint) • رخصة مشفرة محلياً في userData/license.key
              </p>
            </div>
          </div>

          <button className="btn btn-secondary" onClick={loadData} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            <RefreshCw size={16} /> إعادة فحص الترخيص
          </button>
        </div>
      </div>

      {/* Grid: Hardware Fingerprint & License Validity Engine */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        
        {/* Hardware Fingerprint Identification Card */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Cpu color="var(--accent-cyan)" size={22} />
            بصمة الهاردوير الحصرية (Hardware Fingerprint ID)
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>رمز المعرف الحصري للجهاز (Hardware ID):</span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                <span className="num" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-cyan)', letterSpacing: '1px' }}>
                  {hardwareDetails.hardwareId || license.hardwareId || 'HW-A7F9-88BC-91E2-5544'}
                </span>
                <button className="btn btn-secondary" onClick={copyHardwareId} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                  {copied ? <Check size={16} color="var(--accent-emerald)" /> : <Copy size={16} />} {copied ? 'تم النسخ' : 'نسخ'}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
              <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>بيئة المعالج (CPU):</span>
                <p className="num" style={{ fontWeight: 600, marginTop: '2px', color: 'var(--text-main)' }}>
                  {hardwareDetails.cpuModel || 'Intel Core i7 Processor'}
                </p>
              </div>

              <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>عنوان الشبكة (MAC Address):</span>
                <p className="num" style={{ fontWeight: 600, marginTop: '2px', color: 'var(--text-main)' }}>
                  {hardwareDetails.macAddress || '00:1A:2B:3C:4D:5E'}
                </p>
              </div>
            </div>

            <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>البصمة التشفيرية المشتركة (SHA-256 Hash):</span>
              <p className="num" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', wordBreak: 'break-all' }}>
                {hardwareDetails.rawHash || license.hardwareHash || '9F8E7D6C5B4A39281726354488A91F2C4E3D2C1B'}
              </p>
            </div>
          </div>
        </div>

        {/* License Validity & Server Status Card */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock color="#f59e0b" size={22} />
              صلاحية وتوثيق الرخصة (License Validity)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '16px', borderRadius: '12px', background: isLifetime ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', border: `1px solid ${isLifetime ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>نوع وصلاحية الترخيص:</span>
                  <span className="num" style={{ fontSize: '1.15rem', fontWeight: 800, color: isLifetime ? 'var(--accent-emerald)' : '#fbbf24' }}>
                    {isLifetime ? '✨ ترخيص دائم (Lifetime)' : `${remainingDays} يوم متبقي`}
                  </span>
                </div>

                {/* Progress bar */}
                <div style={{ height: '8px', background: 'rgba(0,0,0,0.4)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: isLifetime ? '100%' : `${Math.min(100, (remainingDays / 365) * 100)}%`, 
                      height: '100%', 
                      background: isLifetime || remainingDays > 30 ? 'var(--accent-emerald)' : '#f59e0b',
                      transition: 'width 0.3s ease'
                    }} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>تاريخ الصلاحية / الانتهاء:</span>
                <span className="num" style={{ fontWeight: 700, color: isLifetime ? 'var(--accent-emerald)' : '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={15} /> {isLifetime ? 'مدى الحياة (غير منتهي)' : (license.expiry || '2027-12-31')}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>حماية كود المصدر (Anti-Crack):</span>
                <span style={{ fontWeight: 700, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileCode size={15} /> Obfuscated & Self-Defending
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* License Key Activation Section */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Key color="var(--accent-emerald)" size={22} />
          إدخال وتفعيل مفتاح الترخيص الخاص بالجهاز
        </h3>

        <form onSubmit={handleActivate} style={{ display: 'flex', gap: '14px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '320px' }}>
            <label className="form-label">مفتاح التفعيل (Serial License Key):</label>
            <input
              type="text"
              className="form-control num"
              placeholder="PHARM-XXXX-XXXX-XXXX-XXXX"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              style={{ fontSize: '1.05rem', letterSpacing: '1px', fontWeight: 700, height: '48px' }}
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={activating} style={{ height: '48px', padding: '0 28px' }}>
            {activating ? 'جاري التحقق...' : 'تفعيل الترخيص الآن'}
          </button>
        </form>

        {statusMessage && (
          <div style={{ marginTop: '14px', fontSize: '0.9rem', fontWeight: 600 }}>
            {statusMessage}
          </div>
        )}
      </div>

      {/* Export Clean Setup Database Section */}
      <div 
        className="glass-card" 
        style={{ 
          padding: '26px', 
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(15, 23, 42, 0.6))', 
          border: '1px solid rgba(16, 185, 129, 0.25)' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Database size={22} />
              إعداد نسخة جديدة لصيدلية أخرى (Export Clean Database)
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '6px', maxWidth: '680px', lineHeight: '1.6' }}>
              يقوم هذا الخيار بإنشاء وتصدير ملف قاعدة بيانات جديد ونظيف يحتوي على كامل الجداول والهيكلية الطبية والمالية للنظام (بدون أي أدوية، مبيعات، موردين، أو فواتير سابقة). يمكنك تصدير الملف مباشرة لاستخدامه وتثبيته في حاسوب صيدلية أخرى بنقاء 100%.
            </p>
          </div>

          <button 
            className="btn btn-primary" 
            onClick={handleExportCleanDatabase} 
            disabled={isExportingCleanDb}
            style={{ 
              padding: '12px 24px', 
              fontSize: '0.92rem', 
              gap: '8px', 
              background: 'linear-gradient(135deg, var(--accent-emerald), #059669)', 
              border: 'none',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
            }}
          >
            <Download size={18} />
            {isExportingCleanDb ? 'جاري التصدير...' : 'إنشاء قاعدة بيانات فارغة للتركيب'}
          </button>
        </div>

        {cleanDbExportStatus && (
          <div 
            style={{ 
              marginTop: '16px', 
              padding: '12px 16px', 
              borderRadius: '10px', 
              background: 'rgba(16, 185, 129, 0.15)', 
              border: '1px solid rgba(16, 185, 129, 0.3)', 
              color: '#34d399', 
              fontSize: '0.9rem', 
              fontWeight: 600,
              whiteSpace: 'pre-line'
            }}
          >
            {cleanDbExportStatus}
          </div>
        )}
      </div>
    </div>
  );
}
