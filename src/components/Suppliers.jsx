import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  Check, 
  CreditCard, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Building, 
  Phone, 
  FileText, 
  History, 
  DollarSign,
  Calendar,
  CheckSquare,
  Square,
  Package,
  AlertTriangle,
  Layers,
  Filter,
  FileCheck,
  CheckCircle
} from 'lucide-react';

import { formatCurrency, api } from '../services/api';

export default function Suppliers({ suppliers, onAddSupplier, onUpdateSupplier, onDeleteSupplier, onRefresh }) {
  // Main Tab State: 'DIRECTORY' | 'PAYMENTS'
  const [activeTab, setActiveTab] = useState('DIRECTORY');

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  // Supplier Details & Ledger Modal State
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [ledgerTransactions, setLedgerTransactions] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [transactionType, setTransactionType] = useState('PAYMENT'); // 'PAYMENT' or 'CREDIT_PURCHASE'

  // Tab 2 Unpaid Credit Invoices State
  const [unpaidInvoices, setUnpaidInvoices] = useState([]);
  const [loadingUnpaid, setLoadingUnpaid] = useState(false);
  const [paymentSearchTerm, setPaymentSearchTerm] = useState('');
  const [paymentSupplierFilter, setPaymentSupplierFilter] = useState('ALL');
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);

  // Payment Modals State
  const [singlePaymentInvoice, setSinglePaymentInvoice] = useState(null);
  const [isBulkPaymentModalOpen, setIsBulkPaymentModalOpen] = useState(false);
  const [paymentDiscount, setPaymentDiscount] = useState('');
  const [bulkDiscount, setBulkDiscount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // New Supplier Form State
  const [supplierFormData, setSupplierFormData] = useState({
    name: '',
    phone: '',
    company_name: '',
    notes: ''
  });

  // Transaction Form State
  const [txFormData, setTxFormData] = useState({
    amount: '',
    invoice_number: '',
    notes: ''
  });

  // Load unpaid invoices when switching to PAYMENTS tab
  const fetchUnpaidInvoices = async () => {
    setLoadingUnpaid(true);
    try {
      const data = await api.getUnpaidPurchaseInvoices();
      setUnpaidInvoices(data || []);
    } catch (err) {
      console.error('Failed to load unpaid purchase invoices:', err);
    } finally {
      setLoadingUnpaid(false);
    }
  };

  useEffect(() => {
    fetchUnpaidInvoices();
  }, []);

  useEffect(() => {
    if (activeTab === 'PAYMENTS') {
      fetchUnpaidInvoices();
    }
  }, [activeTab]);

  // Filter suppliers for Directory Tab
  const filteredSuppliers = suppliers.filter(s => {
    const term = searchTerm.toLowerCase().trim();
    return (
      s.name.toLowerCase().includes(term) ||
      (s.company_name && s.company_name.toLowerCase().includes(term)) ||
      (s.phone && s.phone.includes(term))
    );
  });

  // Filter unpaid credit invoices for Tab 2
  const filteredUnpaidInvoices = unpaidInvoices.filter(inv => {
    const matchesSearch = !paymentSearchTerm || inv.invoice_number.toLowerCase().includes(paymentSearchTerm.toLowerCase().trim());
    const matchesSupplier = paymentSupplierFilter === 'ALL' || String(inv.supplier_id) === String(paymentSupplierFilter);
    return matchesSearch && matchesSupplier;
  });

  // Calculate total outstanding debts across all suppliers
  const grandTotalDebt = suppliers.reduce((sum, s) => sum + (s.total_debt || 0), 0);

  // Tab 2 KPI Stats
  const totalUnpaidAmount = filteredUnpaidInvoices.reduce((sum, inv) => sum + (inv.final_total_iqd || 0), 0);
  const selectedInvoicesList = unpaidInvoices.filter(inv => selectedInvoiceIds.includes(inv.id));
  const selectedInvoicesSum = selectedInvoicesList.reduce((sum, inv) => sum + (inv.final_total_iqd || 0), 0);

  // Checkbox Selection Helpers
  const isAllSelected = filteredUnpaidInvoices.length > 0 && filteredUnpaidInvoices.every(inv => selectedInvoiceIds.includes(inv.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedInvoiceIds([]);
    } else {
      setSelectedInvoiceIds(filteredUnpaidInvoices.map(inv => inv.id));
    }
  };

  const toggleSelectInvoice = (id) => {
    if (selectedInvoiceIds.includes(id)) {
      setSelectedInvoiceIds(selectedInvoiceIds.filter(i => i !== id));
    } else {
      setSelectedInvoiceIds([...selectedInvoiceIds, id]);
    }
  };

  // Open Ledger Modal
  const handleOpenLedger = async (supplier) => {
    setSelectedSupplier(supplier);
    setIsTransactionFormOpen(false);
    setLoadingLedger(true);
    try {
      const txs = await api.getSupplierTransactions(supplier.id);
      setLedgerTransactions(txs || []);
    } catch (err) {
      console.error('Failed to load supplier transactions:', err);
    } finally {
      setLoadingLedger(false);
    }
  };

  const handleOpenAddModal = (supplier = null) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setSupplierFormData({
        name: supplier.name,
        phone: supplier.phone || '',
        company_name: supplier.company_name || '',
        notes: supplier.notes || ''
      });
    } else {
      setEditingSupplier(null);
      setSupplierFormData({
        name: '',
        phone: '',
        company_name: '',
        notes: ''
      });
    }
    setIsAddModalOpen(true);
  };

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    if (!supplierFormData.name) {
      alert('يرجى إدخال اسم المورد الرئيسي!');
      return;
    }

    try {
      if (editingSupplier) {
        await onUpdateSupplier(editingSupplier.id, supplierFormData);
        alert('تم تحديث بيانات المورد بنجاح في قاعدة البيانات!');
      } else {
        await onAddSupplier(supplierFormData);
        alert('تمت إضافة المورد الجديد وحفظه في قاعدة البيانات بنجاح!');
      }
      setIsAddModalOpen(false);
    } catch (err) {
      console.error('Failed to save supplier:', err);
      alert('حدث خطأ أثناء حفظ المورد في قاعدة البيانات: ' + (err.message || 'خطأ غير معروف'));
    }
  };

  const handleOpenTxForm = (type) => {
    setTransactionType(type);
    setTxFormData({
      amount: '',
      invoice_number: type === 'CREDIT_PURCHASE' ? `REC-${Date.now().toString().substring(7)}` : `PAY-${Date.now().toString().substring(7)}`,
      notes: type === 'PAYMENT' ? 'تسديد دفعة نقداً لحساب المورد' : 'استلام وجبة مستلزمات بدين'
    });
    setIsTransactionFormOpen(true);
  };

  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    if (!selectedSupplier || !txFormData.amount) return;

    try {
      await api.addSupplierTransaction({
        supplier_id: selectedSupplier.id,
        type: transactionType,
        amount: parseFloat(txFormData.amount),
        invoice_number: txFormData.invoice_number,
        notes: txFormData.notes
      });

      const updatedTxs = await api.getSupplierTransactions(selectedSupplier.id);
      setLedgerTransactions(updatedTxs);

      if (onRefresh) onRefresh();
      setIsTransactionFormOpen(false);
    } catch (err) {
      console.error('Failed to add transaction:', err);
      alert('حدث خطأ أثناء تسجيل العملية!');
    }
  };

  // Single Invoice Payment Modal Handlers
  const handleOpenSinglePaymentModal = (inv) => {
    setSinglePaymentInvoice(inv);
    setPaymentDiscount('');
    setPaymentNotes('');
  };

  const handleConfirmSinglePayment = async (e) => {
    e.preventDefault();
    if (!singlePaymentInvoice) return;

    const disc = parseFloat(paymentDiscount || 0);
    try {
      const res = await api.payPurchaseInvoices({
        invoice_ids: [singlePaymentInvoice.id],
        discount: disc,
        notes: paymentNotes
      });

      if (res && res.success) {
        setSinglePaymentInvoice(null);
        fetchUnpaidInvoices();
        if (onRefresh) onRefresh();
        alert('تم تسديد الفاتورة بنجاح وتحديث كشف حساب المورد وصندوق الصيدلية!');
      } else {
        alert(`فشل التسديد: ${res?.error || 'حدث خطأ غير متوقع'}`);
      }
    } catch (err) {
      console.error('Payment error:', err);
      alert('حدث خطأ أثناء إجراء عملية التسديد!');
    }
  };

  // Bulk Invoice Payment Modal Handlers
  const handleOpenBulkPaymentModal = () => {
    if (selectedInvoiceIds.length === 0) return;
    setBulkDiscount('');
    setPaymentNotes('');
    setIsBulkPaymentModalOpen(true);
  };

  const handleConfirmBulkPayment = async (e) => {
    e.preventDefault();
    if (selectedInvoiceIds.length === 0) return;

    const disc = parseFloat(bulkDiscount || 0);
    try {
      const res = await api.payPurchaseInvoices({
        invoice_ids: selectedInvoiceIds,
        discount: disc,
        notes: paymentNotes
      });

      if (res && res.success) {
        setIsBulkPaymentModalOpen(false);
        setSelectedInvoiceIds([]);
        fetchUnpaidInvoices();
        if (onRefresh) onRefresh();
        alert(`تم تسديد مجموعة الفواتير المحدد عددها (${selectedInvoiceIds.length}) بنجاح!`);
      } else {
        alert(`فشل التسديد الجملي: ${res?.error || 'حدث خطأ غير متوقع'}`);
      }
    } catch (err) {
      console.error('Bulk payment error:', err);
      alert('حدث خطأ أثناء إجراء عملية التسديد الجملي!');
    }
  };

  // Aggregate all unsold items across selected invoices for bulk modal
  const combinedUnsoldItems = selectedInvoicesList.reduce((acc, inv) => {
    if (inv.unsold_items && inv.unsold_items.length > 0) {
      inv.unsold_items.forEach(item => {
        const itemCost = item.total_cost || (item.remaining_qty * (item.buy_price || 0));
        const existing = acc.find(x => x.trade_name === item.trade_name);
        if (existing) {
          existing.remaining_qty += item.remaining_qty;
          existing.total_cost = (existing.total_cost || 0) + itemCost;
        } else {
          acc.push({ 
            ...item,
            total_cost: itemCost
          });
        }
      });
    }
    return acc;
  }, []);

  const combinedUnsoldTotalCost = combinedUnsoldItems.reduce((sum, item) => sum + (item.total_cost || 0), 0);


  return (
    <div>
      {/* Navigation Tabs Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <button
          className={`btn ${activeTab === 'DIRECTORY' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('DIRECTORY')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 22px', borderRadius: '12px', fontWeight: 700 }}
        >
          <Building size={18} />
          <span>دليل وحسابات الموردين</span>
        </button>

        <button
          className={`btn ${activeTab === 'PAYMENTS' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('PAYMENTS')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 22px',
            borderRadius: '12px',
            fontWeight: 700,
            background: activeTab === 'PAYMENTS' ? 'linear-gradient(135deg, var(--accent-emerald), #059669)' : undefined,
            color: activeTab === 'PAYMENTS' ? '#ffffff' : undefined
          }}
        >
          <CreditCard size={18} />
          <span>تسديد فواتير الموردين (آجل)</span>
          {unpaidInvoices.length > 0 && (
            <span className="badge num" style={{ background: 'rgba(255,255,255,0.25)', color: '#ffffff', marginRight: '6px', padding: '2px 8px' }}>
              {unpaidInvoices.length}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SUPPLIERS DIRECTORY & LEDGERS                                      */}
      {/* ========================================================================= */}
      {activeTab === 'DIRECTORY' && (
        <div>
          {/* Top Total Debts Summary Card */}
          <div className="glass-card" style={{ padding: '24px', marginBottom: '28px', background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.12), rgba(15, 23, 42, 0.9))', border: '1px solid rgba(244, 63, 94, 0.35)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(244, 63, 94, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171' }}>
                  <TrendingDown size={30} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>إجمالي الديون والالتزامات للموردين</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    متابعة الحسابات الآجلة والدفعات المستحقة لشركات ومذاخر الأدوية
                  </p>
                </div>
              </div>

              <div style={{ padding: '12px 24px', borderRadius: '14px', background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(244, 63, 94, 0.3)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>إجمالي رصيد الديون الكلي:</span>
                <div className="num" style={{ fontSize: '1.7rem', fontWeight: 800, color: '#f87171', marginTop: '2px' }}>
                  {formatCurrency(grandTotalDebt)}
                </div>
              </div>
            </div>
          </div>

          {/* Main Bar: Search & Add Supplier Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ position: 'relative', width: '380px' }}>
              <Search size={18} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                placeholder="ابحث باسم المورد، اسم الشركة، أو رقم الهاتف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingRight: '42px', width: '100%' }}
              />
            </div>

            <button className="btn btn-primary" onClick={() => handleOpenAddModal()}>
              <Plus size={18} /> إضـافة مـورد جـديد
            </button>
          </div>

          {/* Main Suppliers Table Card */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>اسم المورد</th>
                    <th>اسم الشركة / المذخر</th>
                    <th>رقم الهاتف</th>
                    <th>رصيد الدين الحالي (د.ع)</th>
                    <th>الملاحظات</th>
                    <th>الإجراءات كشف الحساب</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map((supplier, idx) => {
                    const debt = supplier.total_debt || 0;
                    return (
                      <tr key={supplier.id}>
                        <td className="num">{idx + 1}</td>
                        <td style={{ fontWeight: 700, color: '#ffffff' }}>{supplier.name}</td>
                        <td>
                          {supplier.company_name ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <Building size={14} color="var(--accent-cyan)" />
                              {supplier.company_name}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="num">{supplier.phone || '—'}</td>
                        <td className="num" style={{ fontWeight: 800, color: debt > 0 ? '#f87171' : 'var(--accent-emerald)' }}>
                          {formatCurrency(debt)}
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{supplier.notes || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--accent-cyan)', borderColor: 'rgba(6, 182, 212, 0.4)' }}
                              onClick={() => handleOpenLedger(supplier)}
                            >
                              <History size={14} /> كشف الحساب
                            </button>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '6px' }}
                              onClick={() => handleOpenAddModal(supplier)}
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '6px', color: 'var(--accent-rose)' }}
                              onClick={() => onDeleteSupplier(supplier.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSuppliers.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        لا يوجد موردين مضافين مطابقين لشروط البحث
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: UNPAID CREDIT INVOICES SETTLEMENT                                  */}
      {/* ========================================================================= */}
      {activeTab === 'PAYMENTS' && (
        <div>
          {/* Top Stats KPI Grid */}
          <div className="grid-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            <div className="glass-card stat-card" style={{ border: '1px solid rgba(244, 63, 94, 0.35)' }}>
              <div>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>إجمالي الفواتير الآجلة غير المسددة</span>
                <div className="num" style={{ fontSize: '1.45rem', fontWeight: 800, color: '#f87171', marginTop: '4px' }}>
                  {formatCurrency(totalUnpaidAmount)}
                </div>
              </div>
              <div className="stat-icon" style={{ background: 'rgba(244, 63, 94, 0.2)', color: '#f87171' }}>
                <TrendingDown size={24} />
              </div>
            </div>

            <div className="glass-card stat-card">
              <div>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>عدد الفواتير المستحقة</span>
                <div className="num" style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '4px' }}>
                  {filteredUnpaidInvoices.length} فاتورة
                </div>
              </div>
              <div className="stat-icon" style={{ background: 'rgba(6, 182, 212, 0.2)', color: 'var(--accent-cyan)' }}>
                <FileText size={24} />
              </div>
            </div>

            <div className="glass-card stat-card" style={{ border: selectedInvoiceIds.length > 0 ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid var(--border-color)' }}>
              <div>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>المبلغ الكلي للفواتير المحددة</span>
                <div className="num" style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '4px' }}>
                  {formatCurrency(selectedInvoicesSum)}
                </div>
              </div>
              <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-emerald)' }}>
                <CheckSquare size={24} />
              </div>
            </div>
          </div>

          {/* Search & Filter Bar for Unpaid Invoices */}
          <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', flex: 1 }}>
                
                {/* Search by Invoice Number */}
                <div style={{ position: 'relative', width: '280px' }}>
                  <Search size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ابحث برقم الفاتورة الآجلة..."
                    value={paymentSearchTerm}
                    onChange={(e) => setPaymentSearchTerm(e.target.value)}
                    style={{ paddingRight: '36px', fontSize: '0.86rem' }}
                  />
                </div>

                {/* Dropdown Supplier Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Filter size={16} color="var(--text-muted)" />
                  <select
                    className="form-control"
                    style={{ width: '220px', fontSize: '0.86rem' }}
                    value={paymentSupplierFilter}
                    onChange={(e) => setPaymentSupplierFilter(e.target.value)}
                  >
                    <option value="ALL">جميع الموردين / المذاخر</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.company_name || 'مورد'})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Top Bulk Action Button */}
              <button
                className="btn btn-success"
                style={{ opacity: selectedInvoiceIds.length > 0 ? 1 : 0.5, cursor: selectedInvoiceIds.length > 0 ? 'pointer' : 'not-allowed' }}
                disabled={selectedInvoiceIds.length === 0}
                onClick={handleOpenBulkPaymentModal}
              >
                <CreditCard size={18} />
                <span>تسديد الفواتير المحددة ({selectedInvoiceIds.length})</span>
              </button>
            </div>
          </div>

          {/* Unpaid Invoices Table */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <div className="table-container">
              {loadingUnpaid ? (
                <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
                  جاري تحميل كشف الفواتير الآجلة غير المسددة...
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={toggleSelectAll}
                          style={{ width: '17px', height: '17px', cursor: 'pointer' }}
                          title="تحديد الكل"
                        />
                      </th>
                      <th>#</th>
                      <th>اسم المورد / المذخر</th>
                      <th>رقم الفاتورة</th>
                      <th>تاريخ الفاتورة</th>
                      <th>المبلغ المتبقي (د.ع)</th>
                      <th>تتبع المواد بالمخزن</th>
                      <th>إجراء التسديد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUnpaidInvoices.map((inv, idx) => {
                      const isSelected = selectedInvoiceIds.includes(inv.id);
                      return (
                        <tr key={inv.id} style={{ background: isSelected ? 'rgba(6, 182, 212, 0.08)' : undefined }}>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectInvoice(inv.id)}
                              style={{ width: '17px', height: '17px', cursor: 'pointer' }}
                            />
                          </td>
                          <td className="num">{idx + 1}</td>
                          <td style={{ fontWeight: 700, color: '#ffffff' }}>
                            {inv.supplier_name}
                            {inv.supplier_company && (
                              <span style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                                {inv.supplier_company}
                              </span>
                            )}
                          </td>
                          <td className="num" style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                            {inv.invoice_number}
                          </td>
                          <td className="num" style={{ fontSize: '0.85rem' }}>{inv.invoice_date}</td>
                          <td className="num" style={{ fontWeight: 800, color: '#f87171' }}>
                            {inv.formatted_remaining_amount}
                          </td>
                          <td>
                            {inv.unsold_items_count > 0 ? (
                              <span className="badge badge-alert num" style={{ fontSize: '0.76rem' }}>
                                <Package size={12} /> متوفر {inv.unsold_items_count} مادة بالصيدلية
                              </span>
                            ) : (
                              <span className="badge badge-good num" style={{ fontSize: '0.76rem' }}>
                                <Check size={12} /> مباعة بالكامل
                              </span>
                            )}
                          </td>
                          <td>
                            <button
                              className="btn btn-success"
                              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                              onClick={() => handleOpenSinglePaymentModal(inv)}
                            >
                              <CreditCard size={14} /> تسديد فاتورة
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredUnpaidInvoices.length === 0 && (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
                          لا توجد فواتير شراء آجلة غير مسددة حالياً
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT SUPPLIER                                              */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Truck color="var(--accent-cyan)" size={22} />
                {editingSupplier ? 'تعديل بيانات المورد' : 'إضافة مورد جديد لحسابات الصيدلية'}
              </h3>
              <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => setIsAddModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">اسم المورد الرئيسي *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="مثال: علي حسن (مندوب)"
                  required
                  value={supplierFormData.name}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">اسم الشركة / المذخر</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="مثال: مذخر الأمل الدوائي"
                    value={supplierFormData.company_name}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, company_name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">رقم الهاتف والتواصل</label>
                  <input
                    type="text"
                    className="form-control num"
                    placeholder="0770XXXXXXX"
                    value={supplierFormData.phone}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">ملاحظات إضافية</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ملاحظات حول طريقة التسديد أو المواعيد..."
                  value={supplierFormData.notes}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary">
                  <Check size={18} /> حفظ المورد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: SINGLE INVOICE PAYMENT MODAL                                     */}
      {/* ========================================================================= */}
      {singlePaymentInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CreditCard color="var(--accent-emerald)" size={22} />
                تسديد فاتورة شراء رقم: {singlePaymentInvoice.invoice_number}
              </h3>
              <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => setSinglePaymentInvoice(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmSinglePayment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Header Invoice Info Box */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.86rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>المورد:</span>
                    <strong style={{ display: 'block', color: '#fff' }}>{singlePaymentInvoice.supplier_name}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>تاريخ الفاتورة:</span>
                    <strong className="num" style={{ display: 'block', color: '#fff' }}>{singlePaymentInvoice.invoice_date}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>المبلغ الأصلي:</span>
                    <strong className="num" style={{ display: 'block', color: 'var(--accent-cyan)' }}>{singlePaymentInvoice.formatted_final_total}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>طريقة الدفع:</span>
                    <strong style={{ display: 'block', color: '#fbbf24' }}>آجل (Credit)</strong>
                  </div>
                </div>
              </div>

              {/* Smart Unsold Items Notice Box */}
              <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '12px', padding: '14px' }}>
                <h4 style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Package size={16} /> ملاحظات ذكية: تتبع حركة مواد الفاتورة بالمخزن
                </h4>
                {singlePaymentInvoice.unsold_items && singlePaymentInvoice.unsold_items.length > 0 ? (
                  <div>
                    <p style={{ fontSize: '0.78rem', color: '#fbbf24', marginBottom: '8px', fontWeight: 600 }}>
                      ⚠️ المواد التالية التابعة لهذه الفاتورة ما زالت موجودة في الصيدلية ولم تُباع بعد:
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '100px', overflowY: 'auto', marginBottom: '10px' }}>
                      {singlePaymentInvoice.unsold_items.map((item, i) => (
                        <span key={i} className="badge badge-alert num" style={{ fontSize: '0.76rem', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                          {item.trade_name}: متبقي {item.remaining_qty} {item.unit} (التكلفة: {formatCurrency(item.total_cost || (item.remaining_qty * (item.buy_price || 0)))})
                        </span>
                      ))}
                    </div>

                    {/* Summary Banner for Single Payment Modal */}
                    <div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fca5a5' }}>
                        إجمالي تكلفة المواد غير المباعة بالمخزن (بسعر الشراء):
                      </span>
                      <strong className="num" style={{ fontSize: '1rem', fontWeight: 800, color: '#fbbf24' }}>
                        {formatCurrency(singlePaymentInvoice.unsold_total_cost || singlePaymentInvoice.unsold_items.reduce((sum, it) => sum + (it.total_cost || (it.remaining_qty * (it.buy_price || 0))), 0))}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.82rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                    ✅ جميع مواد هذه الفاتورة تم بيعها بالكامل من المخزن.
                  </p>
                )}
              </div>


              {/* Discount Input & Net Calculation */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">الخصم عند التسديد (د.ع)</label>
                  <input
                    type="number"
                    className="form-control num"
                    placeholder="0"
                    step="250"
                    value={paymentDiscount}
                    onChange={(e) => setPaymentDiscount(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">الصافي المطلـوب دفعـه</label>
                  <div className="form-control num" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)', fontWeight: 800, fontSize: '1.1rem', textAlign: 'center' }}>
                    {formatCurrency(Math.max(0, singlePaymentInvoice.final_total_iqd - parseFloat(paymentDiscount || 0)))}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">ملاحظات التسديد</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="مثال: تسديد نقدي عن طريق المندوب..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSinglePaymentInvoice(null)}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-success">
                  <CheckCircle size={18} /> تأكيد وتسديد الفاتورة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: BULK INVOICES PAYMENT MODAL                                      */}
      {/* ========================================================================= */}
      {isBulkPaymentModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Layers color="var(--accent-cyan)" size={22} />
                تسديد مجموعة فواتير مجمعة ({selectedInvoiceIds.length} فواتير)
              </h3>
              <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => setIsBulkPaymentModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmBulkPayment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Selected Invoices List Summary */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px' }}>
                <h4 style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '10px' }}>
                  الفواتير المحددة للتسديد:
                </h4>
                <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedInvoicesList.map(inv => (
                    <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', padding: '4px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                      <span>{inv.supplier_name} - فاتورة رقم: <strong className="num" style={{ color: 'var(--accent-cyan)' }}>{inv.invoice_number}</strong></span>
                      <strong className="num" style={{ color: '#f87171' }}>{inv.formatted_final_total}</strong>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '10px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                  <span>المجموع الإجمالي الكلي:</span>
                  <span className="num" style={{ color: 'var(--accent-cyan)', fontSize: '1.1rem' }}>{formatCurrency(selectedInvoicesSum)}</span>
                </div>
              </div>

              {/* Combined Unsold Items Breakdown */}
              <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '12px', padding: '14px' }}>
                <h4 style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Package size={16} /> كشف إجمالي المواد غير المباعة للمجموعة بالمخزن
                </h4>
                {combinedUnsoldItems.length > 0 ? (
                  <div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '100px', overflowY: 'auto', marginBottom: '10px' }}>
                      {combinedUnsoldItems.map((item, i) => (
                        <span key={i} className="badge badge-alert num" style={{ fontSize: '0.76rem', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                          {item.trade_name}: متبقي {item.remaining_qty} {item.unit} (التكلفة: {formatCurrency(item.total_cost || (item.remaining_qty * (item.buy_price || 0)))})
                        </span>
                      ))}
                    </div>

                    {/* Summary Banner for Bulk Payment Modal */}
                    <div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fca5a5' }}>
                        إجمالي تكلفة المواد غير المباعة بالمخزن للمجموعة (بسعر الشراء):
                      </span>
                      <strong className="num" style={{ fontSize: '1rem', fontWeight: 800, color: '#fbbf24' }}>

                        {formatCurrency(combinedUnsoldTotalCost)}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.82rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                    ✅ جميع مواد الفواتير المحددة تم بيعها بالكامل من المخزن.
                  </p>
                )}
              </div>


              {/* Group Discount & Net Calculation */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">الخصم الإجمالي للمجموعة (د.ع)</label>
                  <input
                    type="number"
                    className="form-control num"
                    placeholder="0"
                    step="250"
                    value={bulkDiscount}
                    onChange={(e) => setBulkDiscount(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">صافي المبلغ الإجمالي المستحق</label>
                  <div className="form-control num" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)', fontWeight: 800, fontSize: '1.1rem', textAlign: 'center' }}>
                    {formatCurrency(Math.max(0, selectedInvoicesSum - parseFloat(bulkDiscount || 0)))}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">بيان / ملاحظات تسديد المجموعة</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="مثال: تسديد دفعة مجمعة لمجموعة فواتير..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsBulkPaymentModalOpen(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-success">
                  <CheckCircle size={18} /> تأكيد تسديد المجموعة ({selectedInvoiceIds.length} فواتير)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: SUPPLIER TRANSACTIONS LEDGER                                     */}
      {/* ========================================================================= */}
      {selectedSupplier && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '840px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText color="var(--accent-cyan)" size={22} />
                  كشف حساب وسجل تسديدات المورد: {selectedSupplier.name}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  الشركة: {selectedSupplier.company_name || '—'} | الهاتف: {selectedSupplier.phone || '—'}
                </p>
              </div>
              <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => setSelectedSupplier(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Total Debt Banner */}
            <div style={{ padding: '16px 20px', borderRadius: '12px', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <span style={{ fontWeight: 600 }}>رصيد الدين المتبقي المستحق للمورد:</span>
              <span className="num" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f87171' }}>
                {formatCurrency(selectedSupplier.total_debt || 0)}
              </span>
            </div>

            {/* Actions Bar */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <button className="btn btn-success" onClick={() => handleOpenTxForm('PAYMENT')}>
                <ArrowDownLeft size={16} /> تسجيل تسديد دفعة (خصم دين)
              </button>
              <button className="btn btn-primary" onClick={() => handleOpenTxForm('CREDIT_PURCHASE')}>
                <ArrowUpRight size={16} /> تسجيل وجبة بدين جديد (إضافة دين)
              </button>
            </div>

            {/* Inline Transaction Form */}
            {isTransactionFormOpen && (
              <form onSubmit={handleSaveTransaction} style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: transactionType === 'PAYMENT' ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                  {transactionType === 'PAYMENT' ? 'تسديد دفعة للمورد' : 'إضافة قيد دين جديد للمورد'}
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">المبلغ (د.ع) *</label>
                    <input
                      type="number"
                      className="form-control num"
                      placeholder="0"
                      required
                      value={txFormData.amount}
                      onChange={(e) => setTxFormData({ ...txFormData, amount: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">رقم الفاتورة / الوصل</label>
                    <input
                      type="text"
                      className="form-control num"
                      placeholder="REC-1001"
                      value={txFormData.invoice_number}
                      onChange={(e) => setTxFormData({ ...txFormData, invoice_number: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">بيان / ملاحظات العملية</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="مثال: تسديد نقدي بموجب وصل استلام..."
                    value={txFormData.notes}
                    onChange={(e) => setTxFormData({ ...txFormData, notes: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsTransactionFormOpen(false)}>
                    إلغاء
                  </button>
                  <button type="submit" className={`btn ${transactionType === 'PAYMENT' ? 'btn-success' : 'btn-primary'}`}>
                    <Check size={16} /> تأكيد وتسجيل العملية
                  </button>
                </div>
              </form>
            )}

            {/* Ledger Table */}
            <div style={{ maxHeight: '320px', overflowY: 'auto' }} className="table-container">
              {loadingLedger ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  جاري تحميل سجل الحسابات...
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>التاريخ والوقت</th>
                      <th>نوع العملية</th>
                      <th>رقم الفاتورة / الوصل</th>
                      <th>المبلغ (د.ع)</th>
                      <th>الملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerTransactions.map((tx, idx) => (
                      <tr key={tx.id}>
                        <td className="num">{idx + 1}</td>
                        <td className="num" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{tx.created_at}</td>
                        <td>
                          {tx.type === 'CREDIT_PURCHASE' ? (
                            <span className="badge badge-alert" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                              <ArrowUpRight size={12} /> استلام بدين
                            </span>
                          ) : (
                            <span className="badge badge-good">
                              <ArrowDownLeft size={12} /> تسديد دين
                            </span>
                          )}
                        </td>
                        <td className="num" style={{ fontWeight: 600 }}>{tx.invoice_number || '—'}</td>
                        <td className="num" style={{ fontWeight: 800, color: tx.type === 'CREDIT_PURCHASE' ? '#f87171' : 'var(--accent-emerald)' }}>
                          {tx.type === 'CREDIT_PURCHASE' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{tx.notes || '—'}</td>
                      </tr>
                    ))}
                    {ledgerTransactions.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                          لا يوجد ديون أو تسديدات مسجلة لهذا المورد حتى الآن
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
