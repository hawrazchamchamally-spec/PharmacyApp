import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Search, 
  Eye, 
  Printer, 
  Download, 
  X, 
  User, 
  Calendar, 
  ShoppingCart, 
  TrendingUp, 
  PackageCheck, 
  DollarSign, 
  RefreshCw,
  CheckCircle,
  Clock,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Zap
} from 'lucide-react';
import { toJpeg } from 'html-to-image';
import { formatCurrency, api } from '../services/api';

export default function SalesInvoices({ sales = [], onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSaleId, setSelectedSaleId] = useState(null);
  const [invoiceDetails, setInvoiceDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isExportingJpeg, setIsExportingJpeg] = useState(false);

  // Return Modal States
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnMode, setReturnMode] = useState('SELECT'); // 'SELECT' | 'PARTIAL'
  const [partialQuantities, setPartialQuantities] = useState({});
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const invoiceModalRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Load sale details when an invoice is clicked
  const handleOpenInvoiceModal = async (saleId) => {
    setSelectedSaleId(saleId);
    setLoadingDetails(true);
    try {
      const details = await api.getSaleDetails(saleId);
      setInvoiceDetails(details);
    } catch (err) {
      console.error('Failed to load invoice details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedSaleId(null);
    setInvoiceDetails(null);
    setIsReturnModalOpen(false);
    setReturnMode('SELECT');
  };

  // Open Return Options Modal
  const handleOpenReturnModal = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    console.log("Return button clicked", invoiceDetails);

    if (!invoiceDetails) {
      console.warn("⚠️ handleOpenReturnModal: invoiceDetails is missing");
      return;
    }

    const items = invoiceDetails.items || [];
    const initialQtyMap = {};
    items.forEach(item => {
      initialQtyMap[item.id] = 0;
    });

    setPartialQuantities(initialQtyMap);
    setReturnMode('SELECT');
    setIsReturnModalOpen(true);
  };

  // Execute Full Return
  const handleFullReturn = async () => {
    if (!invoiceDetails) return;
    if (!window.confirm(`هل أنت تأكد من رغبتك في إرجاع الفاتورة #${invoiceDetails.invoice_number} بالكامل؟\nسيتم إعادة كافة المواد للمخزن وخصم المبلغ النهائي.`)) {
      return;
    }

    try {
      setIsSubmittingReturn(true);
      const updatedDetails = await api.returnSaleInvoice({
        saleId: invoiceDetails.id,
        returnType: 'FULL'
      });

      setInvoiceDetails(updatedDetails);
      setIsReturnModalOpen(false);
      showToast('✅ تم إرجاع الفاتورة بالكامل وإعادة كافة المواد للمخزن بنجاح!');
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Full return error:', err);
      alert('حدث خطأ أثناء إرجاع الفاتورة: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  // Execute Partial Return
  const handlePartialReturnSubmit = async (e) => {
    e.preventDefault();
    if (!invoiceDetails || !invoiceDetails.items) return;

    const itemsToReturn = invoiceDetails.items
      .map(item => ({
        saleItemId: item.id,
        batchId: item.batch_id,
        quantityToReturn: parseInt(partialQuantities[item.id] || 0, 10)
      }))
      .filter(item => item.quantityToReturn > 0);

    if (itemsToReturn.length === 0) {
      alert('يرجى تحديد كمية 1 على الأقل لإرجاعها لأحد المواد!');
      return;
    }

    try {
      setIsSubmittingReturn(true);
      const updatedDetails = await api.returnSaleInvoice({
        saleId: invoiceDetails.id,
        returnType: 'PARTIAL',
        itemsToReturn
      });

      setInvoiceDetails(updatedDetails);
      setIsReturnModalOpen(false);
      showToast('✅ تم إجراء الإرجاع الجزئي وتحديث المخزون والحسابات بنجاح!');
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Partial return error:', err);
      alert('حدث خطأ أثناء الإرجاع الجزئي: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  // Export Modal Invoice Card as JPEG Image (.jpeg)
  const handleExportJpeg = async () => {
    if (!invoiceModalRef.current) return;
    try {
      setIsExportingJpeg(true);
      const dataUrl = await toJpeg(invoiceModalRef.current, { quality: 0.95, cacheBust: true });
      const link = document.createElement('a');
      link.download = `Invoice_${invoiceDetails?.invoice_number || 'Details'}.jpeg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export JPEG invoice:', err);
      alert('حدث خطأ أثناء تصدير الفاتورة كصورة JPEG');
    } finally {
      setIsExportingJpeg(false);
    }
  };

  // Print Invoice Function
  const handlePrintInvoice = () => {
    window.print();
  };

  // Filter sales by search query
  const filteredSales = sales.filter(s => {
    const term = searchTerm.toLowerCase().trim();
    return (
      (s.invoice_number && s.invoice_number.toLowerCase().includes(term)) ||
      (s.pharmacist_name && s.pharmacist_name.toLowerCase().includes(term)) ||
      (s.timestamp && s.timestamp.includes(term))
    );
  });

  // Calculate live partial return total
  const partialReturnTotal = invoiceDetails?.items
    ? invoiceDetails.items.reduce((sum, item) => {
        const qty = parseInt(partialQuantities[item.id] || 0, 10);
        return sum + (qty * item.unit_price);
      }, 0)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div 
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, var(--accent-cyan), #0284c7)',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '30px',
            fontWeight: 700,
            fontSize: '0.92rem',
            zIndex: 2000,
            boxShadow: '0 10px 25px rgba(6, 182, 212, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <Zap size={18} /> {toastMessage}
        </div>
      )}

      {/* Top Controls Header Bar */}
      <div 
        className="glass-card" 
        style={{ 
          padding: '20px 24px', 
          display: 'flex', 
          alignItems: 'center', 
          justify: 'space-between', 
          flexWrap: 'wrap', 
          gap: '16px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9))',
          border: '1px solid rgba(6, 182, 212, 0.3)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '12px', borderRadius: '14px', background: 'rgba(6, 182, 212, 0.2)', color: 'var(--accent-cyan)' }}>
            <FileText size={26} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
              سجل فواتير البيع الحقيقية (Sales Invoices Ledger)
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              معاينة وإرجاع المبيعات وحفظ جميع الفواتير الصادرة من شاشة نقطة البيع (POS)
            </p>
          </div>
        </div>

        {/* Search & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="ابحث برقم الفاتورة أو اسم الصيدلي..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingRight: '36px', fontSize: '0.85rem' }}
            />
          </div>

          <button 
            className="btn btn-secondary" 
            onClick={onRefresh} 
            style={{ padding: '8px 12px' }}
            title="تحديث البيانات"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Main Invoices Table Card */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>رقم الفاتورة</th>
                <th>التاريخ والوقت</th>
                <th>الحالة</th>
                <th>اسم الصيدلي / المستخدم</th>
                <th>عدد المواد المباعة</th>
                <th>المجموع الكلي (د.ع)</th>
                <th>الخصم (د.ع)</th>
                <th>الصافي النهائي (د.ع)</th>
                <th>المعاينة والإرجاع</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((sale, index) => {
                const isReturned = sale.status === 'RETURNED';
                const isPartiallyReturned = sale.status === 'PARTIALLY_RETURNED';

                return (
                  <tr 
                    key={sale.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleOpenInvoiceModal(sale.id)}
                  >
                    <td className="num">{index + 1}</td>
                    <td className="num" style={{ fontWeight: 800, color: 'var(--accent-cyan)' }}>
                      {sale.invoice_number}
                    </td>
                    <td className="num" style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>
                      {sale.timestamp}
                    </td>

                    {/* Status Badge */}
                    <td>
                      {isReturned ? (
                        <span className="badge badge-danger num" style={{ fontSize: '0.75rem' }}>مرجعة بالكامل</span>
                      ) : isPartiallyReturned ? (
                        <span className="badge badge-alert num" style={{ fontSize: '0.75rem' }}>مرجعة جزئياً</span>
                      ) : (
                        <span className="badge badge-good num" style={{ fontSize: '0.75rem' }}>مكتملة</span>
                      )}
                    </td>

                    <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      {sale.pharmacist_name || 'د. أحمد علي (صيدلي مسؤول)'}
                    </td>
                    <td className="num" style={{ fontWeight: 700 }}>
                      {sale.total_items_count ? `${sale.total_items_count} قطعة` : '—'}
                    </td>
                    
                    {/* Financial Values strictly formatted in 'د.ع' */}
                    <td className="num" style={{ color: 'var(--text-muted)' }}>
                      {formatCurrency(sale.total_amount)}
                    </td>
                    <td className="num" style={{ color: sale.discount > 0 ? '#fbbf24' : 'var(--text-muted)' }}>
                      {formatCurrency(sale.discount)}
                    </td>
                    <td className="num" style={{ fontWeight: 800, color: isReturned ? 'var(--accent-rose)' : 'var(--accent-emerald)', fontSize: '0.95rem' }}>
                      {formatCurrency(sale.final_amount)}
                    </td>
                    
                    <td>
                      <button 
                        className="btn btn-secondary" 
                        onClick={(e) => { e.stopPropagation(); handleOpenInvoiceModal(sale.id); }}
                        style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--accent-cyan)' }}
                      >
                        <Eye size={15} /> معاينة وإرجاع
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                    لا توجد فواتير مبيعات مسجلة تطابق عملية البحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Detailed Invoice Modal (النافذة المنبثقة التفصيلية للفاتورة) */}
      {selectedSaleId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '840px', padding: '28px' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText color="var(--accent-cyan)" size={24} />
                  تفاصيل فاتورة البيع #{invoiceDetails?.invoice_number || '...'}
                  {invoiceDetails?.status === 'RETURNED' && (
                    <span className="badge badge-danger num" style={{ fontSize: '0.78rem' }}>مرجعة بالكامل</span>
                  )}
                  {invoiceDetails?.status === 'PARTIALLY_RETURNED' && (
                    <span className="badge badge-alert num" style={{ fontSize: '0.78rem' }}>مرجعة جزئياً</span>
                  )}
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  التاريخ: <span className="num" style={{ color: 'var(--accent-cyan)' }}>{invoiceDetails?.timestamp}</span> • الصيدلي المسؤول: {invoiceDetails?.pharmacist_name || 'د. أحمد علي'}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={handleCloseModal}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {loadingDetails ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                جاري تحميل تفاصيل الفاتورة والمواد المباعة...
              </div>
            ) : invoiceDetails ? (
              <div ref={invoiceModalRef} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Invoice Metadata Summary Pills */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
                  <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>المجموع قبل الخصم:</span>
                    <div className="num" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                      {invoiceDetails.formatted_total}
                    </div>
                  </div>

                  <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>الخصم الممنوح:</span>
                    <div className="num" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fbbf24', marginTop: '2px' }}>
                      {invoiceDetails.formatted_discount}
                    </div>
                  </div>

                  {invoiceDetails.returned_amount > 0 && (
                    <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.35)' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>المبلغ المرجّع:</span>
                      <div className="num" style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--accent-rose)', marginTop: '2px' }}>
                        {invoiceDetails.formatted_returned}
                      </div>
                    </div>
                  )}

                  <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.35)' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>الصافي النهائي للمدفوع:</span>
                    <div className="num" style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--accent-emerald)', marginTop: '2px' }}>
                      {invoiceDetails.formatted_final}
                    </div>
                  </div>
                </div>

                {/* Items Table inside Invoice Modal */}
                <div style={{ marginTop: '8px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '10px', color: 'var(--text-main)' }}>
                    قائمة المواد والأدوية المباعة داخل هذه الفاتورة:
                  </h4>

                  <div className="table-container" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>اسم المستحضر / الدواء</th>
                          <th>رقم التشغيلة (Batch)</th>
                          <th>الكمية</th>
                          <th>سعر البيع (د.ع)</th>
                          <th>سعر الشراء (د.ع)</th>
                          <th>الإجمالي (د.ع)</th>
                          <th>ربح المادة (د.ع)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoiceDetails.items && invoiceDetails.items.map((item, idx) => (
                          <tr key={item.id || idx}>
                            <td className="num">{idx + 1}</td>
                            <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                              {item.trade_name}
                              <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                {item.generic_name}
                              </span>
                            </td>
                            <td className="num" style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                              {item.batch_number}
                            </td>
                            <td className="num" style={{ fontWeight: 700 }}>
                              {item.quantity} قطعة
                            </td>
                            
                            {/* Financial Values strictly formatted with 'د.ع' */}
                            <td className="num" style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>
                              {item.formatted_unit_price}
                            </td>
                            <td className="num" style={{ color: 'var(--text-muted)' }}>
                              {item.formatted_buy_price}
                            </td>
                            <td className="num" style={{ fontWeight: 800 }}>
                              {item.formatted_total_price}
                            </td>
                            <td className="num" style={{ fontWeight: 800, color: 'var(--accent-cyan)' }}>
                              {item.formatted_gross_profit}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Modal Actions Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    عملة الفاتورة المعتمدة: <strong style={{ color: 'var(--accent-cyan)' }}>الدينار العراقي (د.ع)</strong>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {/* Prominent Sales Return Button */}
                    <button
                      className="btn btn-secondary"
                      onClick={handleOpenReturnModal}
                      disabled={invoiceDetails.status === 'RETURNED'}
                      style={{
                        background: invoiceDetails.status === 'RETURNED' ? 'rgba(255,255,255,0.05)' : 'rgba(244, 63, 94, 0.15)',
                        borderColor: invoiceDetails.status === 'RETURNED' ? 'rgba(255,255,255,0.1)' : 'rgba(244, 63, 94, 0.4)',
                        color: invoiceDetails.status === 'RETURNED' ? 'var(--text-muted)' : 'var(--accent-rose)',
                        fontWeight: 700
                      }}
                      title="إرجاع الأدوية بالكامل أو بشكل مخصص جزئي"
                    >
                      <RotateCcw size={16} /> 
                      {invoiceDetails.status === 'RETURNED' ? 'الفاتورة مرجعة بالكامل' : 'إرجاع الأدوية / الفاتورة (Sales Return)'}
                    </button>

                    <button 
                      className="btn btn-secondary"
                      onClick={handleExportJpeg}
                      disabled={isExportingJpeg}
                      style={{ color: 'var(--accent-cyan)', borderColor: 'rgba(6, 182, 212, 0.4)' }}
                    >
                      <Download size={16} /> {isExportingJpeg ? 'جاري التصدير...' : 'تصدير كـ JPEG'}
                    </button>

                    <button 
                      className="btn btn-primary"
                      onClick={handlePrintInvoice}
                    >
                      <Printer size={16} /> طباعة الفاتورة
                    </button>
                  </div>
                </div>

              </div>
            ) : null}

          </div>
        </div>
      )}

      {/* Return Options Modal (نافذة خيارات واسترجاع الفاتورة) */}
      {isReturnModalOpen && invoiceDetails && (
        <div className="modal-overlay" style={{ zIndex: 2500, background: 'rgba(0, 0, 0, 0.85)' }}>
          <div className="modal-content" style={{ maxWidth: '720px', padding: '24px', zIndex: 2501 }}>
            
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <RotateCcw size={22} />
                خيارات إرجاع مبيعات الفاتورة #{invoiceDetails.invoice_number}
              </h3>
              <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => setIsReturnModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {returnMode === 'SELECT' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  يرجى اختيار نوع الإرجاع المطلوب لمواد هذه الفاتورة:
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  
                  {/* Option 1: Full Return Card */}
                  <div
                    onClick={handleFullReturn}
                    className="glass-card"
                    style={{
                      padding: '24px',
                      cursor: 'pointer',
                      background: 'rgba(244, 63, 94, 0.08)',
                      border: '1px solid rgba(244, 63, 94, 0.3)',
                      borderRadius: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      gap: '12px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ padding: '16px', borderRadius: '50%', background: 'rgba(244, 63, 94, 0.2)', color: 'var(--accent-rose)' }}>
                      <RotateCcw size={32} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>أ. إرجاع الكل (Full Return)</h4>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '6px', lineHeight: '1.4' }}>
                        إرجاع كافة كميات الأدوية الموجودة بالفاتورة إلى المخزن نهائياً وتصفير إجمالي المبيعات.
                      </p>
                    </div>
                    <button className="btn btn-danger" style={{ width: '100%', marginTop: '8px' }}>
                      تأكيد إرجاع الفاتورة بالكامل
                    </button>
                  </div>

                  {/* Option 2: Partial Return Card */}
                  <div
                    onClick={() => setReturnMode('PARTIAL')}
                    className="glass-card"
                    style={{
                      padding: '24px',
                      cursor: 'pointer',
                      background: 'rgba(6, 182, 212, 0.08)',
                      border: '1px solid rgba(6, 182, 212, 0.3)',
                      borderRadius: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      gap: '12px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ padding: '16px', borderRadius: '50%', background: 'rgba(6, 182, 212, 0.2)', color: 'var(--accent-cyan)' }}>
                      <Sliders size={32} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>ب. إرجاع مخصص (Partial Return)</h4>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '6px', lineHeight: '1.4' }}>
                        تحديد أدوية وكميات محددة لإرجاعها للمخزن مع حساب القيمة المالية المسترجعة فقط.
                      </p>
                    </div>
                    <button className="btn btn-secondary" style={{ width: '100%', marginTop: '8px', color: 'var(--accent-cyan)', borderColor: 'rgba(6, 182, 212, 0.4)' }}>
                      اختيار الأدوية والكميات
                    </button>
                  </div>

                </div>
              </div>
            ) : (
              /* Partial Return Table Form */
              <form onSubmit={handlePartialReturnSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', margin: 0 }}>
                    أدخل الكمية المراد إرجاعها لكل مادة (بشرط عدم تجاوز الكمية المباعة الأصلية):
                  </p>
                  <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => setReturnMode('SELECT')}>
                    العودة لخيارات الإرجاع
                  </button>
                </div>

                <div className="table-container" style={{ maxHeight: '260px', overflowY: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>اسم الدواء / المستحضر</th>
                        <th>الكمية المباعة</th>
                        <th>الكمية المراد إرجاعها</th>
                        <th>مبلغ الاسترجاع (د.ع)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceDetails.items && invoiceDetails.items.map((item, index) => {
                        const qtyToReturn = parseInt(partialQuantities[item.id] || 0, 10);
                        const lineReturnValue = qtyToReturn * item.unit_price;

                        return (
                          <tr key={item.id}>
                            <td className="num">{index + 1}</td>
                            <td style={{ fontWeight: 700 }}>{item.trade_name}</td>
                            <td className="num" style={{ fontWeight: 700 }}>{item.quantity} قطعة</td>
                            <td>
                              <input
                                type="number"
                                className="form-control num"
                                min="0"
                                max={item.quantity}
                                value={partialQuantities[item.id] || 0}
                                onChange={(e) => {
                                  const val = Math.min(item.quantity, Math.max(0, parseInt(e.target.value || 0, 10)));
                                  setPartialQuantities({
                                    ...partialQuantities,
                                    [item.id]: val
                                  });
                                }}
                                style={{ width: '90px', padding: '4px 8px', textAlign: 'center', fontWeight: 800 }}
                              />
                            </td>
                            <td className="num" style={{ fontWeight: 800, color: lineReturnValue > 0 ? 'var(--accent-rose)' : 'var(--text-muted)' }}>
                              {formatCurrency(lineReturnValue)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Total Calculated Return Amount Banner */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '12px' }}>
                  <span style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.95rem' }}>إجمالي قيمة المواد المراد استرجاعها:</span>
                  <span className="num" style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--accent-rose)' }}>
                    {formatCurrency(partialReturnTotal)}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsReturnModalOpen(false)}>
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="btn btn-danger"
                    disabled={isSubmittingReturn || partialReturnTotal <= 0}
                    style={{ gap: '8px', padding: '10px 24px', fontWeight: 800 }}
                  >
                    <CheckCircle2 size={18} />
                    {isSubmittingReturn ? 'جاري تنفيذ الإرجاع...' : 'تأكيد الإرجاع الجزئي'}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
