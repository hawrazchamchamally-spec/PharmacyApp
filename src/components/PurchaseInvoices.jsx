import React, { useState, useEffect, useRef } from 'react';

import { 
  FileSpreadsheet, 
  Plus, 
  Trash2, 
  Search, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  Calendar, 
  User, 
  Tag, 
  Layers, 
  FileText,
  X,
  Printer,
  Download,
  Eye,
  RotateCcw
} from 'lucide-react';
import { formatCurrency, api } from '../services/api';

// Helper to format numbers with thousands separators (e.g. 1000000 -> "1,000,000")
export function formatThousands(val) {
  if (val === null || val === undefined || val === '') return '';
  const str = String(val).replace(/,/g, '').trim();
  if (!str) return '';
  const parts = str.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

// Clean number input string (strips commas and non-numeric characters while preserving decimal)
export function cleanNumber(val) {
  if (val === null || val === undefined) return '';
  let clean = String(val).replace(/,/g, '').replace(/[^0-9.]/g, '');
  const parts = clean.split('.');
  if (parts.length > 2) {
    clean = parts[0] + '.' + parts.slice(1).join('');
  }
  return clean;
}

// Flexible fast date input component with automatic navigation between Year and Month
function ExpiryDateInput({ value, onChange, onNext, rowIdx, cellRefs }) {
  const parseVal = (val) => {
    if (!val) {
      const nextYear = new Date().getFullYear() + 1;
      return { year: String(nextYear), month: '01' };
    }
    const parts = String(val).split('-');
    if (parts.length >= 2) {
      return { year: parts[0] || '', month: parts[1] || '' };
    }
    return { year: String(val).slice(0, 4), month: '' };
  };

  const { year: curYear, month: curMonth } = parseVal(value);
  const [year, setYear] = useState(curYear);
  const [month, setMonth] = useState(curMonth);

  useEffect(() => {
    const { year: y, month: m } = parseVal(value);
    setYear(y);
    setMonth(m);
  }, [value]);

  const yearInputRef = useRef(null);
  const monthInputRef = useRef(null);

  useEffect(() => {
    if (cellRefs && cellRefs.current) {
      cellRefs.current[`${rowIdx}-expiry_date`] = yearInputRef.current;
      cellRefs.current[`${rowIdx}-expiry_year`] = yearInputRef.current;
      cellRefs.current[`${rowIdx}-expiry_month`] = monthInputRef.current;
    }
  }, [rowIdx, cellRefs]);

  const emitChange = (newYear, newMonth) => {
    const y = (newYear || '').trim();
    const m = (newMonth || '').trim();
    if (y && m) {
      const paddedM = m.padStart(2, '0');
      onChange(`${y}-${paddedM}-01`);
    } else if (y) {
      onChange(`${y}-01-01`);
    } else {
      onChange('');
    }
  };

  const handleYearChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setYear(val);
    emitChange(val, month);

    // Auto-advance focus to Month as soon as 4 digits are typed (e.g. 2026)
    if (val.length === 4) {
      setTimeout(() => {
        if (monthInputRef.current) {
          monthInputRef.current.focus();
          monthInputRef.current.select();
        }
      }, 15);
    }
  };

  const handleMonthChange = (e) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 2);
    const num = parseInt(val, 10);
    if (num > 12) {
      val = '12';
    }
    setMonth(val);
    emitChange(year, val);

    // Auto-advance to next column when 2 digits of month typed or month is 2-9
    if (val.length === 2) {
      setTimeout(() => {
        if (onNext) onNext();
      }, 30);
    }
  };

  const handleYearKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (monthInputRef.current) {
        monthInputRef.current.focus();
        monthInputRef.current.select();
      }
    }
  };

  const handleMonthKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (onNext) onNext();
    } else if (e.key === 'Backspace' && (!month || month.length === 0)) {
      e.preventDefault();
      if (yearInputRef.current) {
        yearInputRef.current.focus();
        yearInputRef.current.select();
      }
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', direction: 'ltr', justifyContent: 'center' }}>
      <input
        ref={yearInputRef}
        type="text"
        inputMode="numeric"
        placeholder="YYYY"
        className="form-control num"
        value={year}
        onChange={handleYearChange}
        onKeyDown={handleYearKeyDown}
        onFocus={(e) => e.target.select()}
        style={{
          width: '56px',
          padding: '4px 3px',
          textAlign: 'center',
          fontSize: '0.84rem',
          fontWeight: 700,
          color: 'var(--accent-cyan)',
          borderColor: 'rgba(6, 182, 212, 0.4)'
        }}
        title="سنة النفاذ (مثال: 2026 - تنتقل تلقائياً للشهر بعد 4 أرقام)"
      />
      <span style={{ color: 'var(--text-muted)', fontWeight: 800, fontSize: '0.8rem' }}>/</span>
      <input
        ref={monthInputRef}
        type="text"
        inputMode="numeric"
        placeholder="MM"
        className="form-control num"
        value={month}
        onChange={handleMonthChange}
        onKeyDown={handleMonthKeyDown}
        onFocus={(e) => e.target.select()}
        style={{
          width: '38px',
          padding: '4px 3px',
          textAlign: 'center',
          fontSize: '0.84rem',
          fontWeight: 700,
          color: '#fbbf24',
          borderColor: 'rgba(245, 158, 11, 0.4)'
        }}
        title="شهر النفاذ (مثال: 08 أو 12)"
      />
    </div>
  );
}

export default function PurchaseInvoices({ suppliers = [], medications = [], purchaseInvoices = [], onAddPurchaseInvoice }) {

  const [activeTab, setActiveTab] = useState('new'); // 'new' or 'history'
  const [searchTerm, setSearchTerm] = useState('');

  // ----------------------------------------------------
  // DRAFT PERSISTENCE ENGINE (sessionStorage)
  // ----------------------------------------------------
  const DRAFT_KEY = 'purchase_invoice_draft';

  const getInitialDraft = () => {
    try {
      const saved = sessionStorage.getItem(DRAFT_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse purchase invoice draft:', e);
    }
    return null;
  };

  const initialDraftRef = useRef(getInitialDraft());
  const initialDraft = initialDraftRef.current;

  // ----------------------------------------------------
  // FORM HEADER STATE
  // ----------------------------------------------------
  const [supplierId, setSupplierId] = useState(() => initialDraft?.supplierId ?? (suppliers[0]?.id || ''));
  const [supplierSearchText, setSupplierSearchText] = useState(() => initialDraft?.supplierSearchText ?? (suppliers[0]?.name || ''));
  const [invoiceDate, setInvoiceDate] = useState(() => initialDraft?.invoiceDate ?? new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState(() => initialDraft?.invoiceNumber ?? `PUR-${Date.now().toString().substring(6)}`);
  const [paymentType, setPaymentType] = useState(() => initialDraft?.paymentType ?? 'CASH'); // 'CASH' or 'CREDIT'
  const [currency, setCurrency] = useState(() => initialDraft?.currency ?? 'IQD'); // 'IQD' or 'USD'
  const [exchangeRate, setExchangeRate] = useState(() => initialDraft?.exchangeRate ?? '1500');
  const [discountPercent, setDiscountPercent] = useState(() => initialDraft?.discountPercent ?? '0');

  // Selected Invoice preview modal state
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [previewInvoiceModal, setPreviewInvoiceModal] = useState({ isOpen: false, loading: false, data: null });

  const handleOpenPreviewModal = async (inv) => {
    setPreviewInvoiceModal({ isOpen: true, loading: true, data: inv });
    try {
      const details = await api.getPurchaseInvoiceDetails(inv.id);
      if (details) {
        setPreviewInvoiceModal({ isOpen: true, loading: false, data: details });
      } else {
        setPreviewInvoiceModal({ isOpen: true, loading: false, data: inv });
      }
    } catch (err) {
      console.error('Failed to fetch purchase invoice details:', err);
      setPreviewInvoiceModal({ isOpen: true, loading: false, data: inv });
    }
  };

  // ----------------------------------------------------
  // ITEMS TABLE STATE
  // ----------------------------------------------------
  const createEmptyItem = () => ({
    id: Date.now() + Math.random(),
    barcode: '',
    trade_name: '',
    expiry_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    unit: 'باكيت',
    units_per_pack: '1',
    quantity: '1',
    category: 'عام',
    buy_price: '',
    sell_price: '',
    profit_margin: '0'
  });

  const [items, setItems] = useState(() => (initialDraft?.items && initialDraft.items.length > 0) ? initialDraft.items : [createEmptyItem()]);

  // Auto-persist invoice draft to sessionStorage on state changes
  useEffect(() => {
    try {
      const draft = {
        supplierId,
        supplierSearchText,
        invoiceDate,
        invoiceNumber,
        paymentType,
        currency,
        exchangeRate,
        discountPercent,
        items
      };
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
      console.warn('Failed to save purchase invoice draft:', e);
    }
  }, [supplierId, supplierSearchText, invoiceDate, invoiceNumber, paymentType, currency, exchangeRate, discountPercent, items]);

  // Clear Invoice Handler (Resets draft and all form inputs)
  const handleClearInvoice = (skipConfirm = false) => {
    if (!skipConfirm) {
      const confirmed = window.confirm('هل أنت تأكد من رغبتك في تفريغ الفاتورة ومسح كافة البيانات المدخلة؟');
      if (!confirmed) return;
    }

    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch (e) {
      // ignore
    }

    const defaultSupp = suppliers[0];
    setSupplierId(defaultSupp?.id || '');
    setSupplierSearchText(defaultSupp ? `${defaultSupp.name} (${defaultSupp.company_name || 'مذخر'})` : '');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setInvoiceNumber(`PUR-${Date.now().toString().substring(6)}`);
    setPaymentType('CASH');
    setCurrency('IQD');
    setExchangeRate('1500');
    setDiscountPercent('0');
    setItems([createEmptyItem()]);
  };

  // Supplier Price Comparison Modal State
  const [priceHistoryModal, setPriceHistoryModal] = useState({
    isOpen: false,
    trade_name: '',
    currentBuyPrice: 0,
    history: [],
    rowIndex: null
  });

  const priceHistoryCloseBtnRef = useRef(null);
  const cellRefs = useRef({});
  const lastTabTimeRef = useRef(0);

  const focusField = (rowIdx, fieldName) => {
    setTimeout(() => {
      const key = `${rowIdx}-${fieldName}`;
      const el = cellRefs.current[key];
      if (el) {
        el.focus();
        if (typeof el.select === 'function' && el.type !== 'date') {
          el.select();
        }
      }
    }, 30);
  };

  const focusNextRowBarcode = (currentRowIdx) => {
    setItems((prevItems) => {
      const nextIdx = currentRowIdx + 1;
      if (nextIdx >= prevItems.length) {
        const newItems = [...prevItems, createEmptyItem()];
        setTimeout(() => {
          focusField(nextIdx, 'barcode');
        }, 50);
        return newItems;
      } else {
        setTimeout(() => {
          focusField(nextIdx, 'barcode');
        }, 30);
        return prevItems;
      }
    });
  };

  const closePriceHistoryModal = () => {
    const targetRow = priceHistoryModal.rowIndex;
    setPriceHistoryModal({ isOpen: false, trade_name: '', currentBuyPrice: 0, history: [], rowIndex: null });
    if (targetRow !== null && targetRow !== undefined) {
      focusField(targetRow, 'sell_price');
    }
  };

  // Auto-focus and keyboard listener (Enter & ESC) for price history modal
  useEffect(() => {
    if (!priceHistoryModal.isOpen) return;

    const timer = setTimeout(() => {
      priceHistoryCloseBtnRef.current?.focus();
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closePriceHistoryModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [priceHistoryModal.isOpen, priceHistoryModal.rowIndex]);

  const triggerBuyPriceHistoryOrNext = async (index, item) => {
    const buyPrice = parseFloat(item.buy_price) || 0;
    if (buyPrice > 0 && (item.barcode.trim() || item.trade_name.trim())) {
      try {
        const history = await api.getSupplierPriceHistory({
          barcode: item.barcode,
          trade_name: item.trade_name
        });

        if (history && history.length > 0) {
          setPriceHistoryModal({
            isOpen: true,
            trade_name: item.trade_name || item.barcode,
            currentBuyPrice: buyPrice,
            history,
            rowIndex: index
          });
          return;
        }
      } catch (e) {
        console.warn('Error fetching supplier price history:', e);
      }
    }
    // If no price history modal, focus sell_price
    focusField(index, 'sell_price');
  };

  const handleBuyPriceBlur = async (index, item) => {
    const buyPrice = parseFloat(item.buy_price) || 0;
    if (buyPrice <= 0 || (!item.barcode.trim() && !item.trade_name.trim())) return;

    try {
      const history = await api.getSupplierPriceHistory({
        barcode: item.barcode,
        trade_name: item.trade_name
      });

      if (history && history.length > 0) {
        setPriceHistoryModal(prev => {
          if (prev.isOpen) return prev;
          return {
            isOpen: true,
            trade_name: item.trade_name || item.barcode,
            currentBuyPrice: buyPrice,
            history,
            rowIndex: index
          };
        });
      }
    } catch (e) {
      console.warn('Error fetching supplier price history:', e);
    }
  };

  // Unique categories for Autocomplete Combobox datalist
  const uniqueCategories = Array.from(
    new Set([
      'مسكنات وآلام',
      'مضادات حيوية',
      'ضد التهابات ومسكن',
      'أدوية الجهاز الهضمي',
      'أدوية الضغط والقلب',
      'مكملات غذائية وفيتامينات',
      ...medications.map(m => m.category)
    ].filter(Boolean))
  );

  // Handle Barcode auto-fill if barcode exists in database
  const handleBarcodeChange = async (index, barcodeValue) => {
    const updated = [...items];
    updated[index].barcode = barcodeValue;

    const trimmed = barcodeValue.trim();
    if (trimmed) {
      let foundMed = medications.find(m => m.barcode === trimmed);
      if (!foundMed && trimmed.length >= 3) {
        try {
          foundMed = await api.getMedicationByBarcode(trimmed);
        } catch (e) {
          // ignore error
        }
      }

      if (foundMed) {
        console.log('🔍 [Auto-Fill Barcode] Found medication object:', foundMed);
        if (foundMed.trade_name) updated[index].trade_name = foundMed.trade_name;
        if (foundMed.category) updated[index].category = foundMed.category;
        if (foundMed.units_per_pack) updated[index].units_per_pack = String(foundMed.units_per_pack);

        // Auto-fill selling price explicitly ONLY (do NOT auto-fill buy_price)
        const sPrice = parseFloat(foundMed.sell_price || foundMed.last_sell_price || foundMed.selling_price || foundMed.sale_price || foundMed.unit_sale_price || foundMed.price || 0);

        if (sPrice > 0) {
          updated[index].sell_price = String(sPrice);
        }
        updated[index].buy_price = '';
        updated[index].profit_margin = '0';
      }
    }

    setItems(updated);
  };

  // Handle field change with dynamic Math calculation between Buy Price, Sell Price, and Profit Margin %
  const handleItemChange = (index, field, val) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: val };

    // Auto-fill medication details when selecting/entering Trade Name
    if (field === 'trade_name' && val.trim()) {
      const foundMed = medications.find(m => m.trade_name === val.trim() || m.barcode === val.trim());
      if (foundMed) {
        console.log('🔍 [Auto-Fill TradeName] Found medication object:', foundMed);
        if (foundMed.barcode && !item.barcode) item.barcode = foundMed.barcode;
        if (foundMed.category) item.category = foundMed.category;
        if (foundMed.units_per_pack) item.units_per_pack = String(foundMed.units_per_pack);

        // Auto-fill selling price explicitly ONLY (do NOT auto-fill buy_price)
        const sPrice = parseFloat(foundMed.sell_price || foundMed.last_sell_price || foundMed.selling_price || foundMed.sale_price || foundMed.unit_sale_price || foundMed.price || 0);

        if (sPrice > 0) {
          item.sell_price = String(sPrice);
        }
        item.buy_price = '';
        item.profit_margin = '0';
      }
    }

    const buyPrice = parseFloat(item.buy_price) || 0;
    const sellPrice = parseFloat(item.sell_price) || 0;
    const margin = parseFloat(item.profit_margin) || 0;

    if (field === 'buy_price') {
      const bPrice = parseFloat(val) || 0;
      if (sellPrice > 0 && bPrice > 0) {
        item.profit_margin = (((sellPrice - bPrice) / bPrice) * 100).toFixed(2);
      } else if (margin > 0 && bPrice > 0) {
        item.sell_price = (bPrice * (1 + margin / 100)).toFixed(2);
      }
    } else if (field === 'profit_margin') {
      const mVal = parseFloat(val) || 0;
      if (buyPrice > 0) {
        item.sell_price = (buyPrice * (1 + mVal / 100)).toFixed(2);
      }
    } else if (field === 'sell_price') {
      const sPrice = parseFloat(val) || 0;
      if (buyPrice > 0) {
        item.profit_margin = (((sPrice - buyPrice) / buyPrice) * 100).toFixed(2);
      }
    }

    updated[index] = item;
    setItems(updated);
  };


  const removeItemRow = (index) => {
    if (items.length === 1) {
      setItems([createEmptyItem()]);
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const addNewRow = () => {
    setItems([...items, createEmptyItem()]);
  };

  // Financial Calculations
  const rateNum = currency === 'USD' ? (parseFloat(exchangeRate) || 1) : 1;
  const validItems = items.filter(it => it.trade_name.trim().length > 0);

  const rawSubtotalCurrency = validItems.reduce((sum, it) => {
    const bPrice = parseFloat(it.buy_price) || 0;
    const qty = parseInt(it.quantity, 10) || 1;
    return sum + (bPrice * qty);
  }, 0);

  const subtotalIQD = rawSubtotalCurrency * rateNum;
  const discPercent = Math.min(100, Math.max(0, parseFloat(discountPercent) || 0));
  const discountAmountIQD = subtotalIQD * (discPercent / 100);
  const finalTotalNetIQD = Math.max(0, subtotalIQD - discountAmountIQD);

  // Submit Handler
  const handleSaveInvoice = async () => {
    if (!supplierId) {
      alert('يرجى اختيار المورد التابع له الفاتورة!');
      return;
    }
    if (!invoiceNumber.trim()) {
      alert('يرجى إدخال رقم الفاتورة بشكل صحيح!');
      return;
    }
    if (validItems.length === 0) {
      alert('يرجى إضافة مادة واحدة على الأقل في جدول مواد الفاتورة!');
      return;
    }

    try {
      const invoicePayload = {
        invoice_number: invoiceNumber.trim(),
        supplier_id: supplierId,
        invoice_date: invoiceDate,
        payment_type: paymentType,
        currency,
        exchange_rate: rateNum,
        subtotal: subtotalIQD,
        discount_percent: discPercent,
        final_total_iqd: finalTotalNetIQD,
        items: validItems.map(it => ({
          barcode: it.barcode || `628${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          trade_name: it.trade_name,
          expiry_date: it.expiry_date,
          unit: it.unit || 'باكيت',
          units_per_pack: parseInt(it.units_per_pack, 10) || 1,
          quantity: parseInt(it.quantity, 10) || 1,
          category: it.category || 'عام',
          buy_price: parseFloat(it.buy_price) || 0,
          sell_price: parseFloat(it.sell_price) || 0,
          profit_margin: parseFloat(it.profit_margin) || 0
        }))
      };

      await onAddPurchaseInvoice(invoicePayload);
      alert('تم حفظ فاتورة الشراء وتحديث مخزون الأدوية وسجل ديون المورد بنجاح!');

      // Clear draft from sessionStorage upon successful save
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch (e) {
        // ignore
      }

      // Reset form to fresh invoice
      setInvoiceNumber(`PUR-${Date.now().toString().substring(6)}`);
      setDiscountPercent('0');
      setItems([createEmptyItem()]);
      setActiveTab('history');
    } catch (err) {
      console.error('Failed to save purchase invoice:', err);
      alert('حدث خطأ أثناء حفظ فاتورة الشراء: ' + (err.message || 'خطأ غير معروف'));
    }
  };

  // Filter History Invoices
  const filteredHistory = purchaseInvoices.filter(inv => {
    const term = searchTerm.toLowerCase();
    return (
      (inv.invoice_number && inv.invoice_number.toLowerCase().includes(term)) ||
      (inv.supplier_name && inv.supplier_name.toLowerCase().includes(term)) ||
      (inv.invoice_date && inv.invoice_date.includes(term))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Header & Tab Controls */}
      <div className="glass-card" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-emerald)' }}>
            <FileSpreadsheet size={26} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>إدارة ومتابعة فواتير الشراء</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ربط مباشر وسريع بين توريد الموردين وتحديث مخزون الأدوية والديون</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '10px', background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <button
            className={`btn ${activeTab === 'new' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('new')}
            style={{ padding: '8px 20px', fontSize: '0.9rem' }}
          >
            <Plus size={16} /> فاتـورة شـراء جديـدة
          </button>

          <button
            className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('history')}
            style={{ padding: '8px 20px', fontSize: '0.9rem' }}
          >
            <Clock size={16} /> الفواتـير المسـجلة ({purchaseInvoices.length})
          </button>
        </div>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: NEW INVOICE FORM */}
      {/* ==================================================== */}
      {activeTab === 'new' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Header Form Panel */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={18} /> بيانات الفاتورة الرئيسية والمورد
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              {/* Field 1: Supplier Autocomplete */}
              <div className="form-group">
                <label className="form-label">المـورد التابـع له الشحنـة</label>
                <input
                  type="text"
                  list="suppliers-datalist"
                  className="form-control"
                  placeholder="ابحث باسم المورد أو اختره..."
                  value={supplierSearchText}
                  onChange={(e) => {
                    setSupplierSearchText(e.target.value);
                    const matched = suppliers.find(s => s.name === e.target.value || `${s.name} (${s.company_name || 'مذخر'})` === e.target.value);
                    if (matched) setSupplierId(matched.id);
                  }}
                />
                <datalist id="suppliers-datalist">
                  {suppliers.map(s => (
                    <option key={s.id} value={`${s.name} (${s.company_name || 'مذخر'})`} />
                  ))}
                </datalist>
              </div>

              {/* Field 2: Invoice Date */}
              <div className="form-group">
                <label className="form-label">تاريخ الفاتورة</label>
                <input
                  type="date"
                  className="form-control num"
                  required
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>

              {/* Field 3: Invoice Number */}
              <div className="form-group">
                <label className="form-label">رقم الفاتورة</label>
                <input
                  type="text"
                  className="form-control num"
                  required
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                />
              </div>

              {/* Option 1: Payment Type (CASH / CREDIT) */}
              <div className="form-group">
                <label className="form-label">نوع الدفع</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className={`btn ${paymentType === 'CASH' ? 'btn-success' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '8px' }}
                    onClick={() => setPaymentType('CASH')}
                  >
                    نقدي (CASH)
                  </button>
                  <button
                    type="button"
                    className={`btn ${paymentType === 'CREDIT' ? 'btn-danger' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '8px' }}
                    onClick={() => setPaymentType('CREDIT')}
                  >
                    آجـل (دين لمورد)
                  </button>
                </div>
              </div>

              {/* Option 2: Currency & Exchange Rate */}
              <div className="form-group">
                <label className="form-label">عملة الشراء وسعر الصرف</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className={`btn ${currency === 'IQD' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '8px' }}
                    onClick={() => setCurrency('IQD')}
                  >
                    د.ع (دينار)
                  </button>
                  <button
                    type="button"
                    className={`btn ${currency === 'USD' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '8px' }}
                    onClick={() => setCurrency('USD')}
                  >
                    $ (دولار)
                  </button>
                </div>
              </div>

              {currency === 'USD' && (
                <div className="form-group">
                  <label className="form-label" style={{ color: '#fbbf24' }}>سعر الصرف ($ مقابل د.ع)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="form-control num"
                    required
                    placeholder="1,500"
                    value={formatThousands(exchangeRate)}
                    onChange={(e) => setExchangeRate(cleanNumber(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    style={{ borderColor: 'rgba(245, 158, 11, 0.4)', color: '#fbbf24', fontWeight: 700 }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Items Table Card */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} /> جدول إدراج أدوية ومواد الفاتورة
              </h3>

              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.82rem' }} onClick={addNewRow}>
                <Plus size={14} /> إضافة مادة جديدة
              </button>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '35px' }}>#</th>
                    <th style={{ width: '125px' }}>الباركود (Barcode)</th>
                    <th style={{ width: '210px', minWidth: '180px' }}>اسم المادة التجاري</th>
                    <th style={{ width: '120px' }}>تاريخ النفاذ</th>
                    <th style={{ width: '95px' }}>وحدة الشراء</th>
                    <th style={{ width: '70px' }}>التجزئة</th>
                    <th style={{ width: '110px' }}>الكمية</th>
                    <th style={{ width: '175px' }}>التصنيف</th>
                    <th style={{ width: '145px' }}>سعر الشراء ({currency})</th>
                    <th style={{ width: '145px' }}>سعر البيع ({currency})</th>
                    <th style={{ width: '110px' }}>الربح %</th>
                    <th style={{ width: '45px' }}>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const unitsPerPackNum = parseInt(item.units_per_pack || 1, 10);
                    const bPriceNum = parseFloat(item.buy_price || 0);
                    const perUnitBuyPrice = (bPriceNum / (unitsPerPackNum || 1)).toFixed(0);

                    return (
                      <tr key={item.id}>
                        <td className="num">{idx + 1}</td>

                        {/* 1. Barcode */}
                        <td>
                          <input
                            ref={(el) => (cellRefs.current[`${idx}-barcode`] = el)}
                            type="text"
                            className="form-control num"
                            placeholder="امسح الباركود..."
                            value={item.barcode}
                            onChange={(e) => handleBarcodeChange(idx, e.target.value)}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === 'Tab') {
                                e.preventDefault();
                                focusField(idx, 'expiry_date');
                              }
                            }}
                            style={{ padding: '6px 8px', fontSize: '0.85rem' }}
                          />
                        </td>

                        {/* 2. Drug Name (Controlled width, no over-stretching) */}
                        <td>
                          <input
                            ref={(el) => (cellRefs.current[`${idx}-trade_name`] = el)}
                            type="text"
                            list="medications-trade-names-datalist"
                            className="form-control"
                            required
                            placeholder="اسم المادة التجاري..."
                            value={item.trade_name}
                            onChange={(e) => handleItemChange(idx, 'trade_name', e.target.value)}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === 'Tab') {
                                e.preventDefault();
                                focusField(idx, 'expiry_date');
                              }
                            }}
                            style={{ padding: '6px 8px', fontSize: '0.88rem', fontWeight: 700 }}
                          />
                          <datalist id="medications-trade-names-datalist">
                            {medications.map((m, i) => (
                              <option key={i} value={m.trade_name} />
                            ))}
                          </datalist>
                        </td>

                        {/* 3. Mandatory Expiry Date Picker (Flexible Year/Month Auto-Jump) */}
                        <td>
                          <ExpiryDateInput
                            value={item.expiry_date || ''}
                            onChange={(val) => handleItemChange(idx, 'expiry_date', val)}
                            onNext={() => focusField(idx, 'unit')}
                            rowIdx={idx}
                            cellRefs={cellRefs}
                          />
                        </td>

                        {/* 4. Purchase Unit Selector */}
                        <td>
                          <select
                            ref={(el) => (cellRefs.current[`${idx}-unit`] = el)}
                            className="form-control"
                            value={item.unit || 'باكيت'}
                            onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === 'Tab') {
                                e.preventDefault();
                                if (item.unit === 'باكيت') {
                                  focusField(idx, 'units_per_pack');
                                } else {
                                  focusField(idx, 'quantity');
                                }
                              }
                            }}
                            style={{ padding: '5px 6px', fontSize: '0.82rem' }}
                          >
                            <option value="باكيت">باكيت (علبة)</option>
                            <option value="شريط">شريط</option>
                            <option value="قطعة">قطعة / كبسولة</option>
                          </select>
                        </td>

                        {/* 5. Pack Quantity (Units per Pack) */}
                        <td>
                          {item.unit === 'باكيت' ? (
                            <input
                              ref={(el) => (cellRefs.current[`${idx}-units_per_pack`] = el)}
                              type="number"
                              className="form-control num"
                              required
                              min="1"
                              placeholder="1"
                              value={item.units_per_pack}
                              onChange={(e) => handleItemChange(idx, 'units_per_pack', e.target.value)}
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === 'Tab') {
                                  e.preventDefault();
                                  focusField(idx, 'quantity');
                                }
                              }}
                              title="عدد الشرايط/القطع داخل الباكيت"
                              style={{ padding: '6px 6px', fontSize: '0.85rem', textAlign: 'center', borderColor: 'rgba(16, 185, 129, 0.4)' }}
                            />
                          ) : (
                            <span className="num" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', textAlign: 'center' }}>-</span>
                          )}
                        </td>

                        {/* 6. Quantity (Expanded & Clear) */}
                        <td>
                          <input
                            ref={(el) => (cellRefs.current[`${idx}-quantity`] = el)}
                            type="number"
                            className="form-control num"
                            required
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === 'Tab') {
                                e.preventDefault();
                                // Skip Category completely -> go directly to Cost Price (buy_price)
                                focusField(idx, 'buy_price');
                              }
                            }}
                            style={{ padding: '6px 8px', fontSize: '0.9rem', fontWeight: 700, textAlign: 'center' }}
                          />
                        </td>

                        {/* 7. Category Autocomplete Combobox (Expanded) */}
                        <td>
                          <input
                            ref={(el) => (cellRefs.current[`${idx}-category`] = el)}
                            type="text"
                            list="purchase-categories-datalist"
                            className="form-control"
                            placeholder="التصنيف..."
                            value={item.category}
                            onChange={(e) => handleItemChange(idx, 'category', e.target.value)}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === 'Tab') {
                                e.preventDefault();
                                focusField(idx, 'buy_price');
                              }
                            }}
                            style={{ padding: '6px 8px', fontSize: '0.85rem' }}
                          />
                          <datalist id="purchase-categories-datalist">
                            {uniqueCategories.map((c, i) => (
                              <option key={i} value={c} />
                            ))}
                          </datalist>
                        </td>

                        {/* 8. Buy Price with live thousands separator formatting (e.g. 1,000,000) */}
                        <td>
                          <div>
                            <input
                              ref={(el) => (cellRefs.current[`${idx}-buy_price`] = el)}
                              type="text"
                              inputMode="decimal"
                              className="form-control num"
                              required
                              placeholder="0"
                              value={formatThousands(item.buy_price)}
                              onChange={(e) => {
                                const raw = cleanNumber(e.target.value);
                                handleItemChange(idx, 'buy_price', raw);
                              }}
                              onFocus={(e) => e.target.select()}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter' || e.key === 'Tab') {
                                  e.preventDefault();
                                  await triggerBuyPriceHistoryOrNext(idx, item);
                                }
                              }}
                              title="سعر الشراء (اضغط Enter للمقارنة والانتقال لسعر البيع)"
                              style={{ padding: '6px 8px', fontSize: '0.88rem', fontWeight: 700, textAlign: 'center' }}
                            />
                            {item.unit === 'باكيت' && unitsPerPackNum > 1 && bPriceNum > 0 && (
                              <span className="num" style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)', display: 'block', textAlign: 'center', marginTop: '2px' }}>
                                القطعة: {formatThousands(perUnitBuyPrice)} {currency}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 9. Sell Price with live thousands separator formatting (e.g. 1,500,000) */}
                        <td>
                          <input
                            ref={(el) => (cellRefs.current[`${idx}-sell_price`] = el)}
                            type="text"
                            inputMode="decimal"
                            className="form-control num"
                            required
                            placeholder="0"
                            value={formatThousands(item.sell_price)}
                            onChange={(e) => {
                              const raw = cleanNumber(e.target.value);
                              handleItemChange(idx, 'sell_price', raw);
                            }}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                focusNextRowBarcode(idx);
                              } else if (e.key === 'Tab' && !e.shiftKey) {
                                const now = Date.now();
                                if (now - lastTabTimeRef.current < 500) {
                                  e.preventDefault();
                                  focusNextRowBarcode(idx);
                                } else {
                                  lastTabTimeRef.current = now;
                                }
                              }
                            }}
                            style={{ padding: '6px 8px', fontSize: '0.88rem', fontWeight: 700, color: 'var(--accent-emerald)', textAlign: 'center' }}
                          />
                        </td>

                        {/* 10. Profit Margin % (Expanded & Styled) */}
                        <td>
                          <input
                            ref={(el) => (cellRefs.current[`${idx}-profit_margin`] = el)}
                            type="number"
                            className="form-control num"
                            step="0.1"
                            value={item.profit_margin}
                            onChange={(e) => handleItemChange(idx, 'profit_margin', e.target.value)}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
                                e.preventDefault();
                                focusNextRowBarcode(idx);
                              }
                            }}
                            style={{ padding: '6px 8px', fontSize: '0.88rem', fontWeight: 700, color: 'var(--accent-cyan)', textAlign: 'center' }}
                          />
                        </td>

                        {/* Action */}
                        <td>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '4px 6px', color: 'var(--accent-rose)' }}
                            onClick={() => removeItemRow(idx)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Summary & Total Net */}
          <div className="glass-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>الخصم (%) :</span>
                <input
                  type="number"
                  className="form-control num"
                  style={{ width: '100px', textAlign: 'center', padding: '6px' }}
                  min="0"
                  max="100"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                />
              </div>

              {currency === 'USD' && (
                <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                  المجموع بالدولار: <span className="num" style={{ color: '#fbbf24', fontWeight: 700 }}>${rawSubtotalCurrency.toLocaleString('en-US')}</span>
                </div>
              )}
            </div>

            {/* Action Buttons: Clear Invoice & Save */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '12px 20px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.35)', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>صافي إجمالي الفاتورة المدفوع بالدينار العراقي:</span>
                <div className="num" style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '2px' }}>
                  {formatCurrency(finalTotalNetIQD)}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => handleClearInvoice(false)}
                  style={{
                    padding: '14px 20px',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    background: 'rgba(244, 63, 94, 0.12)',
                    color: '#f87171',
                    border: '1px solid rgba(244, 63, 94, 0.35)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  title="تفريغ الفاتورة الحالية وتصفير البيانات"
                >
                  <RotateCcw size={18} /> تفريغ الفاتورة
                </button>

                <button
                  type="button"
                  className="btn btn-success"
                  style={{ padding: '14px 28px', fontSize: '1.05rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  onClick={handleSaveInvoice}
                >
                  <CheckCircle size={20} /> حفظ وتأكيد الفاتورة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: REGISTERED INVOICES HISTORY */}
      {/* ==================================================== */}
      {activeTab === 'history' && (
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '16px' }}>
            <div style={{ position: 'relative', width: '380px' }}>
              <Search size={18} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                placeholder="ابحث برقم الفاتورة، اسم المورد أو التاريخ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingRight: '42px', width: '100%' }}
              />
            </div>

            <span className="badge badge-good num">{filteredHistory.length} فواتير شراء</span>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>رقم الفاتورة</th>
                  <th>تاريخ الفاتورة</th>
                  <th>المورد التابع له</th>
                  <th>نوع الدفع</th>
                  <th>عملة الشراء</th>
                  <th>عدد المواد</th>
                  <th>إجمالي الصافي (د.ع)</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((inv, index) => (
                  <tr key={inv.id}>
                    <td className="num">{index + 1}</td>
                    <td className="num" style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{inv.invoice_number}</td>
                    <td className="num">{inv.invoice_date}</td>
                    <td style={{ fontWeight: 700 }}>{inv.supplier_name || 'غير محدد'}</td>
                    <td>
                      {inv.payment_type === 'CASH' || inv.status === 'PAID' ? (
                        <span className="badge badge-good" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.35)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle size={13} /> تم التسديد (نقدي)
                        </span>
                      ) : (
                        <span className="badge badge-alert" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#f87171', border: '1px solid rgba(244, 63, 94, 0.35)' }}>
                          آجـل (غير مسدد)
                        </span>
                      )}
                    </td>
                    <td className="num">{inv.currency === 'USD' ? `USD ($${inv.exchange_rate})` : 'IQD (د.ع)'}</td>
                    <td className="num">{inv.item_count} مواد</td>
                    <td className="num" style={{ fontWeight: 800, color: 'var(--accent-emerald)' }}>
                      {formatCurrency(inv.final_total_iqd)}
                    </td>
                    <td>
                      <button 
                        className="btn btn-primary" 
                        style={{ 
                          padding: '6px 12px', 
                          fontSize: '0.82rem', 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(59, 130, 246, 0.2))', 
                          border: '1px solid rgba(6, 182, 212, 0.4)',
                          color: '#38bdf8'
                        }} 
                        onClick={() => handleOpenPreviewModal(inv)}
                        title="معاينة الفاتورة بالتفصيل"
                      >
                        <Eye size={16} /> معاينة
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredHistory.length === 0 && (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                      لا توجد فواتير شراء مسجلة تطابق البحث
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Selected Invoice Detailed Preview Modal (معاينة الفاتورة) */}
      {previewInvoiceModal.isOpen && previewInvoiceModal.data && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setPreviewInvoiceModal({ isOpen: false, loading: false, data: null }); }}>
          <div className="modal-content" style={{ maxWidth: '850px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Modal Header */}
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Eye color="var(--accent-cyan)" size={24} />
                معاينة فاتورة شراء رقم: <span className="num" style={{ color: '#ffffff' }}>{previewInvoiceModal.data.invoice_number}</span>
              </h3>
              <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => setPreviewInvoiceModal({ isOpen: false, loading: false, data: null })}>
                <X size={20} />
              </button>
            </div>

            {/* أولاً: تفاصيل الفاتورة والمذخر (Header Info) */}
            <div 
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '14px',
                margin: '18px 0',
                padding: '16px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)'
              }}
            >
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>اسم المذخر (المورد):</span>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={16} color="var(--accent-cyan)" />
                  {previewInvoiceModal.data.supplier_name || 'غير محدد'}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>رقم الفاتورة:</span>
                <span className="num" style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Tag size={16} color="var(--accent-cyan)" />
                  {previewInvoiceModal.data.invoice_number}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>تاريخ الفاتورة:</span>
                <span className="num" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={16} color="var(--accent-cyan)" />
                  {previewInvoiceModal.data.invoice_date}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>طريقة الدفع:</span>
                <div>
                  {previewInvoiceModal.data.payment_type === 'CASH' || previewInvoiceModal.data.status === 'PAID' ? (
                    <span className="badge badge-good" style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle size={14} /> تم التسديد (نقدي)
                    </span>
                  ) : (
                    <span className="badge badge-alert" style={{ fontSize: '0.85rem', background: 'rgba(244, 63, 94, 0.15)', color: '#f87171' }}>آجـل (غير مسدد)</span>
                  )}
                </div>
              </div>

              <div style={{ gridColumn: '1 / -1', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '12px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-muted)' }}>المبلغ الإجمالي النهائي للفاتورة:</span>
                <span className="num" style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-emerald)' }}>
                  {formatCurrency(previewInvoiceModal.data.final_total_iqd || previewInvoiceModal.data.subtotal)}
                </span>
              </div>
            </div>

            {/* ثانياً: جدول المواد التابعة للفاتورة (Invoice Items Table) */}
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                <Layers size={18} color="var(--accent-cyan)" />
                مواد وعناصر الفاتورة ({previewInvoiceModal.data.items ? previewInvoiceModal.data.items.length : 0} مواد):
              </h4>

              {previewInvoiceModal.loading ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--accent-cyan)' }}>
                  <Clock className="spin" size={24} style={{ marginBottom: '8px' }} />
                  <div>جاري تحميل تفاصيل ومواد الفاتورة من قاعدة البيانات...</div>
                </div>
              ) : (
                <div className="table-container" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>اسم الدواء / المادة</th>
                        <th>الكمية المشتراة + نوع الوحدة</th>
                        <th>سعر الشراء الفردي</th>
                        <th>تاريخ انتهاء الصلاحية</th>
                        <th>الإجمالي الكلي للمادة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewInvoiceModal.data.items && previewInvoiceModal.data.items.length > 0 ? (
                        previewInvoiceModal.data.items.map((item, idx) => {
                          const itemTotal = item.total_amount !== undefined ? item.total_amount : ((item.quantity || 0) * (item.buy_price || 0));
                          return (
                            <tr key={idx}>
                              <td className="num">{idx + 1}</td>
                              <td style={{ fontWeight: 700, color: '#ffffff' }}>
                                {item.trade_name}
                                {item.barcode && <span className="num" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.barcode}</span>}
                              </td>
                              <td className="num" style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                                {item.quantity} {item.unit || 'باكيت'}
                              </td>
                              <td className="num">
                                {formatCurrency(item.buy_price)}
                              </td>
                              <td className="num" style={{ color: item.expiry_date ? '#f87171' : 'var(--text-muted)' }}>
                                {item.expiry_date || 'غير محدد'}
                              </td>
                              <td className="num" style={{ fontWeight: 800, color: 'var(--accent-emerald)' }}>
                                {formatCurrency(itemTotal)}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                            لا توجد تفاصيل مواد مسجلة لهذه الفاتورة
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
              <button 
                className="btn btn-secondary" 
                style={{ flex: 1, padding: '10px' }} 
                onClick={() => setPreviewInvoiceModal({ isOpen: false, loading: false, data: null })}
              >
                إغلاق
              </button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} 
                onClick={() => window.print()}
              >
                <Printer size={18} /> طباعة الفاتورة
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Supplier Price Comparison History Modal */}
      {priceHistoryModal.isOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={(e) => { if (e.target === e.currentTarget) closePriceHistoryModal(); }}>
          <div className="modal-content" style={{ maxWidth: '560px', border: '1px solid var(--accent-cyan)' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} />
                سجل مقارنة أسعار المذاخر لـ ({priceHistoryModal.trade_name})
              </h3>
              <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={closePriceHistoryModal}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '12px 0' }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                سعر الشراء المدخل حالياً: <span className="num" style={{ fontWeight: 800, color: '#ffffff', fontSize: '1.05rem' }}>{formatCurrency(priceHistoryModal.currentBuyPrice)}</span>
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                {priceHistoryModal.history.map((record, index) => {
                  const oldPrice = parseFloat(record.buy_price || 0);
                  const currentPrice = priceHistoryModal.currentBuyPrice;
                  const diff = currentPrice - oldPrice;
                  const diffPercent = oldPrice > 0 ? ((diff / oldPrice) * 100).toFixed(1) : 0;

                  const isHigher = diff > 0;
                  const isLower = diff < 0;

                  return (
                    <div 
                      key={index}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justify: 'space-between',
                        gap: '12px'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, color: 'var(--accent-cyan)', fontSize: '0.92rem' }}>
                          {record.supplier_name || record.company_name || 'مورد سابق'}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>تاريخ التوريد: <span className="num">{record.invoice_date || 'غير محدد'}</span></span>
                          {record.unit && <span>(الوحدة: {record.unit})</span>}
                        </div>
                      </div>

                      <div style={{ textAlign: 'left' }}>
                        <div className="num" style={{ fontSize: '0.98rem', fontWeight: 800, color: '#ffffff' }}>
                          {formatCurrency(oldPrice)}
                        </div>

                        {/* Price Variance Badge */}
                        <div style={{ marginTop: '2px' }}>
                          {isHigher && (
                            <span className="badge badge-alert num" style={{ fontSize: '0.72rem', background: 'rgba(244, 63, 94, 0.15)', color: '#f87171' }}>
                              🔺 ارتفاع (+{formatCurrency(diff)} / +{diffPercent}%)
                            </span>
                          )}
                          {isLower && (
                            <span className="badge badge-good num" style={{ fontSize: '0.72rem' }}>
                              🔻 انخفاض ({formatCurrency(diff)} / {diffPercent}%)
                            </span>
                          )}
                          {!isHigher && !isLower && (
                            <span className="badge num" style={{ fontSize: '0.72rem', background: 'rgba(255, 255, 255, 0.1)' }}>
                              ➡️ نفس السعر القديم
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
              <button 
                ref={priceHistoryCloseBtnRef}
                className="btn btn-primary" 
                style={{ padding: '8px 24px', fontWeight: 700 }} 
                onClick={closePriceHistoryModal}
              >
                موافق (Enter ↵)
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
