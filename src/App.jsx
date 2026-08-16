import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Pill, 
  Layers, 
  ShoppingCart, 
  Truck,
  ShieldCheck, 
  AlertTriangle, 
  Lock, 
  RefreshCw, 
  Clock, 
  BarChart3, 
  FileText, 
  FileSpreadsheet, 
  Sliders,
  User,
  LogOut
} from 'lucide-react';

import Login from './components/Login';
import ActivationScreen from './components/ActivationScreen';
import Dashboard from './components/Dashboard';
import Medications from './components/Medications';
import Batches from './components/Batches';
import POS from './components/POS';
import Suppliers from './components/Suppliers';
import AccountsReports from './components/AccountsReports';
import SalesInvoices from './components/SalesInvoices';
import PurchaseInvoices from './components/PurchaseInvoices';
import License from './components/License';
import SystemSettings from './components/SystemSettings';
import { usePharmacyStore } from './context/PharmacyContext';

export default function App() {
  const {
    currentUser,
    logout,
    licenseStatus,
    checkLicense,
    medications,
    batches,
    expiringAlerts,
    sales,
    suppliers,
    purchaseInvoices,
    licenseInfo,
    systemSettings,
    loading,
    refetch,
    addMedication,
    updateMedication,
    deleteMedication,
    bulkImportMedications,
    addBatch,
    updateBatch,
    deleteBatch,
    createSale,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    addPurchaseInvoice,
    updateSystemSettings
  } = usePharmacyStore();

  const isAdmin = currentUser?.role === 'admin';
  const [activeTab, setActiveTab] = useState(isAdmin ? 'dashboard' : 'pos');

  // Role Protection: Guard against unauthorized tabs if logged in as Cashier
  useEffect(() => {
    if (currentUser) {
      if (!isAdmin && ['dashboard', 'accounts', 'suppliers', 'settings'].includes(activeTab)) {
        setActiveTab('pos');
      }
    }
  }, [currentUser, isAdmin, activeTab]);

  // 1. License Gate: Check if system license is activated
  if (licenseStatus && !licenseStatus.isActivated) {
    return <ActivationScreen onActivated={() => checkLicense()} />;
  }

  // 2. Auth Gate: If not authenticated, render Login Screen
  if (!currentUser) {
    return <Login />;
  }

  const handleDeleteMedicationConfirm = async (id) => {
    if (window.confirm('هل أنت تأكد من رغبتك في حذف هذا الدواء؟ سيتم حذف جميع الوجبات المرتبطة به.')) {
      await deleteMedication(id);
    }
  };

  const handleDeleteBatchConfirm = async (id) => {
    if (window.confirm('هل أنت تأكد من رغبتك في حذف هذه الوجبة؟')) {
      await deleteBatch(id);
    }
  };

  const handleDeleteSupplierConfirm = async (id) => {
    if (window.confirm('هل أنت تأكد من رغبتك في حذف هذا المورد؟ سيتم حذف كافة سجلات ديونه.')) {
      await deleteSupplier(id);
    }
  };

  return (
    <div className="app-container">
      {/* Top Horizontal Navigation Header */}
      <header className="app-top-nav-header">
        {/* Row 1: Brand & Top Utilities / Page Title / Status */}
        <div className="top-brand-bar">
          <div className="brand-header">
            <div className="brand-logo">
              <Pill size={22} color="#ffffff" />
            </div>
            <div>
              <h2 className="brand-title">PharmacyCare</h2>
              <span className="brand-subtitle">Pro v1.0 • SQLCipher</span>
            </div>
          </div>

          <div className="header-title-box">
            <h1>
              {activeTab === 'dashboard' && 'لوحة القيادة والإحصائيات'}
              {activeTab === 'medications' && 'إدارة وتصنيف دليل الأدوية'}
              {activeTab === 'batches' && 'الأدوية الموجودة بالصيدلية'}
              {activeTab === 'pos' && 'منصة البيع المباشر وإصدار الفواتير'}
              {activeTab === 'invoices' && 'سجل فواتير البيع الحقيقية والمعاينة'}
              {activeTab === 'purchaseInvoices' && 'فواتير الشراء وسجل إمدادات الموردين'}
              {activeTab === 'suppliers' && 'إدارة الموردين وسجل الديون والالتزامات'}
              {activeTab === 'accounts' && 'لوحة الحسابات والتقارير المالية المتقدمة'}
              {(activeTab === 'settings' || activeTab === 'license') && 'إعدادات النظام والشروط التشغيلية والتشفير'}
            </h1>
            <p>نظام إدارة الصيدلية الذكي • العملة المعتمدة: الدينار العراقي (د.ع)</p>
          </div>

          <div className="status-pills">
            {/* User Profile & Role Pill */}
            <div 
              className="status-pill"
              style={{
                background: isAdmin ? 'rgba(6, 182, 212, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                borderColor: isAdmin ? 'rgba(6, 182, 212, 0.35)' : 'rgba(16, 185, 129, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <User size={15} color={isAdmin ? 'var(--accent-cyan)' : '#34d399'} />
              <span style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.82rem' }}>{currentUser.name}</span>
              <span style={{ 
                fontSize: '0.72rem', 
                padding: '2px 8px', 
                borderRadius: '6px', 
                background: isAdmin ? 'rgba(6, 182, 212, 0.25)' : 'rgba(16, 185, 129, 0.25)',
                color: isAdmin ? 'var(--accent-cyan)' : '#34d399',
                fontWeight: 800
              }}>
                {isAdmin ? 'مدير النظام' : 'كاشير / صيدلي'}
              </span>
            </div>

            {expiringAlerts.length > 0 && (
              <div 
                className="status-pill" 
                onClick={() => setActiveTab('batches')}
                style={{ cursor: 'pointer', background: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.35)', color: '#fbbf24' }}
              >
                <AlertTriangle size={15} />
                <span className="num" style={{ fontWeight: 700 }}>{expiringAlerts.length} تنبيه صلاحية ({systemSettings?.near_expiry_months || 9} أشهر)</span>
              </div>
            )}

            <div className="status-pill">
              <span className="status-dot green"></span>
              <span style={{ fontSize: '0.78rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Lock size={12} /> قاعدة مشفرة
              </span>
            </div>

            <button 
              className="btn btn-secondary" 
              onClick={refetch} 
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              title="تحديث البيانات"
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>

            {/* Logout Button */}
            <button 
              className="btn btn-secondary" 
              onClick={() => {
                if (window.confirm('هل أنت متأكد من رغبتك في تسجيل الخروج من النظام؟')) {
                  logout();
                }
              }} 
              style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.3)' }}
              title="تسجيل الخروج"
            >
              <LogOut size={14} />
              <span>خروج</span>
            </button>
          </div>
        </div>

        {/* Row 2: Horizontal Navigation Menu Bar (Role-Filtered) */}
        <nav className="top-nav-menu">
          {isAdmin && (
            <div
              className={`top-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <LayoutDashboard size={18} />
              <span>لوحة التحكم</span>
            </div>
          )}

          <div
            className={`top-nav-item ${activeTab === 'pos' ? 'active' : ''}`}
            onClick={() => setActiveTab('pos')}
          >
            <ShoppingCart size={18} />
            <span>نقطة البيع (POS)</span>
          </div>

          <div
            className={`top-nav-item ${activeTab === 'medications' ? 'active' : ''}`}
            onClick={() => setActiveTab('medications')}
          >
            <Pill size={18} />
            <span>دليل الأدوية</span>
            <span className="nav-badge num" style={{ background: 'rgba(6, 182, 212, 0.2)', color: 'var(--accent-cyan)' }}>
              {medications.length}
            </span>
          </div>

          <div
            className={`top-nav-item ${activeTab === 'batches' ? 'active' : ''}`}
            onClick={() => setActiveTab('batches')}
          >
            <Layers size={18} />
            <span>الأدوية الموجودة بالصيدلية</span>
            {expiringAlerts.length > 0 && (
              <span className="nav-badge amber num">
                {expiringAlerts.length}
              </span>
            )}
          </div>

          <div
            className={`top-nav-item ${activeTab === 'invoices' ? 'active' : ''}`}
            onClick={() => setActiveTab('invoices')}
          >
            <FileText size={18} />
            <span>فواتير البيع</span>
            <span className="nav-badge num" style={{ background: 'rgba(6, 182, 212, 0.2)', color: 'var(--accent-cyan)' }}>
              {sales.length}
            </span>
          </div>

          <div
            className={`top-nav-item ${activeTab === 'purchaseInvoices' ? 'active' : ''}`}
            onClick={() => setActiveTab('purchaseInvoices')}
          >
            <FileSpreadsheet size={18} />
            <span>فواتير الشراء</span>
            <span className="nav-badge num" style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-emerald)' }}>
              {purchaseInvoices.length}
            </span>
          </div>

          {isAdmin && (
            <div
              className={`top-nav-item ${activeTab === 'suppliers' ? 'active' : ''}`}
              onClick={() => setActiveTab('suppliers')}
            >
              <Truck size={18} />
              <span>إدارة الموردين والديون</span>
              <span className="nav-badge num" style={{ background: 'rgba(244, 63, 94, 0.2)', color: '#f87171' }}>
                {suppliers.length}
              </span>
            </div>
          )}

          {isAdmin && (
            <div
              className={`top-nav-item ${activeTab === 'accounts' ? 'active' : ''}`}
              onClick={() => setActiveTab('accounts')}
            >
              <BarChart3 size={18} />
              <span>الحسابات والتقارير المالية</span>
            </div>
          )}

          {isAdmin && (
            <div
              className={`top-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <Sliders size={18} />
              <span>إعدادات النظام</span>
            </div>
          )}
        </nav>
      </header>

      {/* Main Full-Width App Content */}
      <main className="main-wrapper">
        {/* Page Content Router */}
        <section className="page-content">
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              جاري تحميل قاعدة البيانات المشفرة...
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && isAdmin && (
                <Dashboard
                  medications={medications}
                  batches={batches}
                  expiringAlerts={expiringAlerts}
                  sales={sales}
                  systemSettings={systemSettings}
                  onNavigate={(tab) => setActiveTab(tab)}
                />
              )}

              {activeTab === 'medications' && (
                <Medications
                  medications={medications}
                  onAdd={addMedication}
                  onUpdate={updateMedication}
                  onDelete={handleDeleteMedicationConfirm}
                  onBulkImport={bulkImportMedications}
                />
              )}

              {activeTab === 'batches' && (
                <Batches
                  batches={batches}
                  medications={medications}
                  suppliers={suppliers}
                  expiringAlerts={expiringAlerts}
                  systemSettings={systemSettings}
                  onAddBatch={addBatch}
                  onUpdateBatch={updateBatch}
                  onDeleteBatch={handleDeleteBatchConfirm}
                />
              )}

              {activeTab === 'pos' && (
                <POS
                  medications={medications}
                  batches={batches}
                  onCompleteSale={createSale}
                />
              )}

              {activeTab === 'invoices' && (
                <SalesInvoices
                  sales={sales}
                  onRefresh={refetch}
                />
              )}

              {activeTab === 'purchaseInvoices' && (
                <PurchaseInvoices
                  suppliers={suppliers}
                  medications={medications}
                  purchaseInvoices={purchaseInvoices}
                  onAddPurchaseInvoice={addPurchaseInvoice}
                />
              )}

              {activeTab === 'suppliers' && isAdmin && (
                <Suppliers
                  suppliers={suppliers}
                  onAddSupplier={addSupplier}
                  onUpdateSupplier={updateSupplier}
                  onDeleteSupplier={handleDeleteSupplierConfirm}
                  onRefresh={refetch}
                />
              )}

              {activeTab === 'accounts' && isAdmin && (
                <AccountsReports suppliers={suppliers} />
              )}

              {(activeTab === 'settings' || activeTab === 'license') && isAdmin && (
                <SystemSettings
                  systemSettings={systemSettings}
                  licenseInfo={licenseInfo}
                  onUpdateSettings={updateSystemSettings}
                  onRefreshLicense={refetch}
                />
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

