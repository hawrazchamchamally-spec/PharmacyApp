import React, { useState, useEffect } from 'react';
import { ShieldCheck, Key, Copy, Check, Lock, AlertCircle, Sparkles, Cpu, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export default function ActivationScreen({ onActivated }) {
  const [hardwareId, setHardwareId] = useState('');
  const [serialKey, setSerialKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingHw, setFetchingHw] = useState(true);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    async function loadHwId() {
      try {
        setFetchingHw(true);
        const res = await api.getHardwareId();
        const id = res?.hardwareId || res?.hardware_hash || res?.machineId || 'HWID-UNKNOWN';
        setHardwareId(id);
      } catch (err) {
        console.error('Failed to get hardware ID:', err);
        setHardwareId('HWID-ERROR-READING');
      } finally {
        setFetchingHw(false);
      }
    }
    loadHwId();
  }, []);

  const handleCopyHwId = () => {
    if (!hardwareId) return;
    navigator.clipboard.writeText(hardwareId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleActivate = async (e) => {
    e.preventDefault();
    const cleanKey = serialKey.trim();
    if (!cleanKey) {
      setErrorMessage('يرجى إدخال رمز التفعيل (Serial Key)!');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      setSuccessMessage('');

      const res = await api.activateLicenseKey(cleanKey);
      if (res && res.success && res.isActivated) {
        setSuccessMessage('✨ تم تفعيل رخصة البرنامج بنجاح! جاري فتح النظام...');
        setTimeout(() => {
          if (onActivated) onActivated(res);
        }, 1200);
      } else {
        setErrorMessage(res?.message || 'رمز التفعيل المدخل غير متطابق مع كود هذا الجهاز!');
      }
    } catch (err) {
      console.error('Activation error:', err);
      setErrorMessage(err.message || 'حدث خطأ أثناء الاتصال بالنظام للتحقق من الرخصة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: 'radial-gradient(ellipse at top, #0f172a 0%, #060911 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Ambient background glowing accents */}
      <div style={{
        position: 'absolute',
        top: '-100px',
        right: '-100px',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0) 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{
        position: 'absolute',
        bottom: '-100px',
        left: '-100px',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, rgba(6, 182, 212, 0) 70%)',
        pointerEvents: 'none'
      }} />

      {/* Main Activation Glass Card */}
      <div className="glass-card" style={{
        maxWidth: '520px',
        width: '100%',
        padding: '40px 36px',
        borderRadius: '24px',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        zIndex: 10
      }}>
        {/* Brand & Security Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, #fbbf24, #d97706)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 30px rgba(245, 158, 11, 0.4)',
            marginBottom: '16px',
            color: '#000000'
          }}>
            <Lock size={34} />
          </div>

          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px' }}>
            تفعيل رخصة <span style={{ color: '#fbbf24' }}>PharmacyCare Pro</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '6px', lineHeight: '1.6' }}>
            هذه النسخة مقفلة ومخصصة لجهاز الصيدلية. يرجى تزويد المزود بكود الجهاز التالي للحصول على رمز التفعيل:
          </p>
        </div>

        {/* Hardware ID Display Box */}
        <div style={{
          padding: '16px 18px',
          borderRadius: '14px',
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={15} color="#fbbf24" />
              كود الجهاز الفريد (Hardware ID):
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCopyHwId}
              style={{
                padding: '4px 12px',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: copied ? '#34d399' : '#fbbf24',
                borderColor: copied ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'تم النسخ!' : 'نسخ الكود'}</span>
            </button>
          </div>

          <div 
            className="num" 
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.04)',
              fontSize: '1.05rem',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '1px',
              textAlign: 'center',
              userSelect: 'all',
              direction: 'ltr'
            }}
          >
            {fetchingHw ? 'جاري قراءة معرف الجهاز...' : hardwareId}
          </div>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '10px',
            background: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.4)',
            color: '#fda4af',
            fontSize: '0.88rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <AlertCircle size={18} color="#f43f5e" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Alert Box */}
        {successMessage && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#34d399',
            fontSize: '0.88rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <CheckCircle2 size={18} color="#34d399" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Activation Key Form */}
        <form onSubmit={handleActivate} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem' }}>
              <Key size={15} color="#fbbf24" />
              رمز التفعيل (Serial Activation Key):
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="ألصق رمز التفعيل هنا..."
              required
              autoFocus
              value={serialKey}
              onChange={(e) => setSerialKey(e.target.value)}
              style={{
                padding: '14px',
                fontSize: '0.95rem',
                fontWeight: 600,
                textAlign: 'center',
                direction: 'ltr'
              }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || fetchingHw}
            style={{
              padding: '14px',
              fontSize: '1.05rem',
              fontWeight: 800,
              marginTop: '4px',
              background: 'linear-gradient(135deg, #fbbf24, #d97706)',
              color: '#000000',
              border: 'none',
              boxShadow: '0 4px 20px rgba(245, 158, 11, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            <ShieldCheck size={20} />
            {loading ? 'جاري التحقق من التفعيل...' : 'تفعيل النظام الآن'}
          </button>
        </form>

        {/* Offline Protection Badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <ShieldCheck size={14} color="var(--accent-emerald)" />
          <span>تفعيل أوفلاين فوري مشفر بدون الحاجة للاتصال بالإنترنت</span>
        </div>
      </div>
    </div>
  );
}
