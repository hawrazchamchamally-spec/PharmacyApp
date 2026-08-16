import React, { useState } from 'react';
import { Pill, Lock, User, Eye, EyeOff, LogIn, AlertCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { usePharmacyStore } from '../context/PharmacyContext';

export default function Login() {
  const { login } = usePharmacyStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      const res = await login(username.trim(), password.trim());
      if (!res.success) {
        setErrorMessage(res.message || 'بيانات الدخول غير صحيحة، يرجى المحاولة ثانية');
      }
    } catch (err) {
      console.error('Login submission error:', err);
      setErrorMessage(err.message || 'حدث خطأ أثناء الاتصال بقاعدة البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFillAdmin = () => {
    setUsername('admin');
    setPassword('admin123');
    setErrorMessage('');
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
      {/* Subtle Background Glows */}
      <div style={{
        position: 'absolute',
        top: '-150px',
        right: '-150px',
        width: '450px',
        height: '450px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, rgba(6, 182, 212, 0) 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{
        position: 'absolute',
        bottom: '-150px',
        left: '-150px',
        width: '450px',
        height: '450px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0) 70%)',
        pointerEvents: 'none'
      }} />

      {/* Main Glassmorphic Login Card */}
      <div className="glass-card" style={{
        maxWidth: '440px',
        width: '100%',
        padding: '36px 32px',
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        zIndex: 10
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-emerald))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 25px rgba(6, 182, 212, 0.4)',
            marginBottom: '16px'
          }}>
            <Pill size={32} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px' }}>
            PharmacyCare <span style={{ color: 'var(--accent-cyan)' }}>Pro</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '4px' }}>
            نظام إدارة الصيدلية الذكي • تسجيل الدخول
          </p>
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

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem' }}>
              <User size={15} color="var(--accent-cyan)" />
              اسم المستخدم (Username)
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="أدخل اسم المستخدم..."
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ padding: '12px 14px', fontSize: '0.95rem' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem' }}>
              <Lock size={15} color="var(--accent-cyan)" />
              كلمة المرور (Password)
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control num"
                placeholder="أدخل كلمة المرور..."
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ padding: '12px 42px 12px 14px', fontSize: '0.95rem', width: '100%' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              padding: '14px',
              fontSize: '1.02rem',
              fontWeight: 800,
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            <LogIn size={20} />
            {loading ? 'جاري التحقق...' : 'تسجيل الدخول للنظام'}
          </button>
        </form>

        {/* First Time Quick Setup Helper */}
        <div style={{
          padding: '12px 14px',
          borderRadius: '10px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          fontSize: '0.78rem',
          color: 'var(--text-muted)'
        }}>
          <div>
            <span style={{ fontWeight: 700, color: '#ffffff', display: 'block' }}>الحساب الافتراضي الرئيسي:</span>
            <span>المستخدم: <strong style={{ color: 'var(--accent-cyan)' }}>admin</strong> | كلمة المرور: <strong style={{ color: 'var(--accent-cyan)' }}>admin123</strong></span>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleQuickFillAdmin}
            style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}
          >
            تعبئة سريعة
          </button>
        </div>

        {/* Security / Offline notice */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <ShieldCheck size={14} color="var(--accent-emerald)" />
          <span>نظام مشفر ومحمي بقاعدة بيانات SQLCipher المحلية</span>
        </div>
      </div>
    </div>
  );
}
